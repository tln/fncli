const {basename} = require('path');
const pc = require('picocolors');

const theme = {
  error: text => pc.bold(pc.red(text)),
  label: text => pc.bold(text),
  command: text => pc.cyan(text),
  option: text => pc.yellow(text),
  argument: text => pc.green(text),
};

module.exports = function usage({optDesc, error, command, commandPath, isHelp}) {
  let {arg0} = optDesc;
  console.assert(arg0);
  let s = '';

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

  s += theme.label('usage:') + ' ' + formatUsageLine(arg0, target, command, commandPath);
  s += '\n\n';

  if (target.synopsis) {
    s += '  ' + target.synopsis + '\n\n';
  }

  const positionalSynopsis = formatDetailRows(target.positional, {}, '  ');
  if (positionalSynopsis) {
    s += theme.label('args:') + '\n' + positionalSynopsis + '\n';
  }

  const optionSynopsis = formatDetailRows([], target.options, '  ');
  if (optionSynopsis) {
    s += theme.label('options:') + '\n' + optionSynopsis + '\n';
  }

  if (target.commands) {
    s += theme.label('commands:') + '\n\n';
    const cmdPathArray = commandPath || [];
    for (let {name, optDesc: commandOptDesc} of Object.values(target.commands)) {
      s += formatCommandUsage(arg0, cmdPathArray, name, commandOptDesc);
    }
    s += '\n';
  }

  return s;
};

function formatUsageLine(arg0, optDesc, command, commandPath) {
  let s = basename(arg0);

  if (command) {
    s += " " + (commandPath && commandPath.length ? commandPath.join(' ') : command.name);
  }

  s += formatPositionals(optDesc.positional);
  s += formatOptionsInline(optDesc.options);

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

function formatOptionsInline(options) {
  let s = '';
  const optKeys = Object.entries(options)
    .filter(([key, opt]) => key === opt.name && opt.name !== 'help')
    .map(([, opt]) => opt);

  for (let {name, alias, hasArg} of optKeys) {
    s += ' ';
    if (alias) {
      const shortForm = formatOptionFlag(alias, hasArg);
      const longForm = formatOptionFlag(name, hasArg);
      s += `[${shortForm}|${longForm}]`;
    } else {
      s += `[${formatOptionFlag(name, hasArg)}]`;
    }
  }
  return s;
}

function optionFlag(name, hasArg) {
  name = camelToKebabCase(name);
  const prefix = name.length > 1 ? '--' : '-';
  return `${prefix}${name}${hasArg ? '=<value>' : ''}`;
}

function formatOptionFlag(name, hasArg) {
  return theme.option(optionFlag(name, hasArg));
}

// Build aligned "label    synopsis" rows for positionals and/or options.
// Labels are colored (args green, options yellow); synopses line up in a
// column 4 spaces past the longest label. `indent` prefixes every row.
function formatDetailRows(positional, options, indent) {
  const rows = [];

  for (let {name, rest, required, synopsis} of positional) {
    if (!synopsis) continue;
    let label = camelToKebabCase(name);
    if (rest) label += '...';
    if (!required) label = '[' + label + ']';
    rows.push({label, colored: theme.argument(label), synopsis});
  }

  for (let [key, {name, alias, hasArg, synopsis}] of Object.entries(options)) {
    // Skip alias entries (rendered with their canonical name), the implicit
    // help flag, and options without a description.
    if (key !== name || name === 'help' || !synopsis) continue;
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

  if (!rows.length) return '';
  const width = Math.max(...rows.map(r => r.label.length));
  let s = '';
  for (const {label, colored, synopsis} of rows) {
    s += indent + colored + ' '.repeat(width - label.length + 4) + synopsis + '\n';
  }
  return s;
}

function formatCommandUsage(arg0, parentPath, name, commandOptDesc) {
  const path = (parentPath || []).concat(name);

  // A group has no handler of its own; recurse so every leaf sub-command is
  // listed with its full path (eg `remote add`, `remote remove`) instead of a
  // useless `remote command` line.
  if (commandOptDesc.commands) {
    let s = '';
    for (let {name: childName, optDesc: childOptDesc} of Object.values(commandOptDesc.commands)) {
      s += formatCommandUsage(arg0, path, childName, childOptDesc);
    }
    return s;
  }

  let s = `  ${path.map(p => theme.command(p)).join(' ')}`;

  s += formatPositionals(commandOptDesc.positional);
  s += formatOptionsInline(commandOptDesc.options);
  s += '\n';

  if (commandOptDesc.synopsis) {
    s += `    ${commandOptDesc.synopsis}\n`;
  }

  // Per-arg and per-option descriptions, indented under the command (the
  // top-level args:/options: sections only cover a single-function CLI).
  const detail = formatDetailRows(commandOptDesc.positional, commandOptDesc.options, '    ');
  if (detail) s += '\n' + detail;

  s += '\n';

  return s;
}

function camelToKebabCase(str) {
  if (!str || str.length < 3) return str;
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
  