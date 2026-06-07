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
    opts.options.help = {name: 'help', hasArg: false, synopsis: 'Prints this message'};
  }
  const decoded = decodeArgs(opts, args);
  if (config.help && decoded.optionValues.help) {
    decoded.error = true;
  }
  if (decoded.error) {
    process.exitCode = 2;
    console.error(usage(decoded));
  } else {
    const func = getHandler(commands, decoded.commandPath);
    applyFunc(decoded, func);
  }
}

function getHandler(commands, commandPath) {
  // Walk the decoded command path down to the handler function.
  let handler = commands;
  for (let name of commandPath) {
    handler = handler[name];
  }
  if (typeof handler !== 'function') {
    throw new Error('invalid type:', handler);
  }
  return handler;
}

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
