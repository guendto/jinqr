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
 * The jomiel module of `jinqr`.
 * @module
 */
import jomielMessages from "jomiel-messages";
import slugify from "@sindresorhus/slugify";
import humanizeUri from "humanize-url";
import chalk from "chalk";
import ora from "ora";

import { Request } from "zeromq";

const { Inquiry, Response, StatusCode } =
  jomielMessages.jomiel.protobuf.v1beta1;

import { getLogger } from "./log.js";
import { printError } from "./printer.js";

/**
 * The class used to communicate with `jomiel`.
 */
export class Jomiel {
  /** @private **/
  #spinner;
  /** @private **/
  #logger;
  /** @private **/
  #opts;
  /** @private **/
  #sck;

  /**
   * Create a new instance.
   *
   * @arg {object} options - the `jinqr` configuration options
   */
  constructor(options) {
    this.#logger = getLogger();
    this.#opts = options;
  }

  /**
   * Inquire media properties from 'jomiel` for the given URI.
   *
   * @arg {string} uri - the URI to inquire from `jomiel`
   *
   * @returns {object} the `jomiel` response
   */
  async inquire(uri) {
    try {
      this.#connect();
      await this.#sendInquiry(uri);
      return await this.#receiveResponse();
    } catch (error) {
      this.#spinner?.stop();
      error.message = `<jomiel> ${error.message}`;
      printError(error);
    }
  }

  // private

  /**
   * Connect to router endpoint of `jomiel`.
   *
   * @private
   */
  #connect() {
    const re = this.#opts.routerEndpoint;
    const to = this.#opts.connectTimeout;
    this.#logger.debug(
      `<jomiel> connect to endpoint at ${chalk.cyan(
        re
      )} (timeout=${to})`
    );
    this.#sck = new Request({ receiveTimeout: to * 1000, linger: 0 });
    this.#sck.connect(re);
  }

  /**
   * Send a new inquiry to 'jomiel`.
   *
   * @arg {string} uri - the URI to inquire
   *
   * @private
   */
  async #sendInquiry(uri) {
    const humanUri = humanizeUri(uri);
    this.#logger.debug(`<jomiel> inquire ${chalk.cyan(humanUri)}`);

    const msg = Inquiry.create({ media: { inputUri: uri } });
    this.#logger.trace("sendInquiry: msg:", msg);

    const bytes = Inquiry.encode(msg).finish();
    this.#logger.trace("sendInquiry: bytes:", bytes);

    await this.#sck.send(bytes);
  }

  /**
   * Receive a response from `jomiel`.
   *
   * @returns {object} the `jomiel` response message.
   *
   * @private
   */
  async #receiveResponse() {
    this.#spinner = ora({
      text: "<jomiel> awaiting for a response...",
      isSilent: this.#opts.verbosityLevel === "off",
      spinner: this.#opts.spinnerType,
    }).start();

    const [bytes] = await this.#sck.receive();
    this.#spinner.stop();
    this.#logger.trace("receiveResponse: bytes:", bytes);

    const msg = Response.decode(bytes);
    this.#logger.trace("receiveResponse: msg:", msg);

    if (msg.status.code == StatusCode.STATUS_CODE_OK) {
      return this.#slugifyProfiles(msg);
    }
    throw new Error(msg.status.message);
  }

  /**
   * "Slugify" media the stream profiles for easier use with cli.
   *
   * @arg {object} response - the `jomiel` response
   *
   * @returns {object} the `jomiel` response message.
   *
   * @private
   */
  #slugifyProfiles(response) {
    let result = [];
    for (const stream of response.media.stream) {
      stream.quality.profile = slugify(stream.quality.profile);
      result.push(stream);
    }
    response.media.stream = result;
    return response;
  }
}

// factory function for Jomiel.
export default (options) => new Jomiel(options);
