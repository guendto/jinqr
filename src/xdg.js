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
 * The xdg module of `jinqr`.
 * @module
 */
import { homedir } from "os";
import { join } from "path";

/**
 * Return the path to the config home dir.
 *
 * "XDG_CONFIG_HOME [env.var.] defines the base directory relative to
 * which user-specific configuration files should be stored. If
 * $XDG_CONFIG_HOME is either not set or empty, a default equal to
 * $HOME/.config should be used."
 *
 * @returns {string} the path to the config home dir
 *
 * @see {@link https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html|XDG Base Directory Specification}
 *
 * @func
 */
export const xdgConfigHome = () =>
  process.env.XDG_CONFIG_HOME || join(homedir(), ".config");

/**
 * Return the the paths to the config dirs.
 *
 * "XDG_CONFIG_DIRS [env.var.] defines the preference-ordered set of
 * base directories to search for configuration files in addition to the
 * $XDG_CONFIG_HOME base directory. The directories in $XDG_CONFIG_DIRS
 * should be seperated with a colon ':'."
 *
 * "If [it] is either not set or empty, a value equal to /etc/xdg
 * should be used."
 *
 * Note the "in addition to the XDG_CONFIG_HOME base directory".
 *
 * @returns {(string|Array)} XDG config directories
 *
 * @see {@link https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html|XDG Base Directory Specification}
 *
 * @func
 */
export const xdgConfigDirs = () => {
  const result = process.env.XDG_CONFIG_DIRS || "/etc/xdg";
  return result.split(/:/) || [];
};

/**
 * Return paths to the configuration files in the XDG search paths.
 *
 * @arg {string} name - the program name, e.g. "jinqr"
 *
 * @arg {object} [options]
 *
 * @arg {object} options.configFiles={"config.yaml","config.json"} -
 * the file names to append to the configuration paths
 *
 * @arg {boolean} options.includeCWD=true - include current working dir
 * (CWD) to the paths. Note that CWD is not not part of the XDG base
 * directory specification
 *
 * @returns {(string|Array)} file paths
 *
 * @see {@link https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html|XDG Base Directory Specification}
 *
 * @func
 */
export const xdgConfigPaths = (
  name,
  {
    configFiles = ["config.yaml", "config.json"],
    includeCWD = true,
  } = {}
) => {
  const result = [];

  // See input.js for "for...of airbnb-style note".

  // eslint-disable-next-line no-restricted-syntax
  for (const dir of xdgConfigDirs()) {
    // eslint-disable-next-line no-restricted-syntax
    for (const configFile of configFiles) {
      result.push(join(dir, name, configFile));
    }
  }

  const configHome = xdgConfigHome();

  // eslint-disable-next-line no-restricted-syntax
  for (const configFile of configFiles) {
    result.push(join(configHome, name, configFile));
  }

  if (includeCWD) {
    // eslint-disable-next-line no-restricted-syntax
    for (const configFile of configFiles) {
      result.push(`./${configFile}`);
    }
  }

  return result;
};
