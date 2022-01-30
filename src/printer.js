/*
 * -*- coding: utf-8 -*-
 *
 * jinqr
 *
 * Copyright
 *  2021-2022 Toni Gündoğdu
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
import cliTruncate from "cli-truncate";
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
  const table = new Table({ title: "Configuration file paths" });
  xdgConfigPaths(name).forEach((path) =>
    table.addRow({ path }, { color: "blue" })
  );
  table.printTable();
};

/**
 * Print the parsed configuration values.
 *
 * @arg {object} options - the `jinqr` configuration options
 *
 * @func
 */
export const printConfig = (options) => {
  const filtered = {};

  Object.entries(options).forEach(([key, value]) => {
    if (key === "_" || key.length > 2) {
      // eslint-disable-next-line no-param-reassign
      key = key === "_" ? "uri" : camelCase(key);
      filtered[key] = value;
    }
  });

  const table = new Table({
    columns: [
      { name: "Name", alignment: "left", color: "blue" },
      { name: "Value", alignment: "left", color: "cyan" },
    ],
  });

  Object.entries(filtered).forEach(([key, value]) => {
    table.addRow({
      Name: key,
      Value: value,
    });
  });

  table.printTable();
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
 * @arg {string} inputUri - the input URI
 *
 * @func
 */
export const printStreams = (inputUri, response) => {
  const color = "cyan";

  const table = new Table({
    title: inputUri,
    columns: [
      { name: "Profile", color: "blue" },
      { name: "Container", color },
      { name: "Codecs", color },
      { name: "Bitrate", color },
      { name: "Length", color },
    ],
  });

  response.media.stream.forEach((stream) => {
    const { contentLength, quality, mimeType } = stream;
    const { profile: Profile, bitrate } = quality;

    const length = prettyBytes(contentLength.toNumber());

    table.addRow({
      Profile,
      Container: mimeTypes.extension(mimeType),
      Codecs: (mimeType.match(/"(.*)"/) || ["?", "?"])[1],
      Bitrate: prettyBytes(bitrate, { bits: true }),
      Length: length === "0 B" ? "(detect)" : length,
    });
  });

  table.printTable();
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
export const skipDownloadPrintOnly = (selectedStream) => {
  const { saveTo, contentLength } = selectedStream;

  let dest = saveTo?.fullPath ?? "(stream to stdout)";

  dest = cliTruncate(dest, 60, {
    preferTruncationOnSpace: true,
    position: "middle",
  });

  const len = prettyBytes(contentLength.toNumber());
  const logger = getLogger();

  logger.info(`${pico.blue("skip")} download, show details only`);
  logger.info(`  ${pico.dim("destination")}: ${pico.cyan(dest)}`);
  logger.info(`  ${pico.dim("length")}: ${len}`);
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
