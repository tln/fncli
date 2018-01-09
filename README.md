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

## Future work

- short flag names, aliases
- rest parameters
- auto-number?
- usage handling in main
