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
 * The HTTP module of `jinqr`.
 * @module
 */
import { Bar, Presets } from "cli-progress";
import { bootstrap as setupGlobalAgent } from "global-agent";
import { createWriteStream } from "fs";
import { stat } from "fs/promises";
import { pipeline } from "stream";
import { promisify } from "util";

import chalk from "chalk";
import convertHrtime from "convert-hrtime";
import got from "got";
import ora from "ora";
import prettyBytes from "pretty-bytes";
import prettyMs from "pretty-ms";
import protobuf from "protobufjs";
import uaString from "ua-string";
import TransferRate from "simple-eta";

import { getLogger } from "./log.js";

/**
 * Set HTTP/S proxy agent using env. variables. See
 * <https://git.io/JGXuj> for documentation.
 * @func
 */
export const httpSetupGlobalProxy = () => {
  setupGlobalAgent();
  getLogger().debug("global http proxy settings initialized");
};

/**
 * Construct HTTP options (headers) to be used with `got` for making new
 * HTTP requests.
 *
 * @arg {object} opts - the `jinqr` configuration options
 * @arg {object} [options]
 * @arg {string} options.httpRange=null - HTTP range, e.g. "12345-"
 *
 * @returns {object} the HTTP request headers
 */
const getHttpOptions = (opts, { httpRange = null } = {}) => {
  // Construct the HTTP options.
  const result = {
    headers: {
      "user-agent": opts.httpUserAgent || uaString,
    },
    timeout: {
      connect: opts.httpConnectTimeout * 1000,
    },
    followRedirect: true,
  };
  // Add HTTP range to the request, if it was given.
  if (httpRange) {
    result.headers.range = `bytes=${httpRange}`;
    getLogger().debug(
      `resume - send HTTP range request (${result.headers.range})`
    );
  }
  return result;
};

/**
 * Send an HTTP HEAD request to the HTTP server. `content-type` and
 * `content-length` from the returned HTTP response. These values are
 * stored into the `selectedStream` object.
 *
 * @arg {object} options
 * @arg {object} options.opts the `jinqr` configuration options
 * @arg {object} options.selectedStream the media stream to download
 *
 * @func
 */
export const httpSendHead = async ({ opts, selectedStream }) => {
  const logger = getLogger();
  logger.debug("send HTTP HEAD request");

  // Create the HTTP options.
  const httpOptions = getHttpOptions(opts);
  logger.trace("httpOptions", httpOptions);

  // Create the spinner.
  const spinner = ora({
    text: "awaiting for an http head response...",
    isSilent: opts.verbosityLevel === "off",
    spinner: opts.spinnerType,
  }).start();

  // Send the HTTP HEAD request.
  const result = await got.head(selectedStream.uri, httpOptions);
  spinner.stop();
  logger.trace("result.headers", result.headers);

  // Try to retrieve the content-{type,length} from the response.
  const contentLength = Number(result.headers["content-length"]);
  const { Long } = protobuf.util;

  // eslint-disable-next-line no-param-reassign
  selectedStream.contentLength = Long.fromNumber(contentLength);
  // eslint-disable-next-line no-param-reassign
  selectedStream.mimeType = result.headers["content-type"];
};

/**
 * Save (or stream) the selected stream to a file (or stdout).
 *
 * @arg {object} options
 * @arg {object} options.opts - the `jinqr` configuration options
 * @arg {object} options.selectedStream - the media stream to download
 *
 * @func
 */
