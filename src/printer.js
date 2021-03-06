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

import camelCase from "camelcase";
import cliSpinners from "cli-spinners";
import cliTruncate from "cli-truncate";
import humanizeUrl from "humanize-url";
import mimeTypes from "mime-types";
import prettyBytes from "pretty-bytes";
import pico from "picocolors";

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
  Object.keys(cliSpinners).forEach((name) => {
    const { frames } = cliSpinners[name];
    if (frames) {
      console.log(`'${name}'`);
      console.log(frames);
    }
  });
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
  const { contentLength, inputUri, saveTo } = stream;
  const logger = getLogger();

  const printBytes = () => {
    const bytes = {
      total: contentLength.toNumber(),
      startAt: 0,
      endAt: contentLength.toNumber(),
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

    const startStr = `${pico.dim("start at")}: ${
      bytes.pretty.startAt
    }, `;

    const endStr = `${pico.dim("end at")}: ${bytes.pretty.endAt}, `;
    const totalStr = `${pico.dim("total")}: ${bytes.pretty.total}`;

    logger.info(`  ${startStr} ${endStr} ${totalStr}`);
  };

  const { outputTemplate } = options;

  const action =
    outputTemplate === "-"
      ? "streaming to stdout" // colors won't be available while streaming
      : `${pico.blue("copying")} the stream`;

  logger.info(action);
  logger.info(`  ${pico.dim("from")}: ${humanizeUrl(inputUri)}`);

  // Streaming from the source.
  if (outputTemplate === "-") {
    return printBytes();
  }

  // Downloading to a file.
  const { dirPath, fileName } = saveTo;

  logger.info(`  ${pico.dim("path")}: ${dirPath}`);
  logger.info(`    ${pico.dim("to")}: ${pico.cyan(fileName)}`);

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
