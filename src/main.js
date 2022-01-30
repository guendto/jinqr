#!/usr/bin/env node
/*
 * -*- coding: utf-8 -*-
 *
 * jinqr
 *
 * Copyright
 *  2021 Toni Gündoğdu
 *
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The main module of `jinqr`.
 * @module
 */
import prettyBytes from "pretty-bytes";

/* eslint-disable import/extensions */
import Options from "./options.js";
import Jomiel from "./jomiel.js";
import { httpSetupGlobalProxy, httpDownloadStream } from "./http.js";
import processInput from "./input.js";
import selectStream from "./stream.js";
import { initLogger, getLogger } from "./log.js";
import {
  printConfigPaths,
  printConfig,
  printDownload,
  printError,
  printSpinners,
  printStreams,
} from "./printer.js";

/**
 * the program main entry point.
 */
// eslint-disable-next-line consistent-return
(async () => {
  const { opts, name } = Options().parse();

  if (opts.printConfig) {
    return printConfig(opts);
  }

  if (opts.printConfigPaths) {
    return printConfigPaths(name);
  }

  if (opts.printSpinners) {
    return printSpinners();
  }

  initLogger(opts);

  const logger = getLogger();
  logger.trace(opts);

  let inputURIs;
  try {
    inputURIs = await processInput({ nargs: opts._ });
    if (inputURIs.length === 0) {
      logger.error("input URI not given");
      process.exit(1);
    }
  } catch (error) {
    printError(error);
  }

  httpSetupGlobalProxy();
  const jomiel = Jomiel(opts);

  // See input.js for "airbnb-style note".
  // eslint-disable-next-line no-restricted-syntax
  for await (const uri of inputURIs) {
    const response = await jomiel.inquire(uri);
    logger.trace(response);

    if (opts.printStreams) {
      printStreams(uri, response);
    } else {
      const stream = await selectStream(opts, response);
      logger.trace("selected", stream);
      if (opts.skipDownload) {
        printDownload(stream);
      } else {
        try {
          await httpDownloadStream({ opts, selectedStream: stream });
        } catch (error) {
          printError(error);
        }
      }
    }
  }
})();

process.on("exit", (code) => {
  const logger = getLogger();
  const heapUsed = prettyBytes(process.memoryUsage().heapUsed, {
    bits: true,
  });
  return logger.debug(
    `exit with ${code}, memory used (heap): ${heapUsed}`
  );
});
