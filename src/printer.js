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

/* eslint-disable no-console */

/**
 * The printer module of `jinqr`.
 * @module
 */
import { Table } from "console-table-printer";
import { dump as dumpYAML } from "js-yaml";

import camelCase from "camelcase";
import cliSpinners from "cli-spinners";
import mimeTypes from "mime-types";
import prettyBytes from "pretty-bytes";

/* eslint-disable import/extensions */
import { getLogger } from "./log.js";
import { xdgConfigPaths } from "./xdg.js";

/**
 * Print the configuration file paths.
 *
 * @arg {string} name - the program name
 *
 * @func
 */
export const printConfigPaths = (name) => {
  const paths = xdgConfigPaths(name);
  const result = dumpYAML(paths);
  process.stdout.write(`---\n${result}`);
};

/**
 * Print the parsed configuration values.
 *
 * @arg {object} options - the `jinqr` configuration options
 *
 * @func
 */
export const printConfig = (opts) => {
  let result = {};
  Object.entries(opts).forEach(([key, value]) => {
    if (key.length > 2) {
      // eslint-disable-next-line no-param-reassign
      key = camelCase(key);
      result[key] = value;
    }
  });
  result = dumpYAML(result);
  process.stdout.write(`---\n${result}`);
};

/**
 * Print the available spinner names.
 *
 * @func
 */
export const printSpinners = () => {
  // See input.js for "airbnb-style note".
  // eslint-disable-next-line no-restricted-syntax
  for (const name of Object.keys(cliSpinners)) {
    const { frames } = cliSpinners[name];
    if (frames) {
      console.log(`'${name}'`);
      console.dir(frames);
    }
  }
};

/**
 * Print the available streams for the inquiried URI.
 *
 * @arg {object} response - the response returned by `jomiel`
 *
 * @func
 */
export const printStreams = (response) => {
  const table = new Table();
  // See input.js for "airbnb-style note".
  // eslint-disable-next-line no-restricted-syntax
  for (const stream of response.media.stream) {
    table.addRow({
      profile: stream.quality.profile,
      container: mimeTypes.extension(stream.mimeType),
      codecs: (stream.mimeType.match(/"(.*)"/) || ["?", "?"])[1],
      bitrate: prettyBytes(stream.quality.bitrate, { bits: true }),
      length: prettyBytes(stream.contentLength.toNumber()),
    });
  }
  table.printTable();
};

/**
 * Print the download details.
 *
 * @arg {object} selectedStream - the selected stream to download
 *
 * @func
 */
export const printDownload = (selectedStream) => {
  const table = new Table({
    columns: [
      { name: "destination", maxLen: 60 },
      { name: "length", minLen: 16 },
    ],
  });
  table.addRow({
    destination:
      selectedStream.saveTo?.fullPath ?? "(stream to stdout)",
    length: prettyBytes(selectedStream.contentLength.toNumber()),
  });
  table.printTable();
};

/**
 * Print the error (exception) and exit with 1. If the stack is present
 * and logger has debug level enabled, dump the stack along with the
 * message.
 *
 * @arg {object} error - the error to print
 *
 * @func
 */
export const printError = (error) => {
  const logger = getLogger();
  logger.error(
    logger.isDebugEnabled()
      ? error.stack || String(error)
      : String(error)
  );
  process.exit(1);
};
