/**
 * Return an opts data structure that describes the options and arguments.
 * @param {*} func
 */
module.exports = function parseSignatures(handlers) {
  if (typeof handlers === 'function') {
      return parseSignature(handlers);
  }
  let commands = {};
  for (let name in handlers) {
    let optDesc = parseSignature(handlers[name]);
    commands[name] = {name, optDesc};
  }
  return {
    optionParamIndex: null,
    options: {},
    positional: [{name: 'command', required: true}],
    commands
  };
}

function parseSignature(func) {
  // Find arguments from function source code (ie, the functions string representation)
  let [synopsis, params] = paramString(func);
  let re = /({)|(}\s*)|(\.\.\.)?(\w+)(?:\s*:\s*(\w+))?(?:\s*=([^,}/]+))?,?\s*(?:\/\/([^\n]+)|\/\*(.*?)\*\/)?\s*/g, m, inOptions = false;

  let result = {synopsis, optionParamIndex: null, options: {}, positional: []};
  while (m = re.exec(params)) {
    let [, startOptions, endOptions, dotdotdot, name, alias, defaultExpr, synopsis, synopsis2] = m;
    synopsis = synopsis || synopsis2 || null;
    if (synopsis) synopsis = synopsis.trim();
    if (defaultExpr) defaultExpr = defaultExpr.trim();
    if (startOptions) {
      if (result.optionParamIndex !== null) throw "Can't nest/repeat options";
      inOptions = true;
      result.optionParamIndex = result.positional.length;
    } else if (endOptions) {
      console.assert(inOptions);
      inOptions = false;
    } else if (inOptions) {
      result.options[name] = {name, hasArg: defaultExpr !== 'false', synopsis};
      if (alias) {
        result.options[name].alias = alias;
        result.options[alias] = result.options[name];
      }
    } else {
      let rest = !!dotdotdot;
      result.positional.push({name, required: !defaultExpr && !rest, synopsis, rest});
    }
  }
  return result;
}

function paramString(func) {
  // extract param string from function, eg function(x) {..} => 'x'
  // Allows balanced parens.
  const s = func.toString(), start = s.indexOf('(');
  console.assert(start > -1);
  let d = 1, i = start+1;
  for (; d > 0 && i < s.length; i++) {
    d += {'(': 1, ')': -1}[s[i]] || 0;
  }
  const params = s.slice(start+1, i-1).trim();
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
