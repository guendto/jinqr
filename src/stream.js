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
 * The stream module of `jinqr`.
 * @module
 */
import { normalize, join, dirname, basename } from "path";
import { extension as extensionFrom } from "mime-types";
import { mkdir } from "fs/promises";

import filenamify from "filenamify";
import untildify from "untildify";
import pupa from "pupa";

/* eslint-disable import/extensions */
import { httpSendHead } from "./http.js";
import { getLogger } from "./log.js";

/**
 * Select the stream from the `jomiel` response message. Format and
 * inquire any additional data, e.g. missing content-length/type, full
 * path to the saved file, etc.
 *
 * @arg {object} opts - the `jinqr` configuration options
 * @arg {object} response - the `jomiel` response
 *
 * @returns {object} the selected stream from the `jomiel` response
 * @func
 */
const selectStream = async (opts, response) => {
  // Use the first available stream as the "default" stream.
  let result = response.media.stream[0];

  // Select the stream based on the --stream value.
  if (opts.stream) {
    result = response.media.stream.find(
      (x) => x.quality.profile === opts.stream
    );
  }

  const logger = getLogger();

  // Make sure we have a stream.
  if (!result || result.length === 0) {
    logger.error(`nothing matched profile "${opts.stream}"`);
    logger.error("re-run with --print-streams for profiles");
    process.exit(1);
  }

  // Send HTTP HEAD to retrieve the missing content-{type,length}.
  if (!result.mimeType || result.contentLength.toNumber() == 0) {
    await httpSendHead({ opts, selectedStream: result });
    logger.trace(result);
  }

  /**
   * Determine the path to the saved file.
   *
   * @arg {object} opts - the `jinqr` configuration options
   * @arg {object} response - the `jomiel` response
   * @arg {object} selectedStream - the selected stream
   *
   * @func determineFilePath
   */
  const determineFilePath = async (opts, response, selectedStream) => {
    /**
     * Return the placeholder data.
     *
     * @arg {object} response - the `jomiel` response
     * @arg {object} selectedStream - the selected stream
     *
     * @returns {object} containing the placeholder data
     *
     * @func initPlaceholderData
     */
    const initPlaceholderData = (response, selectedStream) => {
      const now = new Date();
      const msg = response.media;

      /**
       * Return the date in different formats.
       *
       * @returns {object} the different formats
       *
       * @func getDate
       */
      const getDate = () => {
        return {
          locale: now.toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          iso8601: now.toISOString().split("T")[0],
        };
      };

      selectedStream.placeholder = {
        container: extensionFrom(selectedStream.mimeType),
        quality: selectedStream.quality,
        identifier: msg.identifier,
        author: msg.author,
        date: getDate(),
        title: msg.title,
      };
    };

    // Apply placeholder replacements separately, otherwise filenamify
    // will remove the '~' and the '/' from the path.
    initPlaceholderData(response, selectedStream);

    // Path (if any).
    const dirName = dirname(opts.outputTemplate);
    const normalizedPath = normalize(dirName);
    const expandedPath = untildify(normalizedPath);
    const dirPath = pupa(expandedPath, selectedStream.placeholder);

    if (!opts.skipDownload) {
      await mkdir(dirPath, { recursive: true });
    }

    // Name.
    const baseName = basename(opts.outputTemplate);
    const appliedName = pupa(baseName, selectedStream.placeholder);
    const namifyOpts = { replacement: "", maxLength: 255 };
    const fileName = filenamify(appliedName, namifyOpts);

    // Rejoin the reformatted file name with the expanded dir path.
    selectedStream.saveTo = {
      fullPath: join(dirPath, fileName),
      fileName,
      dirPath,
    };
  };

  // Determine full path to the destination file.
  // - output-template "-" is reserved for stdout
  // - skip this step if "-" is specified
  if (opts.outputTemplate !== "-") {
    await determineFilePath(opts, response, result);
  }

  return result;
};

export default selectStream;
