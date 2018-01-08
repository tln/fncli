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

TODOS:

- script name
- better parsing of signatures(newlines kill it)
- short flag names, aliases
- doc comments
- auto-number?
- rest parameters
- usage handling in main