export const httpDownloadStream = async ({ opts, selectedStream }) => {
  const contentLength = selectedStream.contentLength.toNumber();
  const logger = getLogger();

  if (logger.isDebugEnabled()) {
    logger.debug(
      "output (saveTo)",
      selectedStream.saveTo ?? "(stream to stdout)"
    );
    logger.trace("contentLength", contentLength);
  }

  /**
   * Determine HTTP range to be used with the HTTP GET request.
   *
   * @arg {object} opts - the `jinqr` configuration options
   * @arg {object} selectedStream - the media stream to download
   *
   * @returns {object} result
   * @returns {string} result.httpRange - the HTTP range (e.g. "12345-")
   * @returns {boolean} result.downloadedAlready - whether the stream
   *  has been downloaded already
   *
   * @func determineHttpRange
   */
  const determineHttpRange = async () => {
    // "-" is for writing to the stdout, no reason to go any further.
    if (opts.outputTemplate === "-") {
      return { httpRange: opts.httpRange };
    }

    // Determine the existing file size, if any.
    let fileSize = 0;
    try {
      fileSize = (await stat(selectedStream.saveTo.fullPath)).size;
    } catch (error) {
      if (error.errno !== -2 && error.code !== "ENOENT") {
        throw error;
      }
      // Ignore the "ENOENT: no such file or directory" quietly.
      //  => Do not send HTTP range request (start from 0 bytes).
    }
    logger.trace("fileSize", fileSize);

    if (!opts.httpRange) {
      if (fileSize === 0 || opts.overwriteFile) return {};
      if (fileSize === contentLength) {
        return { alreadyDownloaded: true };
      }
    }

    // User-defined HTTP range value or request the remaining bytes.
    return { httpRange: opts.httpRange || `${fileSize}-` };
  };

  // Determine HTTP range. Whether to resume/overwrite/skip transfer.
  const { httpRange, alreadyDownloaded } = await determineHttpRange();
  logger.trace("httpRange", httpRange);
  logger.trace("alreadyDownloaded", alreadyDownloaded);

  if (alreadyDownloaded) {
    return logger.info("the stream has been downloaded already");
  }

  const data = {
    timeUpdated: process.hrtime.bigint(),
    timeStarted: process.hrtime.bigint(),
    lastTransferred: 0,
    opts: {
      bytes: {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      },
      http: getHttpOptions(opts, { httpRange }),
    },
    bar: new Bar(
      {
        barsize: opts.progressbarSize,
        etaBuffer: opts.progressbarEtaBuffer,
        format: opts.progressbarFormat,
        fps: opts.progressbarFps,
        hideCursor: true,
      },
      Presets[opts.progressbarType] ?? Presets.rect
    ),
  };

  logger.trace("data.opts.http", data.opts.http);

  /**
   * Calculate the current transfer rate.
   *
   * @returns {string} the current (humanized) transfer rate
   *
   * @fund getTransferRate
   */
  const getTransferRate = (transferred) => {
    data.eta.report(transferred);
    return prettyBytes(data.eta.rate(), { bits: true });
  };

  // Create a stream for reading from the specified URI.
  const readStream = got.stream(selectedStream.uri, data.opts.http);
  readStream
    // While we download.
    .on("downloadProgress", ({ transferred, total }) => {
      // Skip, if logging is off.
      if (opts.verbosityLevel === "off" || !total) {
        return;
      }

      // Stop the spinner. Start the progressbar.
      if (data.spinner.isSpinning) {
        data.spinner.stop();
        // Start the progressbar.
        data.bar.start(total, 0, {
          received: 0,
          expected: 0,
          rate: 0,
        });
        // Start ETA.
        data.eta = new TransferRate({
          min: 0,
          max: total,
          autostart: true,
        });
      }

      // Update progress bar, if enough time has passed.
      data.bar.update(transferred, {
        rate: getTransferRate(transferred),
        received: prettyBytes(transferred, data.opts.bytes),
        expected: prettyBytes(total, data.opts.bytes),
      });

      // Store for later use.
      data.timeUpdated = process.hrtime.bigint();
      data.lastTransferred = transferred;
    })
    // While we upload.
    .on("uploadProgress", ({ transrerred, total, percent }) => {
      percent = Math.round(percent * 100);
      data.spinner.text = `${chalk.cyan("upload")}: ${percent}%`;
    })
    // When we send the request.
    .on("request", (request) => {
      if (logger.isDebugEnabled()) {
        logger.trace("request", request);
      }
    })
    // When we receive a response.
    .on("response", (response) => {
      if (logger.isDebugEnabled()) {
        logger.trace("response", response.headers);
      }
    });

  /**
   * Determine write stream.
   *
   * @returns {object} the write stream
   *
   * @func determineWriteStream
   */
  const determineWriteStream = () => {
    if (opts.outputTemplate === "-") {
      return process.stdout;
    }
    const streamOptions = {
      flags: httpRange && !opts.overwriteFile ? "a+" : "w",
    };
    logger.trace("streamOptions", streamOptions);
    return createWriteStream(
      selectedStream.saveTo.fullPath,
      streamOptions
    );
  };

  // Create a spinner.
  data.spinner = ora({
    isSilent: opts.verbosityLevel === "off",
    spinner: opts.spinnerType,
  }).start();

  // Begin the transfer.
  // - Read from the source stream
  // - Write to the destination stream
  try {
    const writeStream = determineWriteStream();
    await promisify(pipeline)(readStream, writeStream);
  } finally {
    data.bar.stop();
    const elapsed = convertHrtime(
      process.hrtime.bigint() - data.timeStarted
    );
    logger.debug(`total time: ${prettyMs(elapsed.milliseconds)}`);
  }
  return logger.info("download complete");
};
