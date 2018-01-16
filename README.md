# funcli -- small, fun cli framework

```
require('funcli')(
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
require('funcli')({
  // Pass an object with functions. Function names become
  // subcommands.
  hello(name, {greeting="Hello", shout=false}) {

  },
  goodbye({shout=false}) {

  }
});
```

## Including descriptions

Descriptions of commands, arguments and options can be accomplished using comments.

```
require('funcli')(
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

## Aliases, short options

Single-letter options become short options. Aliases use ES6 syntax for assigning to new variable names.
In this example, the `-s` option and `--shout` are aliases.

```
require('funcli')(
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
require('funcli')(
  function (
    ...names,
    ) {

  }
);
```


## Future work

- auto-number?
- usage handling in main
