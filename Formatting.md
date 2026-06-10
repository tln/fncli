# Help & Usage Formatting

How fncli renders usage text (`usage.js`). See `examples/js/help-stress.js`
for a runnable sample of every case below.

## Two modes

| | Terse | Full |
|---|---|---|
| Triggered by | any usage error | `--help` |
| Stream / exit | stderr, exit 2 | stdout, exit 0 |
| Long text | snipped with a bold `[...]` | shown completely, word-wrapped¹ |
| `--help` | hidden; listed under each command whose entry was snipped | hidden — the output is already complete |

That's it — there is no third mode. What looks like a "subcommand mode" is an
orthogonal axis, the **target**: when a command path was navigated (`cli sub`,
`--help sub`), the body describes that command instead of the root — its
synopsis, args, options, and (for a group) its own sub-commands. Both modes
apply to any target.

¹ Full mode applies to the target's *own* sections. The commands listing under
a group is always rendered terse — a long per-command docstring belongs to
`cli <command> --help`, and any trimmed command lists `--help` among its own
options.

## Layout

```
error: <message>                          (terse mode only)
usage: prog [path] <args> <inline options>

  <synopsis>

args:
  <label>    <description>
options:
  <label>    <description>
commands:                                 (only when the target has commands)

  <path> <args> <inline options>
    <synopsis>

    <label>    <description>
```

- **Usage line**: positional args, then options inline as `[--flag|-f]`
  `[--opt=<value>]`. If the inline options run longer than
  `MAX_INLINE_OPTIONS_WIDTH`, they collapse to `[options]` and *every* option
  is listed in the detail rows, with or without a description.
- **Detail rows** (`args:`/`options:`/per-command): one-line descriptions
  align in a column 4 spaces past the longest label not exceeding
  `MAX_LABEL_WIDTH`. A longer label, or a description spanning multiple lines
  (wrapped or multi-line source), takes the other layout: label on its own
  line, description lines below it indented 4. Such rows don't widen the
  column for the rest.
- **Commands list**: groups recurse so every leaf is listed with its full
  path (`remote add`, not `remote command`).
- Names render in kebab-case; colors: commands cyan, args green, options
  yellow, labels/`[...]` bold.

## Terse-mode trimming

- Trims cut at the edge of the window, on a word boundary. The width is
  measured on the stream being written to (stdout for help, stderr for
  errors): `$COLUMNS` if set, else the TTY width; when the output is not a
  TTY (piped/redirected), `DEFAULT_WINDOW_WIDTH` (80).
- Width trim (one line too long): the line ends with a bold ` [...]` at the
  window edge.
- Line trim (lines dropped — a multi-line arg/option description reduced to
  its first line, or a command synopsis cut at `MAX_SYNOPSIS_LINES`): the
  bold `[...]` goes on its own next line.
- If a command's entry in the listing was snipped with `[...]` and help is
  enabled, `--help    Display more help` is listed among that command's own
  options. Unsnipped commands don't get it — an `[options]` collapse alone
  doesn't count, since every option is still listed below. Snips in the
  target's own sections likewise add a `--help` row to its `options:`.

## Full-mode text

Docstrings are dedented (the common indent of the lines after the first is
removed). Lines at column 0 are prose, word-wrapped at `MAX_SYNOPSIS_WIDTH`;
lines still indented after dedenting are preformatted — kept verbatim with
their relative indent and surrounding blank lines (eg a YAML example in a
docstring).

## Group synopsis

A commands object has no function signature to take a comment from, so a
string-valued `synopsis` key describes the group itself, at any level:

```js
fncli({
  synopsis: 'Tool for doing things.',
  sub: {synopsis: 'A nested group.', add(x) {}},
  status() {},
});
```

## Tuning constants (top of `usage.js`)

| Constant | Default | Meaning |
|---|---|---|
| `MAX_LABEL_WIDTH` | 26 | widest label that joins the aligned column |
| `VALUE_PLACEHOLDER` | `<value>` | shown for an option's argument |
| `MAX_INLINE_OPTIONS_WIDTH` | 40 | inline options wider than this collapse to `[options]` |
| `MAX_SYNOPSIS_WIDTH` | 72 | word-wrap width for full-mode prose |
| `MAX_SYNOPSIS_LINES` | 3 | command-synopsis line cap (terse) |
| `DEFAULT_WINDOW_WIDTH` | 80 | trim edge when output is not a TTY (no `$COLUMNS`) |
