const DEFAULT_OPTS = {
  help: true
};

const parseSignature = require('./parseSignature');
const decodeArgs = require('./decodeArgs');
const usage = require('./usage');

/**
 * fncli - function-based cli scaffold.
 * Parses argv based on the given function signature, and
 * then calls the function.
 */
module.exports = function (commands, {argv=process.argv, ...config}={}) {
  config = Object.assign({}, DEFAULT_OPTS, config);
  try {
    parseAndRun(argv, commands, config);
  } catch(e) {
    console.error(e);
  }
}

function parseAndRun(argv, commands, config) {
  const [, arg0, ...args] = argv;
  const opts = parseSignature(commands);
  opts.arg0 = arg0;
  if (config.help) {
    addHelpOption(opts);
  }
  const decoded = decodeArgs(opts, args);
  const isHelpRequested = config.help && decoded.optionValues.help;
  if (isHelpRequested) {
    decoded.error = true;
  }
  if (decoded.error) {
    const text = usage({...decoded, isHelp: isHelpRequested});
    if (isHelpRequested) {
      // Requested help is not an error: print to stdout (pipeable), exit 0.
      console.log(text);
    } else {
      process.exitCode = 2;
      console.error(text);
    }
  } else {
    const func = getHandler(commands, decoded.commandPath);
    applyFunc(decoded, func);
  }
}

// Register --help on the top-level descriptor and every (nested) command, so
// `cmd sub --help` decodes after the option context switches to the
// sub-command. User-defined help/h options are left alone.
function addHelpOption(optDesc) {
  if (optDesc.commands) {
    for (let name in optDesc.commands) {
      addHelpOption(optDesc.commands[name].optDesc);
    }
  }
  if (optDesc.options.help) return;
  const help = {name: 'help', hasArg: false, synopsis: 'Prints this message'};
  if (!optDesc.options.h) {
    help.alias = 'h';
    optDesc.options.h = help;
  }
  optDesc.options.help = help;
}

function getHandler(commands, commandPath) {
  // Walk the decoded command path down to the handler function.
  let handler = commands;
  for (let name of commandPath) {
    handler = handler[name];
  }
  if (typeof handler !== 'function') {
    throw new Error('invalid type: ' + typeof handler);
  }
  return handler;
}
module.exports.getHandler = getHandler;

/**
 * Apply the decoded argument result, including printing out usage errors.
 *
 * @param {*} args
 * @param {*} func
 */
function applyFunc(decoded, func) {
  let result;
  try {
    result = func.apply(null, decoded.apply);
  } catch(e) {
    handleHandlerError(decoded, e);
    return;
  }
  if (result && typeof result.then === 'function') {
    // Async handler — await the promise but keep error handling consistent.
    return result.then(
      r => handleReturn(decoded, r),
      e => handleHandlerError(decoded, e)
    );
  }
  handleReturn(decoded, result);
}

function handleReturn(decoded, result) {
  if (typeof result === 'string' && result.startsWith('error:')) {
    process.exitCode = 1;
    console.error(usage({...decoded, error: result}));
  }
}

function handleHandlerError(decoded, e) {
  if (e && typeof e.toString === 'function' && e.toString().startsWith('error:')) {
    process.exitCode = 1;
    console.error(usage({...decoded, error: e.toString()}));
  } else {
    throw e;
  }
}
