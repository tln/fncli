const {basename} = require('path');
const pc = require('picocolors');

// Labels longer than this don't widen the aligned description column; the
// description drops to its own line below the label instead.
const MAX_LABEL_WIDTH = 26;
// Placeholder shown for an option's argument, eg --format=<value>.
const VALUE_PLACEHOLDER = '<value>';
// Inline options on a usage/command line longer than this collapse to
// [options], with every option listed below instead.
const MAX_INLINE_OPTIONS_WIDTH = 40;
// Full-mode prose is word-wrapped to this width. (Terse-mode trims cut at
// the window edge instead — see windowWidth.)
const MAX_SYNOPSIS_WIDTH = 72;
// Command synopses are snipped to this many lines.
const MAX_SYNOPSIS_LINES = 3;
// Window width when the output stream is not a TTY (piped/redirected) and
// COLUMNS is not set.
const DEFAULT_WINDOW_WIDTH = 80;

// Width of the stream this usage text will be written to: COLUMNS overrides,
// a TTY reports its width, anything else (a pipe, a file) gets the default.
function windowWidth(stream) {
  const cols = parseInt(process.env.COLUMNS, 10);
  if (cols) return cols;
  return (stream.isTTY && stream.columns) || DEFAULT_WINDOW_WIDTH;
}

const theme = {
  error: text => pc.bold(pc.red(text)),
  label: text => pc.bold(text),
  command: text => pc.cyan(text),
  option: text => pc.yellow(text),
  argument: text => pc.green(text),
  more: text => pc.bold(text),
};

module.exports = function usage({optDesc, error, command, commandPath, isHelp}) {
  let {arg0} = optDesc;
  console.assert(arg0);
  let s = '';

  // Rendering context: `snipped` records that some text was cut (so we
  // advertise the normally-hidden --help), `collapsed` that inline options
  // were folded into [options] (so every option is listed below). `full` is
  // the explicit-help mode: nothing is snipped — long text wraps instead.
  // Since full output is already complete, --help is not listed there.
  const helpEnabled = !!optDesc.options.help;
  // Help goes to stdout, errors to stderr (see index.js) — measure the
  // stream the text will actually be written to.
  const width = windowWidth(isHelp ? process.stdout : process.stderr);
  const ctx = {snipped: false, collapsed: false, full: !!isHelp, helpEnabled, width};

  // When a command path was navigated, the body describes that command (its
  // synopsis, args, options, and — for a group — its own sub-commands), not
  // the top-level descriptor. arg0 only lives on the top-level optDesc.
  const target = command ? command.optDesc : optDesc;

  if (error && error !== true && !isHelp) {
    if (!error.startsWith('error:')) {
      s += theme.error('error:') + ' ' + pc.red(error);
    } else {
      s += theme.error('error:') + ' ' + pc.red(error.slice(7));
    }
    s += '\n';
  }

  s += theme.label('usage:') + ' ' + formatUsageLine(arg0, target, command, commandPath, ctx);
  s += '\n\n';

  let synopsisSection = '';
  if (target.synopsis) {
    for (const line of snipSynopsisLines(target.synopsis, ctx, 2)) {
      synopsisSection += ('  ' + line).trimEnd() + '\n';
    }
    synopsisSection += '\n';
  }

  const positionalSynopsis = formatDetailRows(target.positional, {}, '  ', {ctx});

  let commandsSection = '';
  if (target.commands) {
    // The commands listing is always rendered terse — even under --help, a
    // long per-command docstring belongs to `cmd <command> --help`, not the
    // listing. Each command tracks its own trims and advertises --help in
    // its detail rows; the listing does not affect the target's ctx.
    const listCtx = {snipped: false, collapsed: false, full: false, helpEnabled, width};
    const cmdPathArray = commandPath || [];
    for (let {name, optDesc: commandOptDesc} of Object.values(target.commands)) {
      if (commandOptDesc.hidden) continue; // injected completions surface
      commandsSection += formatCommandUsage(arg0, cmdPathArray, name, commandOptDesc, listCtx);
    }
  }

  let optionSynopsis = formatDetailRows([], target.options, '  ', {ctx, includeAll: ctx.collapsed});
  if (!ctx.full && ctx.snipped && helpEnabled) {
    // Snipped output advertises --help. (An [options] collapse alone does
    // not — every option is still listed below, so nothing is hidden.) A
    // snip may happen while rendering the option rows themselves, so the
    // --help row can only be decided after a first pass; re-render with it.
    // (Full mode already lists --help via showHelp.)
    optionSynopsis = formatDetailRows([], target.options, '  ', {ctx, includeAll: ctx.collapsed, helpRow: true});
  }

  s += synopsisSection;
  if (positionalSynopsis) {
    s += theme.label('args:') + '\n' + positionalSynopsis + '\n';
  }
  if (optionSynopsis) {
    s += theme.label('options:') + '\n' + optionSynopsis + '\n';
  }
  if (target.commands) {
    s += theme.label('commands:') + '\n\n' + commandsSection + '\n';
  }

  // Full help closes with a `version:` section, in the same labelled shape as
  // args:/options:/commands:. Error usage stays terse and omits it. The
  // commands listing already ends in a blank line, so normalize the gap to one.
  if (isHelp && optDesc.version) {
    s = s.replace(/\n+$/, '\n\n');
    s += theme.label('version:') + '\n  ' + optDesc.version + '\n';
  }

  return s;
};

