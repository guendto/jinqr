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
 * The options module of `jinqr`.
 * @module
 */
import { createRequire } from "module";
import { Presets } from "cli-progress";
import { readFileSync, existsSync } from "fs";
import { load as loadYAML } from "js-yaml";

import log4js from "log4js";
import yargs from "yargs";

// eslint-disable-next-line import/extensions
import { xdgConfigPaths } from "./xdg.js";

// "Update rules to support ES2022 class fields" (=> v8.0)
// - <https://github.com/eslint/eslint/issues/14857>

/**
 * The class used to parse the command line args.
 */
class Options {
  /** @static {string} */
  static #GROUP_NETWORK = "Network:";

  /** @static {string} */
  static #GROUP_OUTPUT = "Output:";

  /** @private {object} */
  #package;

  /**
   * Create a new instance.
   */
  constructor() {
    this.#readPackageJSON();
  }

  /**
   * Parse and return the command line options.
   *
   * @returns {object} the `jinqr` configuration options
   */
  parse() {
    const configData = this.#xdgReadConfigFiles();
    const argv = process.argv.slice(2);

    const opts = yargs(argv)
      .scriptName(this.#package.name)
      .usage("Usage: $0 [options] [URI...]")
      .help("help")
      .version(this.#package.version)
      .alias("help", "h")
      .alias("version", "v")
      .options({
        ...this.#generalGroup(),
        ...this.#networkGroup(),
        ...this.#outputGroup(),
      })
      // See <https://git.io/JGPol> for "strict"
      .strictOptions()
      // See <https://git.io/JGPou> for ".config([key], [desc], [fn])"
      .config("config-file", "Load config from file", (path) =>
        this.#readConfigFile(path)
      )
      .config(configData).argv;

    return { opts, name: this.#package.name };
  }

  // private

  /**
   * Read the {name, version} from the package.json file.
   *
   * @private
   */
  #readPackageJSON() {
    const require = createRequire(import.meta.url);
    const pkgPath = require.resolve("../package.json");
    const { name, version } = loadYAML(readFileSync(pkgPath));
    this.#package = { name, version };
  }

  /**
   * Read the configuration files from the XDG base directories.
   *
   * @returns {object} the configuration data
   *
   * @private
   */
  #xdgReadConfigFiles() {
    const result = {};
    const configPaths = xdgConfigPaths(this.#package.name);
    // See input.js for "airbnb-style note".
    // eslint-disable-next-line no-restricted-syntax
    for (const path of configPaths) {
      if (existsSync(path)) {
        Object.assign(result, this.#readConfigFile(path));
      }
    }
    return result;
  }

  /**
   * Try to read the configuration file.
   *
   * @arg {string} path to the file
   *
   * @returns {object} the configuration data
   *
   * @private
   */
  #readConfigFile = (path) => loadYAML(readFileSync(path)) || {};

  /**
   * Return the general group of options.
   *
   * @returns {object} the output group
   *
   * @private
   */
  // eslint-disable-next-line class-methods-use-this
  #generalGroup() {
    return {
      "print-config-paths": {
        alias: "P",
        desc: "Show configuration file paths and exit",
        type: "boolean",
      },
      "print-config": {
        alias: "D",
        desc: "Show configuration and exit",
        type: "boolean",
      },
      "print-spinners": {
        alias: "N",
        desc: "Show available spinner names and exit",
        type: "boolean",
      },
      "print-streams": {
        alias: "S",
        desc: "Show available streams and exit",
        type: "boolean",
      },
    };
  }

  /**
   * Return the output group of options.
   *
   * @returns {object} the output group
   *
   * @private
   */
  // eslint-disable-next-line class-methods-use-this
  #outputGroup() {
    return {
      "logger-pattern": {
        alias: "p",
        group: Options.#GROUP_OUTPUT,
        desc: "Specify the logger pattern format to use",
        default: "%r %[%p%] - %m",
        type: "string",
      },
      "output-template": {
        alias: "o",
        group: Options.#GROUP_OUTPUT,
        desc: "Output filename template to use",
        default: "{title} ({identifier}).{container}",
        type: "string",
      },
      "overwrite-file": {
        alias: "W",
        group: Options.#GROUP_OUTPUT,
        desc: "Overwrite existing files",
        type: "boolean",
      },
      "progressbar-eta-buffer": {
        group: Options.#GROUP_OUTPUT,
        desc: "Number of updates used to calculate the ETA",
        default: 128,
        type: "number",
      },
      "progressbar-format": {
        group: Options.#GROUP_OUTPUT,
        desc: "Customize progress bar layout",
        default:
          "| {bar} {percentage}% || {received}/{expected} | {eta_formatted} | {rate}/s",
        type: "string",
      },
      "progressbar-fps": {
        group: Options.#GROUP_OUTPUT,
        desc: "Maximum update rate",
        default: 5,
        type: "number",
      },
      "progressbar-size": {
        group: Options.#GROUP_OUTPUT,
        desc: "Length of the progress bar in chars",
        default: 25,
        type: "number",
      },
      "progressbar-type": {
        group: Options.#GROUP_OUTPUT,
        desc: "Progressbar type to use",
        choices: Object.keys(Presets),
        default: "rect",
        type: "string",
      },
      "skip-download": {
        alias: "n",
        group: Options.#GROUP_OUTPUT,
        desc: "Skip download, show details only",
        type: "boolean",
      },
      "spinner-type": {
        alias: "T",
        group: Options.#GROUP_OUTPUT,
        desc: "Spinner type to use, see also --print-Spinners",
        default: "dots",
        type: "string",
      },
      stream: {
        alias: "s",
        group: Options.#GROUP_OUTPUT,
        desc: "Stream profile to download, see --print-streams also",
        type: "string",
      },
      "verbosity-level": {
        alias: "l",
        group: Options.#GROUP_OUTPUT,
        desc: "Define verbosity level",
        // See <https://git.io/JG74B> for levels
        choices: Object.keys(log4js.levels)
          .filter((level) => level !== "levels")
          .map((level) => level.toLowerCase()),
        default: "info",
        type: "string",
      },
    };
  }

  /**
   * Return the network group of options.
   *
   * @returns {object} the network group
   *
   * @private
   */
  // eslint-disable-next-line class-methods-use-this
  #networkGroup() {
    return {
      "router-endpoint": {
        alias: "r",
        group: Options.#GROUP_NETWORK,
        desc: "Jomiel router endpoint address",
        default: "tcp://localhost:5514",
        type: "string",
      },
      "connect-timeout": {
        alias: "t",
        group: Options.#GROUP_NETWORK,
        desc: "Time allowed connection to jomiel to take",
        default: 30,
        type: "number",
      },
      "http-range": {
        group: Options.#GROUP_NETWORK,
        desc: "Byte range to download, e.g. 12345-67890",
        type: "string",
      },
      "http-user-agent": {
        group: Options.#GROUP_NETWORK,
        desc: "Identify as <string> to HTTP server",
        type: "string",
      },
      "http-connect-timeout": {
        group: Options.#GROUP_NETWORK,
        desc: "Time allowed connection to HTTP servers to take",
        default: 30,
        type: "number",
      },
    };
  }
}

// factory function for Options.
export default () => new Options();
