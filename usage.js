const {basename} = require('path');

/**
 * Formats a usage string from parsed options
 */
module.exports = function usage({optDesc, error, command}) {
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

function camelToKebabCase(str) {
  if (!str || str.length < 3) return str;
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
  