// The program identity line: `<prog> v<version>`, what --version prints.
// Full help shows the same version in its own `version:` section instead.
// A version that already carries the `v` keeps just the one — `git describe`
// output (v0.6.0-1-g4855e95) is a normal thing to pass through.
function versionText({arg0, version}) {
  return basename(arg0) + ' ' + (version.startsWith('v') ? version : 'v' + version);
}
module.exports.versionText = versionText;

function formatUsageLine(arg0, optDesc, command, commandPath, ctx) {
  let s = basename(arg0);

  if (command) {
    // The '' default command contributes no path segment — render like a plain
    // function CLI (`usage: prog <args>`), not `usage: prog  <args>`.
    const segments = (commandPath && commandPath.length ? commandPath : [command.name]).filter(Boolean);
    if (segments.length) s += " " + segments.join(' ');
  }

  s += formatPositionals(optDesc.positional);
  s += formatOptionsInline(optDesc.options, ctx);

  return s;
}

function formatPositionals(positional) {
  let s = '';
  for (let {name, rest, required} of positional) {
    const originalName = name;
    name = camelToKebabCase(name);
    if (rest) name += '...';
    const colored = originalName === 'command' ? theme.command(name) : theme.argument(name);
    if (!required) name = "[" + colored + "]";
    else name = colored;
    s += " " + name;
  }
  return s;
}

function inlineOptionText(options, fmt) {
  let s = '';
  const optKeys = Object.entries(options)
    .filter(([key, opt]) => key === opt.name && !opt.builtin)
    .map(([, opt]) => opt);

  for (let {name, alias, hasArg} of optKeys) {
    s += ' ';
    if (alias) {
      s += `[${fmt(alias, hasArg)}|${fmt(name, hasArg)}]`;
    } else {
      s += `[${fmt(name, hasArg)}]`;
    }
  }
  return s;
}

function formatOptionsInline(options, ctx) {
  // Measure with the uncolored formatter — ANSI codes would skew the length.
  const plain = inlineOptionText(options, optionFlag);
  if (plain.length > MAX_INLINE_OPTIONS_WIDTH) {
    ctx.collapsed = true;
    return ' [' + theme.option('options') + ']';
  }
  return inlineOptionText(options, formatOptionFlag);
}

function optionFlag(name, hasArg) {
  name = camelToKebabCase(name);
  const long = name.length > 1;
  const prefix = long ? '--' : '-';
  if (!hasArg) return `${prefix}${name}`;
  // `=` separates a long option from its value (`--opt=x`); short options take
  // the value as a following token (`-o x`), matching how the parser reads them.
  return `${prefix}${name}${long ? '=' : ' '}${VALUE_PLACEHOLDER}`;
}

function formatOptionFlag(name, hasArg) {
  return theme.option(optionFlag(name, hasArg));
}

// Cut a line to `limit` columns, backing up to a word boundary when one
// exists within the cut.
function snipAtWord(line, limit) {
  const cut = line.slice(0, limit);
  return (cut.replace(/\s+\S*$/, '') || cut).trimEnd();
}

// Columns available for text starting at startCol, with a sanity floor.
function availWidth(ctx, startCol) {
  return Math.max(ctx.width - startCol, 20);
}

