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
import humanizeUrl from "humanize-url";
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
export const printConfig = (options) => {
  let result = {};
  Object.entries(options).forEach(([key, value]) => {
    if (key === "_" || key.length > 2) {
      // eslint-disable-next-line no-param-reassign
      key = key === "_" ? "uri" : camelCase(key);
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
  console.log(
    "Streams with '0 B' in length, will have it determined at download"
  );
};

/**
 * Print the details of the stream to be downloaded.
 *
 * @arg {object} options - the `jinqr` configuration options
 * @arg {object} selectedStreama - the selected stream
 * @arg {object} httpRange - the http range to download
 *
 * @func
 */
export const printDownloadDetails = (options, stream, httpRange) => {
  const logger = getLogger();

  const printBytes = () => {
    const bytes = {
      total: stream.contentLength.toNumber(),
      startAt: 0,
      endAt: stream.contentLength.toNumber(),
    };

    if (httpRange) {
      const [begin, end] = httpRange.split("-");
      bytes.startAt = Number(begin) || 0;
      bytes.endAt = Number(end) || bytes.total;
      bytes.total = bytes.endAt - bytes.startAt;
    }

    const prettyBytesOpts = {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    };

    bytes.pretty = {
      startAt: prettyBytes(bytes.startAt, prettyBytesOpts),
      endAt: prettyBytes(bytes.endAt, prettyBytesOpts),
      total: prettyBytes(bytes.total, prettyBytesOpts),
    };

    const startStr = `start at: ${bytes.pretty.startAt}, `;
    const endStr = `end at: ${bytes.pretty.endAt}, `;
    const totalStr = `total: ${bytes.pretty.total}`;

    logger.info(`  ${startStr} ${endStr} ${totalStr}`);
  };

  const actionVerb =
    options.outputTemplate === "-" ? "streaming" : "extracting";

  logger.info(`${actionVerb} the stream`);
  logger.info(`  from: ${humanizeUrl(stream.inputUri)}`);

  // Streaming from the source.
  if (options.outputTemplate === "-") {
    return printBytes();
  }

  // Downloading to a file.
  const { dirPath, fileName } = stream.saveTo;
  logger.info(`  path: ${dirPath}`);
  logger.info(`    to: ${fileName}`);
  return printBytes();
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
