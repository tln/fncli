/**
 * fncli - function-based cli scaffold.
 * Parses argv based on the given function signature, and
 * then calls the function.
 */
module.exports = function (commands, {argv=process.argv, ...config}) {
  config = Object.assign({}, DEFAULT_OPTS, config);
  try {
    parseAndRun(argv, commands, config);
  } catch(e) {
    console.error(e);
  }
}

const DEFAULT_OPTS = {
  help: false
};

const parseSignature = require('./parseSignature');
const decodeArgs = require('./decodeArgs');
function parseAndRun(argv, commands, config) {
  const [, arg0, ...args] = argv;
  const opts = parseSignature(commands);
  opts.arg0 = arg0;
  const decoded = decodeArgs(opts, args);
  const func = getHandler(commands, decoded.command);
  applyFunc(decoded, func);
}
function getHandler(commands, selectedCommand) {
  if (typeof commands === 'function') {
    return commands;
  } else if (selectedCommand) {
    return commands[selectedCommand.name];
  } else {
    throw new Error('invalid type:', commands);
  }
}

function camelToKebabCase(str) {
  if (!str || str.length < 3) return str;
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Apply the decoded argument result, including printing out usage errors.
 *
 * @param {*} args
 * @param {*} func
 */
async function applyFunc(decoded, func) {
  if (decoded.error) {
    console.error(usage(decoded));
  } else {
    try {
      await func.apply(null, decoded.apply);
    } catch(e) {
      // Handle usage errors, re-throw the rest
      if (e.toString().startsWith('error:')) {
        console.error(e);
        console.error(usage(decoded));
      } else {
        throw e;
      }
    }
  }
}

const {basename} = require('path');
function usage({optDesc, error, command}) {
  let {arg0} = optDesc;
  console.assert(arg0);
  let s = '';
  if (error) s += `error: ${error}\n`;
  s += `usage: ${basename(arg0)}`;
  if (command) {
    optDesc = command.optDesc;
    s += " " + command.name;
  }
  let hasOptions = Object.keys(optDesc.options).length > 0;
  if (hasOptions) s += " [options]";
  let positionalSynopsis = '';
  for (let {name, rest, required, synopsis} of optDesc.positional) {
    name = camelToKebabCase(name);
    if (rest) name += '...';
    if (!required) name = "[" + name + "]";
    s += " " + name;
    if (synopsis) {
      positionalSynopsis += `  ${name}    ${synopsis}\n`;
    }
  }
  s += "\n\n";
  if (optDesc.synopsis) {
    s += optDesc.synopsis + "\n\n";
  }
  if (positionalSynopsis) {
    s += `args:\n${positionalSynopsis}\n\n`;
  }
  if (hasOptions) {
    s += "options:\n";
    for (let [key, {name, alias, hasArg, synopsis}] of Object.entries(optDesc.options)) {
      if (key !== name) continue;
      name = camelToKebabCase(name);
      s += '  ';
      if (alias) {
        alias = camelToKebabCase(alias);
        if (alias.length > name.length) [alias, name] = [name, alias];
        if (alias.length > 1) alias = '-' + alias;
        s += `-${alias}, `;
      }
      if (name.length > 1) name = '-' + name;
      s += `-${name}${hasArg?'=<value>':''}`;
      if (synopsis) s += `   ${synopsis}`;
      s += '\n';
    }
    s += "\n";
  }
  if (optDesc.commands) {
    s += "commands:\n";
    for (let {name, optDesc: commandOptDesc} of Object.values(optDesc.commands)) {
      s += `  ${name}`;
      if (commandOptDesc.synopsis) s += `   ${commandOptDesc.synopsis}`;
      s += '\n';
    }
    s += "\n";
  }
  return s;
}
// Expose for testing
module.exports.usage = usage;
