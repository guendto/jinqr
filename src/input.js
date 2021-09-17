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
 * The input module of `jinqr`.
 * @module
 */
import { createInterface } from "readline";
import { URL } from "url";

/**
 * Return valid URIs read from either the array of args (nargs) or the
 * standard input (stdin). Defaults to reading from the stdin.
 *
 * When reading from the stdin, a hash ('#') can be used for comments.
 * For example:
 *
 * ```
 * # This is a comment line and ignored.
 * https://foo
 * https://bar  # also ignored.
 * https://baz
 * ```
 *
 * @arg {object} [options]
 *
 * @arg {Array} options.nargs=undefined - the so called "leftover args"
 * typically returned by command-line arg parsers after parsing the CLI
 * options. If none is given (or the array is empty), then read, process
 * and store the input from the stdin, instead.
 *
 * @arg {boolean} options.httpOnly=true - raise an error when true and
 * URI schema is anything else but "http/s".
 *
 * @arg {boolean} options.rebuildURI=true - if true, rebuilds each item
 * from the URI components. Useful when you want to "cleanup" the URI.
 * e.g.: schema "HtTPs" -> "https".
 *
 * @arg {boolean} options.returnAsObjects=false - if true, the result
 * array will contain URI objects instead of strings. Ignores the
 * `rebuildURI` value.
 *
 * @arg {boolean} options.returnUniqueItems=true - if true, the result
 * array will only hold unique values.
 *
 * @returns {(string|Array)} an array of qualified URIs
 *
 * @func
 */
const processInput = async ({
  nargs = undefined,
  httpOnly = true,
  rebuildURI = true,
  returnAsObjects = false,
  returnUniqueItems = true,
} = {}) => {
  let result = [];

  /**
   * Process and validate the given value as a valid URI. Push the item
   * into the `result` array if it qualifies.
   *
   * @arg {string} value - item to validate
   *
   * @func addItem
   */
  const addItem = (value) => {
    if (!value || value.length === 0) {
      return;
    }
    try {
      const uri = new URL(value);
      if (httpOnly) {
        if (!uri.protocol.startsWith("http")) {
          throw new Error(
            `${uri.protocol} unsupported protocol (${uri})`
          );
        }
      }
      if (rebuildURI) {
        // eslint-disable-next-line no-param-reassign
        value = uri.toString();
      }
      if (returnAsObjects) {
        // eslint-disable-next-line no-param-reassign
        value = uri;
      }
    } catch (error) {
      if (error.constructor === TypeError) {
        throw new Error(`${error.message}: ${error.input}`);
      }
      throw error;
    }
    result.push(value);
  };

  rebuildURI = returnAsObjects ? false : rebuildURI || false;

  if (nargs && nargs.length > 0) {
    for (const narg of nargs) {
      addItem(narg);
    }
  } else {
    const stdin = createInterface({ input: process.stdin });
    for await (let line of stdin) {
      line = line.split("#", 1)[0].trim();
      addItem(line);
    }
  }

  if (returnUniqueItems) {
    result = [...new Set(result)];
  }
  return result;
};

export default processInput;
