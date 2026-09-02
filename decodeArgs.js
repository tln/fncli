
/**
 * Parse arguments into a decoded argument result.
 * Keys:
 *   values: object with values for all options
 *   optionValues: option flag values only (no positional)
 *   command: entry from positional commands objects
 *   commandPath: names of the commands selected at each nesting level
 *   apply: flattened arguments ready to apply
 *   error: "description of error"
 *   optDesc: structure used to parse options
 * @param {*} opts
 * @param {*} args
 */
module.exports = function decodeArgs(optDesc, argv) {
  let result = {optDesc, values: {}, optionValues: {}, apply: [], command: null, commandPath: []};
  // Only one error is reported, and it is the FIRST one found — later problems
  // are usually knock-on effects of it. Assigning directly would let the
  // trailing required-args check overwrite the real cause, so eg `prog --foo`
  // (with a required arg) reported "Missing required argument" rather than the
  // unknown option the user actually typed.
  const setError = (message) => { if (!result.error) result.error = message; };
  let args = argv.concat(), pos = optDesc.positional.concat();
  // Default command: when a group has a '' entry and the next token isn't one
  // of its named sub-commands, dispatch to the default *without* consuming the
  // token — its args/options belong to the default. The rule holds at every
  // nesting level, so this runs once up front and again on entering a nested
  // group; the loop lets a default that is itself a group hand off to its own
  // default. fncli injects '' at the top so `fncli(fn)` runs fn while
  // `completions` stays a normal sibling command.
  const enterDefault = (token) => {
    while (optDesc.commands && optDesc.commands[''] && !optDesc.commands[token]) {
      result.command = optDesc.commands[''];
      result.commandPath.push('');
      optDesc = result.command.optDesc;
      pos = optDesc.positional.concat();
    }
  };
  enterDefault(args[0]);
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
        setError("Unknown option");
      } else if (hasArg) {
        if (!optVal) optVal = args[ix++]; // may access off end of array -- that's ok
        if (!optVal) setError("Option missing value");
      } else {
        if (optVal) setError("Didn't expect value for flag argument");
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
          setError("Unknown option");
        } else if (hasArg) {
          optVal = arg;
          arg = '';
          if (!optVal) optVal = args[ix++];
          if (!optVal) setError("Option missing value");
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
      if (!name) setError("Too many arguments");
      if (optDesc.commands) {
        // switch to handling optDesc from command. Don't include the
        // command name in the result. Nested groups re-enter here on
        // the next positional, consuming one path segment per level.
        const next = optDesc.commands[arg];
        if (!next) {
          // Unknown command: leave `command`/`commandPath` at the last group we
          // did resolve, so usage describes *that* group (its sub-commands)
          // rather than reprinting the top level with a stray prefix.
          setError("Command not found");
        } else {
          result.command = next;
          result.commandPath.push(arg);
          optDesc = next.optDesc;
          pos = optDesc.positional.concat();
          enterDefault(args[ix]);
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
      setError("Missing required argument");
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
  
