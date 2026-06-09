# Prettier comment-placement harness

fncli builds its help text from comments written **inside** a function's
parameter list, attaching each comment to a parameter by source position (see
[`../../parseSignature.js`](../../parseSignature.js)). Prettier reflows
signatures and can move those comments, which silently changes the generated
help text.

This harness makes the damage visible.

## Run

```
node examples/prettier/harness.js [file.js ...]
```

With no arguments it processes `../js/*.js` and `./cases/*.js`.

For each input it writes, into the gitignored `gen/` directory:

| file | contents |
|------|----------|
| `<name>.orig.js` | verbatim copy of the input |
| `<name>.prettier.js` | the same file after `prettier` |
| `<name>.orig.help.txt` | `node <name>.orig.js --help` output |
| `<name>.prettier.help.txt` | `node <name>.prettier.js --help` output |

It then prints the cases whose help text changed, with a ready-to-paste `diff`
command for each.

## Trying prettier options

Drop a `.prettierrc` in this directory and re-run; prettier auto-discovers it
relative to the files it formats in `gen/`. This is the place to test whether
any option (or `// prettier-ignore`) preserves fncli's comment placement.

`cases/` holds small hand-written signatures that stress the comment patterns
fncli depends on. Add more `.js` files there (each must call `fncli`) to cover
new patterns.
