# fncli

**fncli** turns your `main()` into a CLI and `argv` into a function call.

## Introduction

```javascript
// 1. write function
function main(name, {greeting="Hello", shout=false}){}

// 2. call fncli
fncli(main)
```
```
usage: script [options] name
options:
  --greeting=<value>
  --shout
```

Function parameters become CLI arguments and options; defaults make them optional. **fncli** parses the CLI arguments, calls your function, and awaits the result.

```javascript
// Multiple functions become sub-commands
function clone(  // Clone the repo
  url  // Repository URL
){}
function push({f: force=false}, upstream="origin"){}
function add({A: all=false}, ...files){}

// Call fncli with object
fncli({
  clone, 
  push, 
  add, 
})
```
```
usage: script command

commands:
  clone        Clone the repo
  push
  add
```

Pass objects to make sub-commands. Nested objects make sub-sub-commands (and so on).
Comments become help text. Rest syntax `...args` becomes rest parameters.

## Install

```
npm install fncli
```

Use either `import` or `require`.

## Reference

| JavaScript | CLI behavior |
|---|---|
| `name` | required positional arg |
| `name = "x"` | optional positional with default |
| `...names` | rest positional (zero or more) |
| `{flag = false}` | `--flag` boolean flag |
| `{opt = "x"}` | `--opt=<value>` with default |
| `{f: flag = false}` | `-f` / `--flag` (short alias) |
| object of functions passed to `fncli` | sub-commands (function names) |
| nested objects | nested sub-commands |
| `// comment` before first param | command synopsis |
| `// comment` after a param | per-arg/option description |
| `throw "error: ..."` | prints usage + error |
| `async function` | awaited before exit |
| `--` in argv | stops option parsing |
| `-h` / `--help` | added automatically |

## License

MIT
