# jinqr

[![npm-package](https://img.shields.io/npm/v/jinqr?color=%230a66dc)][npm]
[![code-style](https://img.shields.io/badge/code%20style-prettier+eslint-%230a66dc)][prettier-eslint]

[prettier-eslint]: http://npm.im/prettier-eslint
[npm]: https://npm.im/jinqr

The simple [jomiel] client for downloading media streams.

`jinqr` is a spiritual successor to (now defunct) [cclive].

[jomiel]: https://github.com/guendto/jomiel
[cclive]: https://github.com/guendto/cclive

![demo: jinqr](./images/jinqr-demo.svg)

## Features

- **Highly configurable**. Supports YAML and JSON configuration. [XDG
  Base Directory Specification] aware.

- **Pipable**. Supports streaming the media being downloaded to the
  [standard output](#examples).

- **Proxy-aware**. Configurable using [environment
  variables](#http-proxy) (HTTP/HTTPS)

- **Client**. Communicates with [jomiel] and media hosting websites.

- **Flexible**. Most output features can be customized.

- **Simplistic**. Small and simple.

## Installation

```shell
npm install -g jinqr
```

## Usage

```text
Usage: jinqr [options] [URI...]

Network:
  -r, --router-endpoint       Jomiel router endpoint address
                                      [string] [default: "tcp://localhost:5514"]
  -t, --connect-timeout       Time allowed connection to jomiel to take
                                                          [number] [default: 30]
      --http-range            Byte range to download, e.g. 12345-67890  [string]
      --http-user-agent       Identify as <string> to HTTP server       [string]
      --http-connect-timeout  Time allowed connection to HTTP servers to take
                                                          [number] [default: 30]

Output:
  -p, --logger-pattern          Specify the logger pattern format to use
                                            [string] [default: "%r %[%p%] - %m"]
  -o, --output-template         Output filename template to use
                        [string] [default: "{title} ({identifier}).{container}"]
  -W, --overwrite-file          Overwrite existing files               [boolean]
  -d, --print-download-details  Show details of the download
                                                       [boolean] [default: true]
      --progressbar-eta-buffer  Number of updates used to calculate the ETA
                                                         [number] [default: 128]
      --progressbar-format      Customize progress bar layout
  [string] [default: "| {bar} {percentage}% || {received}/{expected} | {eta_form
                                                             atted} | {rate}/s"]
      --progressbar-fps         Maximum update rate        [number] [default: 5]
      --progressbar-size        Length of the progress bar in chars
                                                          [number] [default: 25]
      --progressbar-type        Progressbar type to use
  [string] [choices: "legacy", "shades_classic", "shades_grey", "rect"] [default
                                                                       : "rect"]
  -n, --skip-download           Skip download, show details only       [boolean]
  -T, --spinner-type            Spinner type to use, see also --print-Spinners
                                                      [string] [default: "dots"]
  -s, --stream                  Stream profile to download, see --print-streams
                                also                                    [string]
  -l, --verbosity-level         Define verbosity level
   [string] [choices: "all", "trace", "debug", "info", "warn", "error", "fatal",
                                                "mark", "off"] [default: "info"]

Options:
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
  -P, --print-config-paths  Show configuration file paths and exit     [boolean]
  -D, --print-config        Show configuration and exit                [boolean]
  -N, --print-spinners      Show available spinner names and exit      [boolean]
  -S, --print-streams       Show available streams and exit            [boolean]
      --config-file         Load config from file
```

### Examples

Save the media stream to a file.

```shell
jinqr URI
```

Stream the media being downloaded to stdout.

```shell
jinqr -o - URI | mplayer -
```

## Tips and notes

### Defaults to reading from standard input (stdin)

When reading from the stdin, a hash ('#') can be used for comments.

#### Example

```shell
cat > URIs
# This is a comment line and ignored.
https://foo
https://bar  # also ignored.
https://baz
https://foo  # a duplicate.
https://foo  # another duplicate, both will be ignored by jinqr.
```

Consume it with `jinqr`.

```shell
jinqr < URIs
```

### When the streams have no content-length or content-type

`jinqr` will try to inquire the missing values from the HTTP server with
an HTTP HEAD request.

### Using "or" ("|") with --stream

Download either stream with the profile name "foo" OR "bar":

```shell
jinqr -s 'foo|bar' URI
```

### Negatable flags

To negate a flag, prepend `--no-` to it.

```shell
jinqr `--no-skip-download` URI
```

### Configuration

#### When you prefer JSON configuration over YAML

`jinqr` understands both formats. See [examples/config](https://github.com/guendto/jinqr/tree/master/examples/config)

#### Merged configuration values

The values are read from different sources in the following order (each
step will replace the existing values):

- default values (if any), set by the command line parser
- values read from the configuration files
- values given as the command line args

#### Define the XDG paths

The XDG configuration paths can be defined by the following environment
variables. See also the complete [XDG Base Directory
Specification].

[xdg base directory specification]: https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html

##### XDG_CONFIG_DIRS

- $XDG_CONFIG_DIRS defines the preference-ordered set of base
  directories to search for configuration files in addition to the
  $XDG_CONFIG_HOME base directory. The directories in $XDG_CONFIG_DIRS
  should be seperated with a colon `:`.

- If $XDG_CONFIG_DIRS is either not set or empty, a value equal to
  /etc/xdg should be used.

##### XDG_CONFIG_HOME

- $XDG_CONFIG_HOME defines the base directory relative to which
  user-specific configuration files should be stored. If
  $XDG_CONFIG_HOME is either not set or empty, a default equal to
  $HOME/.config should be used.

##### Examples

```shell
XDG_CONFIG_HOME=/tmp/config jinqr --print-config-paths
```

### progressbar-format

| Placeholder          |  description                                |
| -------------------- | ------------------------------------------- |
| `rate`               | transfer rate/s                             |
| `expected`           | expected length                             |
| `received`           | amount transferred so far                   |
| `bar`                | progress bar                                |
| `percentage`         | current progress in percent (0-100)         |
| `total`              | end value                                   |
| `value`              | current value set by last update() call     |
| `eta`                | expected time of accomplishment in seconds  |
| `duration`           | elapsed time in seconds                     |
| `eta_formatted`      | expected time of accomplishment (formatted) |
| `duration_formatted` | elapsed time formatted into appropriate     |

The first three are unique to `jinqr`. Refer to the documentation of
`cli-progress` for the most recent list of the
[placeholders](https://github.com/npkgz/cli-progress#bar-formatting) it
supports.

#### Example

```shell
jinqr --progressbar-format "{bar} | {percentage} | {rate}/s" URI
```

### output-template

| Placeholder        |  description                              |
| ------------------ | ----------------------------------------- |
| `author.channelId` | channel ID                                |
| `author.name`      | author name                               |
| `identifier`       | video identifier                          |
| `container`        | video container                           |
| `title`            | video title                               |
| `quality.profile`  | the video quality profile                 |
| `quality.height`   | video quality height                      |
| `quality.width`    | video quality width                       |
| `date.iso8601`     | download date in the ISO8601 format       |
| `date.locale`      | download date based on the locale setting |

#### Example

```shell
jinqr -o ~/Downloads/{author.name}/{title}.{container} URI
```

#### Standard output

When `output-template` is set to `-` the media being downloaded will be
written to the standard output.

#### Output path is missing

When the output path does not exist, `jinqr` will try to create it.

### HTTP proxy

Refer to the documentation of `global-agent` for the [environment
variables](https://github.com/gajus/global-agent#environment-variables).

## License

`jinqr` is licensed under the [Apache License version 2.0][aplv2].

[aplv2]: https://www.tldrlegal.com/l/apache2

## Acknowledgements

`jinqr` supports downloading HTTP streams only.
