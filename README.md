# fncli -- cli framework using function signatures

```
require('fncli')(
  // Pass a main function. Parameters become arguments or options
  function (name, {greeting="Hello", shout=false}) {

  }
);
```
This would result in the following interface:

```
usage: script [options] name
options:
  --greeting=<value>
  --shout
```

## Sub-command style

```
require('fncli')({
  // Pass an object with functions. Function names become
  // subcommands.
  hello(name, {greeting="Hello", shout=false}) {

  },
  goodbye({shout=false}) {

  }
});
```

## Aliases, short options

Single-letter options become short options. Aliases use ES6 syntax for assigning to new variable names.

In this example, the `-s` option and `--shout` are aliases.

```
require('fncli')(
  function (// Description of command
    name, // Description of name
    {
      greeting="Hello", // Description of greeting
      s: shout=false
    }) {
      // Use `shout` in here
  }
);
```

## Repeating parameters

Rest parameters allow zero or more arguments to be passed.

```
require('fncli')(
  function (
    ...names,
    ) {

  }
);
```

## Including descriptions

Descriptions of commands, arguments and options can be accomplished using comments.

```
require('fncli')(
  function (// Description of command
    name, // Description of name
    {
      greeting="Hello", // Description of greeting
      shout=false
    }) {

  }
);
```
This would result in the following interface:

```
error: Missing required argument
usage: script [options] name

Description of command

args:
  name    Description of name

options:
  --greeting=<value>   Description of greeting
  --shout=<value>
```

## Usage errors

Throwing "error:" messages will show usage and the error.

```
require('fncli')(
  function (
    ...names, // At least one
    ) {
    if (names.length < 1) {
      throw "error: pass at least one name";
    }
  }
);
```

## Config argument

The `fncli` function accepts an object as an optional second parameter, with:

- `argv` to process that instead of `process.argv`.
- `help: true` to add a `--help` option that prints the usage.

NB: `help` is likely to default to true in the future.

## Argument handing

An argument of -- is skipped, and following arguments are not treated as options.

Until -- is seen, options are allowed after arguments. Eg, passing `foo bar -x` will set an `x` option to `true`, or be an error if there is no `-x` option.

