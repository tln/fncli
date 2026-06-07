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

With `tsc`, `target: "ES2017"` or higher and don't enable `removeComments`. Or keep `main.js` as plain JavaScript and import core libraries from your compiled `src/**.ts`. fncli only needs to read the signature you pass it; the body can call anything.

## Reference

| JavaScript                            | CLI behavior                           |
|---------------------------------------|----------------------------------------|
| `name`                                | required positional arg                |
| `name = "x"`                          | optional positional with default       |
| `...names`                            | rest positional (zero or more)         |
|                                       |                                        |
| `{flag = false}`                      | `--flag` boolean flag                  |
| `{opt = "x"}`                         | `--opt=<value>` with default           |
| `{f: flag = false}`                   | `-f` / `--flag` (short alias)          |
|                                       |                                        |
| object of functions passed to `fncli` | sub-commands (function names)          |
| nested objects                        | nested sub-commands                    |
|                                       |                                        |
| `// comment` before first param       | command synopsis                       |
| `// comment` after a param            | per-arg/option description             |
| `return "error: ..."`                 | prints usage + error                   |
| `throw "error: ..."`                  | prints usage + error                   |
| `async function`                      | awaited before exit                    |
|                                       |                                        |
| `--` in argv                          | stops option parsing                   |
| `-h` / `--help`                       | added by defult                        |

## Tips

Pass options as a second argument: `fncli(commands, { argv: process.argv, help: true })`.

Validate inside your handler. Return a string starting with `"error: "` and fncli prints it followed by the usage:

```javascript
function main(...files) {
  if (files.length === 0) return "error: pass one or more files";
}
```

`throw "error: ..."` works the same way. Other throws are re-raised; no usage is printed.

For commands with sub-commands, a nice pattern is to keep `main.js` as a thin entry point that imports handlers from elsewhere and assembles them in the `fncli(...)` call.

Every function form is supported: named `function name(){}`, anonymous `function(){}`, arrow `() => {}`, `async`, and object-method shorthand `{name(){}}`.

Put comments **inside** the function's parens. `Function.toString()` drops anything before the `function` keyword, so a leading `// doc` won't be seen.

## License

MIT
