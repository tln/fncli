/**
 * funcli - function-based cli scaffold.
 * Parses argv based on the given function signature, and
 * then calls the function.
 */
module.exports = function (func, argv=process.argv) {
  try {
    if (typeof func === 'function') {
      parseAndRunFunc(argv, func);
    } else {
      // sub-command style
      parseAndRunSubCommands(argv, func);
    }
  } catch(e) {
    console.error(e);
  }
}

function parseAndRunSubCommands(argv, commands) {
  let [, arg0, ...args] = argv;
  let opts = optDescFromCommands(commands);
  opts.arg0 = arg0;
  let decoded = decodeArgs(opts, args);
  let func = decoded.command ? commands[decoded.command.name] : null;
  applyFunc(decoded, func, arg0);
}

function parseAndRunFunc(argv, func) {
  let [, arg0, ...args] = argv;
  let opts = optDescFromSignature(func);
  opts.arg0 = arg0;
  let decoded = decodeArgs(opts, args);
  applyFunc(decoded, func);
}

/**
 * Return an opts data structure that describes the options and arguments.
 * @param {*} func
 */
function optDescFromCommands(handlers) {
  let commands = {};
  for (let name in handlers) {
    let optDesc = optDescFromSignature(handlers[name]);
    commands[name] = {name, optDesc};
  }
  return {
    optionParamIndex: null, 
    options: {}, 
    positional: [{name: 'command', required: true}],
    commands
  };
}
// For testing
module.exports.optDescFromCommands = optDescFromCommands;

function paramString(func) {
  // extract param string
  let [, params] = /\(\s*([^)]*)/.exec(func.toString());
  return extractComment(params);
}

function extractComment(params) {
  let m = /^\/\/([^\n]+)|^\/\*(.*?)\*\//.exec(params);
  let comment = null;
  if (m) {
    comment = (m[1] || m[2]).trim();
    params = params.substring(m[0].length + m.index);
  }
 return [comment, params]
}

/**
 * Return an opts data structure that describes the options and arguments.
 * @param {*} func
 */
function optDescFromSignature(func) {
  // Find arguments from function source code. This requires parens
  // and breaks if any optional values use parens, or on getters, etc.
  let [synopsis, params] = paramString(func);
  let re = /({)|(}\s*)|(\w+)(?:\s*=([^,}]+))?,?\s*(?:\/\/([^\n]+)|\/\*(.*?)\*\/)?\s*/g, m, inOptions = false;
  let result = {synopsis, optionParamIndex: null, options: {}, positional: []};
  while (m = re.exec(params)) {
    let [, startOptions, endOptions, name, defaultExpr, synopsis, synopsis2] = m;
    synopsis = synopsis || synopsis2 || null;
    if (synopsis) synopsis = synopsis.trim();
    if (startOptions) {
      if (result.optionParamIndex !== null) throw "Can't nest/repeat options";
      inOptions = true;
      result.optionParamIndex = result.positional.length;
    } else if (endOptions) {
      console.assert(inOptions);
      inOptions = false;
    } else if (inOptions) {
      result.options[name] = {name, hasArg: defaultExpr !== 'false', synopsis};
    } else {
      result.positional.push({name, required: !defaultExpr, synopsis});
    }
  }
  return result;
}
// Expose for testing
module.exports.optDescFromSignature = optDescFromSignature;

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
    if (m = arg.match(/^--(\w+)(?:=(.*))?/)) {
      let [, optName, optVal] = m;
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
    } else {
      let {name} = pos.shift() || {};
      if (!name) result.error = "Too many arguments";
      if (optDesc.commands) {
        // swith to handling optDesc from command. Don't include the 
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
      result.apply.push(arg);
      result.values[name] = arg;
    }
  }
  for (let {required} of pos) {
    if (required) {
      result.error = "Missing required argument";
    } else {
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
function applyFunc(decoded, func, arg0) {
  if (decoded.error) {
    console.error(usage(decoded));
  } else {
    func.apply(null, decoded.apply);
  }
}

function printIfError(decoded) {
  if (decoded.error) {
    console.error(`error: ${decoded.error}\n${usage(decoded.optDesc)}`);
  }
}

const {basename} = require('path');
function usage({optDesc, error, command}) {
  let {arg0} = optDesc;
  console.assert(arg0);
  let s = `error: ${error}\nusage: ${basename(arg0)}`;
  if (command) {
    optDesc = command.optDesc;
    s += " " + command.name;
  }
  let hasOptions = Object.keys(optDesc.options).length > 0;  
  if (hasOptions) s += " [options]";
  let positionalSynopsis = '';
  for (let {name, required, synopsis} of optDesc.positional) {
    if (!required) name = "[" + name + "]";
    s += " " + name;
    if (synopsis) {
      positionalSynopsis += `  ${name}    ${synopsis}`;
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
    for (let {name, hasArg, synopsis} of Object.values(optDesc.options)) {
      s += `  --${name}${hasArg?'=<value>':''}`;
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
