const DEFAULT_OPTS = {
  help: false
};

const parseSignature = require('./parseSignature');
const decodeArgs = require('./decodeArgs');
const usage = require('./usage');

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
    console.error(usage(decoded));
  } else {
    const func = getHandler(commands, decoded.command);
    applyFunc(decoded, func);
  }
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

/**
 * Apply the decoded argument result, including printing out usage errors.
 *
 * @param {*} args
 * @param {*} func
 */
async function applyFunc(decoded, func) {
  try {
    await func.apply(null, decoded.apply);
  } catch(e) {
    // Handle usage errors, re-throw the rest
    if (e.toString().startsWith('error:')) {
      console.error(usage({...decoded, error: e.toString()}));
    } else {
      throw e;
    }
  }
}
