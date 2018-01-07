# funcli -- small, fun cli framework

```
require('funcli')(
  // Pass a main function. Parameters become arguments or options
  function main(name, {greeting="Hello", shout=false}) {

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

TODOS:

- script name
- better parsing of signatures(newlines kill it)
- short flag names, aliases
- doc comments
- auto-number?
- rest parameters
- usage handling in main