// Full-mode text: dedent (the common indent of the lines after the first),
// keep blank lines and relative indentation. After dedenting, column-0 lines
// are prose and word-wrap; still-indented lines are preformatted (eg a YAML
// example in a docstring) and pass through untouched.
function fullTextLines(synopsis) {
  let lines = synopsis.split('\n').map(l => l.replace(/\s+$/, ''));
  const rest = lines.slice(1).filter(l => l);
  const minIndent = rest.length ? Math.min(...rest.map(l => l.match(/^\s*/)[0].length)) : 0;
  lines = [lines[0].replace(/^\s+/, ''), ...lines.slice(1).map(l => l.slice(minIndent))];
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines.flatMap(line => {
    if (!line) return [''];
    if (/^\s/.test(line)) return [line];
    return wrapLine(line);
  });
}

// Greedy word-wrap of a single line to MAX_SYNOPSIS_WIDTH.
function wrapLine(line) {
  const out = [];
  let cur = '';
  for (const word of line.split(/\s+/)) {
    if (cur && cur.length + 1 + word.length > MAX_SYNOPSIS_WIDTH) {
      out.push(cur);
      cur = word;
    } else {
      cur = cur ? cur + ' ' + word : word;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// Synopsis lines for an arg/option detail row, starting at startCol.
// Snip mode: only the first source line survives; a pure width-trim ends
// with ' [...]' at the window edge, while a line-trim (multi-line source)
// puts the bold [...] on its own next line. Full mode: every line,
// word-wrapped.
function synopsisRowLines(synopsis, ctx, startCol = 0) {
  if (!synopsis) return [];
  if (ctx.full) {
    return fullTextLines(synopsis);
  }
  const avail = availWidth(ctx, startCol);
  const srcLines = synopsis.split('\n');
  let line = srcLines[0].trim();
  const dropped = srcLines.length > 1;
  if (line.length > avail) {
    ctx.snipped = true;
    // ' [...]' is 6 columns; reserve them only when it lands on this line.
    line = dropped ? snipAtWord(line, avail) : snipAtWord(line, avail - 6) + ' ' + theme.more('[...]');
  }
  if (dropped) {
    ctx.snipped = true;
    return [line, theme.more('[...]')];
  }
  return [line];
}

// Command synopsis, starting at startCol. Snip mode: up to
// MAX_SYNOPSIS_LINES lines, width-trimmed at the window edge; dropped lines
// put a bold [...] on its own next line. Full mode: every line, word-wrapped.
function snipSynopsisLines(synopsis, ctx, startCol = 0) {
  if (ctx.full) {
    return fullTextLines(synopsis);
  }
  const avail = availWidth(ctx, startCol);
  let lines = synopsis.split('\n').map(l => l.trim());
  const dropped = lines.length > MAX_SYNOPSIS_LINES;
  lines = lines.slice(0, MAX_SYNOPSIS_LINES).map(line => {
    if (line.length <= avail) return line;
    ctx.snipped = true;
    return dropped ? snipAtWord(line, avail) : snipAtWord(line, avail - 6) + ' ' + theme.more('[...]');
  });
  if (dropped) {
    ctx.snipped = true;
    lines.push(theme.more('[...]'));
  }
  return lines;
}

// Build aligned "label    synopsis" rows for positionals and/or options.
// Labels are colored (args green, options yellow); synopses line up in a
// column 4 spaces past the longest label. `indent` prefixes every row.
// `includeAll` lists options even without a synopsis (used when the inline
// options collapsed to [options]); `helpRow` appends the --help row.
function formatDetailRows(positional, options, indent, {ctx = {snipped: false, full: false, width: DEFAULT_WINDOW_WIDTH}, includeAll = false, helpRow = false} = {}) {
  const rows = [];

  for (let {name, rest, required, synopsis} of positional) {
    if (!synopsis) continue;
    let label = camelToKebabCase(name);
    if (rest) label += '...';
    if (!required) label = '[' + label + ']';
    rows.push({label, colored: theme.argument(label), synopsis});
  }

  for (let [key, {name, alias, hasArg, synopsis, builtin}] of Object.entries(options)) {
    // Skip alias entries (rendered with their canonical name) and fncli's own
    // injected flags — help (advertised only via helpRow, when something was
    // snipped) and version (advertised by the `version:` section); options
    // without a description only appear when includeAll is set.
    if (key !== name || builtin) continue;
    if (!synopsis && !includeAll) continue;
    let label, colored;
    if (alias) {
      label = `${optionFlag(alias, hasArg)}, ${optionFlag(name, hasArg)}`;
      colored = `${formatOptionFlag(alias, hasArg)}, ${formatOptionFlag(name, hasArg)}`;
    } else {
      label = optionFlag(name, hasArg);
      colored = formatOptionFlag(name, hasArg);
    }
    rows.push({label, colored, synopsis});
  }

  if (helpRow) {
    rows.push({label: '--help', colored: theme.option('--help'), synopsis: 'Display more help'});
  }

  if (!rows.length) return '';
  // Rows with an over-long label or a multi-line description render as
  // "label\n<indent + 4>description lines" instead of joining the aligned
  // column, and don't count toward the column width — so one wide flag or
  // long description doesn't push every other row off-screen.
  //
  // Layout is decided before snipping: full mode renders its lines now (no
  // snipping involved), and a terse row with a multi-line source always
  // takes the own-line layout — so each row's start column is known when
  // the window-edge trim is applied.
  for (const r of rows) {
    if (ctx.full) {
      r.lines = synopsisRowLines(r.synopsis, ctx);
      r.ownLine = r.label.length > MAX_LABEL_WIDTH || r.lines.length > 1;
    } else {
      r.ownLine = r.label.length > MAX_LABEL_WIDTH || /\n/.test(r.synopsis || '');
    }
  }
  const fitting = rows.filter(r => !r.ownLine);
  const width = fitting.length ? Math.max(...fitting.map(r => r.label.length)) : 0;
  if (!ctx.full) {
    for (const r of rows) {
      const startCol = indent.length + (r.ownLine ? 4 : width + 4);
      r.lines = synopsisRowLines(r.synopsis, ctx, startCol);
    }
  }
  let s = '';
  for (const row of rows) {
    const {label, colored, lines} = row;
    if (row.ownLine) {
      s += indent + colored + '\n';
      for (const line of lines) {
        s += (indent + '    ' + line).trimEnd() + '\n';
      }
    } else {
      s += (indent + colored + ' '.repeat(width - label.length + 4) + (lines[0] || '')).trimEnd() + '\n';
    }
  }
  return s;
}

function formatCommandUsage(arg0, parentPath, name, commandOptDesc, ctx) {
  const path = (parentPath || []).concat(name);

  // A group has no handler of its own; recurse so every leaf sub-command is
  // listed with its full path (eg `remote add`, `remote remove`) instead of a
  // useless `remote command` line.
  if (commandOptDesc.commands) {
    let s = '';
    for (let {name: childName, optDesc: childOptDesc} of Object.values(commandOptDesc.commands)) {
      if (childOptDesc.hidden) continue; // injected completions surface
      s += formatCommandUsage(arg0, path, childName, childOptDesc, ctx);
    }
    return s;
  }

  let s = `  ${path.map(p => theme.command(p)).join(' ')}`;

  // Snips are tracked per command: when this command's entry was abbreviated
  // with [...], --help is listed among its own options as the way to the
  // full text. An [options] collapse alone doesn't count — every option is
  // still listed below.
  const cmdCtx = {snipped: false, collapsed: false, full: ctx.full, helpEnabled: ctx.helpEnabled, width: ctx.width};

  s += formatPositionals(commandOptDesc.positional);
  s += formatOptionsInline(commandOptDesc.options, cmdCtx);
  s += '\n';

  if (commandOptDesc.synopsis) {
    for (const line of snipSynopsisLines(commandOptDesc.synopsis, cmdCtx, 4)) {
      s += ('    ' + line).trimEnd() + '\n';
    }
  }

  // Per-arg and per-option descriptions, indented under the command (the
  // top-level args:/options: sections only cover a single-function CLI).
  let detail = formatDetailRows(commandOptDesc.positional, commandOptDesc.options, '    ', {ctx: cmdCtx, includeAll: cmdCtx.collapsed});
  if (cmdCtx.snipped && ctx.helpEnabled) {
    detail = formatDetailRows(commandOptDesc.positional, commandOptDesc.options, '    ', {ctx: cmdCtx, includeAll: cmdCtx.collapsed, helpRow: true});
  }
  if (detail) s += '\n' + detail;

  s += '\n';

  return s;
}

function camelToKebabCase(str) {
  if (!str || str.length < 3) return str;
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
