# jinqr(1) - The simple jomiel client for downloading media streams

## Synopsis

`jinqr [options] [URI...]`

## Description

jinqr is a simple, command-line jomiel client for downloading media
streams from video-sharing websites. It is a spiritual successor to
cclive.

## Options

jinqr defaults to read input from the standard input (stdin). A hash
(`#`) can be used for comments in the input data. See also `Examples`.

### -h, --help

Show the help and exit.

### -v, --version

Show the version number and exit.

### -P, --print-config-paths

Show the supported configuration file paths and exit. jinqr will look up
configuration files from these locations at start.

### -D, --print-config

Show the configuration values and exit.

### -N, --print-spinners

Show the available spinner names and exit.

### -S, --print-streams

Show the available streams for the URI and exit.

### --config-file PATH

Load the configuration from the specification location.

### Network

#### -r, --router-endpoint STRING

Jomiel router endpoint address. The default is `tcp://localhost:5514`.

#### -t, --connect-timeout NUMBER

Time allowed connection to jomiel to take. The default is `30`.

#### --http-range STRING

Byte range to download, e.g. 12345-67890.

#### --http-user-agent STRING

Identify as STRING to HTTP server.

#### --http-connect-timeout NUMBER

Time in seconds allowed for connection to HTTP servers to take. The
default is `30`.

### Output

#### -p, --logger-pattern STRING

Specify the logger pattern format to use. The default is `%r %[%p%] -
%m`. See also `Logger Pattern`.

#### -o, --output-template STRING

Output filename template to use. The default is `{title}
({identifier}).{container}`. When the value is set to `-` the media
being downloaded will be written to the standard output. See also
`Output Template`.

#### -W, --overwrite-file

Overwrite the existing files.

#### -d, --print-download-details

Show the details before the download begins.

#### --progressbar-eta-buffer NUMBER

Number of updates used to calculate the ETA. The default is `128`.

#### --progressbar-format STRING

Customize progress bar layout. The default is `| {bar} {percentage}% ||
{received}/{expected} | {eta_formatted} | {rate}/s`. See also
`Progressbar Format`.

#### --progressbar-fps NUMBER

Maximum progressbar update rate. The default is `5`.

#### --progressbar-size NUMBER

Length of the progress bar in characters. The default is `25`.

#### --progressbar-type STRING

Progressbar type to use. Supported values: `legacy`, `shades_classic`,
`shades_grey` and `rect`. The default is `rect`.

#### -n, --skip-download

Skip download, show details only.

#### -T, --spinner-type STRING

Spinner type to use. See also `--print-spinners`. The default is `dots`.

#### -s, --stream STRING

Stream profile to download. See also `--print-streams`. jinqr defaults
to the first available stream. To choose a stream, use "|" (or):

```shell
jinqr -s 'foo|bar' URI
```

jinqr would download the stream with the profile name "foo" OR "bar".

#### -l, --verbosity-level STRING

Define verbosity level. Supported values: `all`, `trace`, `debug`,
`info`, `warn`, `error`, `fatal`, `mark` and `off`. The default is
`info`.

## Configuration

See also `Environment variables`.

### When you prefer JSON configuration over YAML

jinqr understands both formats. See
https://github.com/guendto/jinqr/tree/master/examples/config.

### Merged configuration values

The values are read from different sources in the following order (each
step will replace the existing values):

- default values (if any), set by the command line parser
- values read from the configuration files
- values given as the command line args

## Logger pattern (--logger-pattern STRING)

See the `Log4JS` documentation for `Pattern` at
https://log4js-node.github.io/log4js-node/layouts.html#pattern.

## Progressbar format (--progressbar-format STRING)

The first three supported `placeholders` are unique to `jinqr`. For the
rest, see the `cli-progress` documentation for `Formatting` at
https://github.com/npkgz/cli-progress#bar-formatting.

- `rate` -- transfer rate/s
- `expected` -- expected length
- `received` -- amount transferred so far
- `bar` -- progress bar
- `percentage` -- current progress in percent (0-100)
- `total` -- end value
- `value` -- current value set by last update() call
- `eta` -- expected time of accomplishment in seconds
- `duration` -- elapsed time in seconds
- `eta_formatted` -- expected time of accomplishment (formatted)
- `duration_formatted` -- elapsed time formatted into appropriate

Example:

```shell
jinqr --progressbar-format "{bar} | {percentage} | {rate}/s" URI
```

## Output template (--output-template STRING)

Supported placeholders.

- `author.channelId` -- channel ID
- `author.name` -- author name
- `identifier` -- video identifier
- `container` -- video container
- `title` -- video title
- `quality.profile` -- the video quality profile
- `quality.height` -- video quality height
- `quality.width` -- video quality width
- `date.iso8601` -- download date in the ISO8601 format
- `date.locale` -- download date based on the locale setting

When `output-template` is set to `-` the media being downloaded will be
written to the standard output.

When the output path does not exist, jinqr will try to create it.

Example:

```shell
jinqr -o ~/Downloads/{author.name}/{title}.{container} URI
```

## Examples

Save the media stream to a file.

```shell
jinqr URI
```

Stream the media being downloaded to stdout.

```shell
jinqr -o - URI | mpv -
```

Read input with comments (useful when working with URI batches):

```shell
cat URIs
# This is a comment line and ignored.
https://foo
https://bar  # also ignored.
https://baz
https://foo  # a duplicate.
https://foo  # another duplicate, both will be ignored by jinqr.
```

And consume it:

```shell
jinqr < URIs
```

## Environment variables

### XDG configuration paths

The XDG configuration paths can be defined by the following environment
variables. See also the complete `XDG Base Directory Specification` at
https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html.

`XDG_CONFIG_DIRS`

- `$XDG_CONFIG_DIRS` defines the preference-ordered set of base
  directories to search for configuration files in addition to the
  `$XDG_CONFIG_HOME` base directory. The directories in
  `$XDG_CONFIG_DIRS` should be seperated with a colon `:`.

- If `$XDG_CONFIG_DIRS` is either not set or empty, a value equal to
  /etc/xdg should be used.

`XDG_CONFIG_HOME`

- `$XDG_CONFIG_HOME` defines the base directory relative to which
  user-specific configuration files should be stored. If
  `$XDG_CONFIG_HOME` is either not set or empty, a default equal to
  `$HOME/.config` should be used.

Example:

```shell
XDG_CONFIG_HOME=/tmp/config jinqr --print-config-paths
```

### HTTP Proxy

See the `global-agent` documentation for `Environment variables` at
https://github.com/gajus/global-agent#environment-variables.

## Files

### Configuration file

See the output of `--print-config-paths`.

## Acknowledgements

- jinqr will try to inquire the missing values (e.g. content-length,
  content-type) from the HTTP server with an HTTP HEAD request.

- jinqr supports downloading HTTP streams only.

- To negate a flag, prepend `--no-` to it. e.g.
  `jinqr --no-print-download-details URI`

## See also

- GitHub repository: https://github.com/guendto/jomiel
- cclive: https://github.com/guendto/cclive

## License

jinqr is licensed under the Apache License version 2.0.
