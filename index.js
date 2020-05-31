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
 * Parse arguments into a decoded argument result.
 * Keys:
 *   values: object with values for all options
 *   optionValues: option flag values only (no positional)
 *   command: entry from positional commands objects
 *   apply: flattened arguments ready to apply
 *   error: "description of error"
 *   optDesc: structure used to parse options
 * @param {*} opts
 * @param {*} args
 */
function decodeArgs(optDesc, argv) {
  let result = {optDesc, values: {}, optionValues: {}, apply: [], command: null};
  let args = argv.concat(), pos = optDesc.positional.concat();
  let arg, m;
  while (args.length) {
    arg = args.shift();
    if (m = arg.match(/^--([\w-]+)(?:=(.*))?/)) {
      let [, optName, optVal] = m;
      optName = kebabToCamelCase(optName);
      let {name, hasArg} = optDesc.options[optName] || {};
      if (!name) {
        result.error = "Unknown option";
      } else if (hasArg) {
        if (!optVal) optVal = args.shift();
        if (!optVal) result.error = "Option missing value";
      } else {
        if (optVal) result.error = "Didn't expect value for flag argument";
        optVal = true;
      }
      result.optionValues[name] = optVal;
      result.values[name] = optVal;
    } else if (arg.match(/^-/)) {
      // Process short args
      arg = arg.substring(1);
      do {
        flag = arg[0];
        arg = arg.substring(1);
        let {name, hasArg} = optDesc.options[flag] || {};
        let optVal = null;
        if (!name) {
          result.error = "Unknown option";
        } else if (hasArg) {
          optVal = arg;
          arg = '';
          if (!optVal) optVal = args.shift();
          if (!optVal) result.error = "Option missing value";
        } else {
          optVal = true;
        }
        result.optionValues[name] = optVal;
        result.values[name] = optVal;
      } while (arg);
    } else {
      let {name, rest} = pos.shift() || {};
      if (!name) result.error = "Too many arguments";
      if (optDesc.commands) {
        // switch to handling optDesc from command. Don't include the
        // command name in the result.
        result.command = optDesc.commands[arg];
        if (!result.command) {
          result.error = "Command not found";
        } else {
          optDesc = result.command.optDesc;
          pos = optDesc.positional.concat();
        }
        continue;
      }
      if (rest) {
        result.apply.push(arg, ...args);
        result.values[name] = [arg].concat(args);
        args = [];
      } else {
        result.apply.push(arg);
        result.values[name] = arg;
      }
    }
  }
  for (let {rest, required} of pos) {
    if (required) {
      result.error = "Missing required argument";
    } else if (!rest) {
      result.apply.push(undefined);
    }
  }
  if (optDesc.optionParamIndex != null) {
    result.apply.splice(optDesc.optionParamIndex, 0, result.optionValues);
  }
  return result;
}
// Expose for testing
module.exports.decodeArgs = decodeArgs;

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
