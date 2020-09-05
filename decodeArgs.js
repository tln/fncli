
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
module.exports = function decodeArgs(optDesc, argv) {
  let result = {optDesc, values: {}, optionValues: {}, apply: [], command: null};
  let args = argv.concat(), pos = optDesc.positional.concat();
  let arg, m, ix = 0, allowOptions = true, inRest = null;
  while (ix < args.length) {
    arg = args[ix++];
    if (arg === '--' && allowOptions) {
      allowOptions = false;
      continue;
    }
    if (allowOptions && (m = arg.match(/^--([\w-]+)(?:=(.*))?/))) {
      let [, optName, optVal] = m;
      optName = kebabToCamelCase(optName);
      let {name, hasArg} = optDesc.options[optName] || {};
      if (!name) {
        result.error = "Unknown option";
      } else if (hasArg) {
        if (!optVal) optVal = args[ix++]; // may access off end of array -- that's ok
        if (!optVal) result.error = "Option missing value";
      } else {
        if (optVal) result.error = "Didn't expect value for flag argument";
        optVal = true;
      }
      result.optionValues[name] = optVal;
      result.values[name] = optVal;
    } else if (allowOptions && arg.match(/^-./)) {
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
          if (!optVal) optVal = args[ix++];
          if (!optVal) result.error = "Option missing value";
        } else {
          optVal = true;
        }
        result.optionValues[name] = optVal;
        result.values[name] = optVal;
      } while (arg);
    } else if (inRest) {
      // Process as many of the rest args as we can
      const start = ix - 1;
      if (allowOptions) {
        // Advance ix to first option-like arg
        while (ix < args.length && !(args[ix].length >= 2 && args[ix][0] === '-')) ix++;
      } else {
        ix = args.length;
      }
      const restArgs = args.slice(start, ix);
      result.apply = result.apply.concat(restArgs);
      result.values[inRest] = result.values[inRest].concat(restArgs);
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
        inRest = name;
        result.apply.push(arg);
        result.values[inRest] = [arg];
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

function kebabToCamelCase(str) {
  return str.replace(/-([a-z])/g, ([, letter]) => letter.toUpperCase());
}
  
