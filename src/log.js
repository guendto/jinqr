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
 * The log module of `jinqr`.
 * @module
 */
import log4js from "log4js";

/**
 * Initializes the logger.
 *
 * @arg {object} opts - the `jinqr` configuration options
 *
 * @func
 */
export const initLogger = (opts) => {
  log4js.configure({
    appenders: {
      console: {
        type: "stderr",
        layout: {
          type: "pattern",
          pattern: opts.loggerPattern,
        },
      },
    },
    categories: {
      default: { appenders: ["console"], level: opts.verbosityLevel },
    },
  });
  getLogger().debug(
    `logger initialized (level="${opts.verbosityLevel}")`
  );
};

/**
 * Returns the logger instance.
 *
 * @returns {object} the logger instance
 *
 * @func
 */
export const getLogger = () => log4js.getLogger("jinqr");
