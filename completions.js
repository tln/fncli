'use strict';

// fncli completions — built-in shell completion, on by default.
//
// fncli reserves one command, `completions`, routed here before normal
// decoding (see index.js). Its surface:
//
//   myapp completions                   show help
//   myapp completions script [shell]    print the stub for eval/source
//   myapp completions install [shell]   write the stub to the shell's autoload dir
//   myapp completions v1 -- <proto> <word...> <toComplete>
//                                       per-TAB runtime (what the stub calls)
//
// `v1` versions fncli's request contract and `--` keeps option-looking words
// out of any option parsing. The stub is generated with the same request
// token, so the stub and this router can't disagree.
//
// Configure via fncli's `completions` option (every part optional — commands,
// options and file fallback complete with no config at all):
//
//   fncli(commands, { completions: {
//     name: 'myapp',                     // stub name (default: arg0 basename)
//     handlers: {                        // value handlers, by parameter name
//       config: ['dev', 'prod'],         // static candidates
//       file: { ext: ['md'] },           // shell file completion, filtered
//       host: async (partial, state) => [...], // dynamic
//     },
//   } })
//
// A handler is any shell-complete Reply — an array of candidates, { ext },
// { dirs }, { items, default } — or a (sync/async) function returning one.
// `completions: false` disables the command entirely.

const { handle, installation, stubs } = require('shell-complete');

// The token the stub re-invokes us with.
const REQUEST = 'completions v1 --';

// The built-in `completions` command group, injected by fncli as a normal
// sibling command (see index.js). `ctx` is filled in by fncli before dispatch:
//   ctx.opts    the full parsed descriptor (incl. auto --help) to complete
//               against — the same one fncli runs, so options complete as they
//               parse.
//   ctx.config  the `completions` option object ({ name, out, handlers }).
//
//   myapp completions script [shell]    print the stub for eval/source
//   myapp completions install [shell]   write the stub to the shell's autoload dir
//   myapp completions v1 -- <stamp> <word...> <toComplete>
//                                       per-TAB runtime (what the stub calls);
//                                       `--` ends option parsing so option-like
//                                       words reach the handler verbatim.
function commands(ctx) {
  const out = () => (ctx.config && ctx.config.out) || process.stdout;

  return {
    // `HIDE` keeps the whole group out of listings/usage/completion (see
    // parseSignature) — it stays a normal, dispatchable command, just unlisted.
    synopsis: 'HIDE',
    // Write the stub into the shell's autoload dir.
    install(shell = 'auto') {
      emit('install', shell, ctx, out());
    },
    // Print the stub (for the eval/source rc line).
    script(shell = 'auto') {
      emit('script', shell, ctx, out());
    },
    // Per-TAB runtime, the internal wire surface. handle() splits
    // [stamp, ...words, toComplete] off and answers "show nothing" if the
    // callback throws — no noise at the shell. The stub sends shell-complete's
    // `<shell>/<n>` transport stamp as the first word; tolerate its absence so
    // the wire is easy to poke by hand: `myapp completions v1 -- checklist ''`.
    // Its own `HIDE` synopsis keeps it unlisted even within `completions`.
    v1(
      // HIDE
      stamp = '',
      ...word
    ) {
      let rest = [stamp].concat(word);
      if (!/^[a-z]+\/\d+$/.test(rest[0] || '')) rest = [''].concat(rest);
      // Complete the `shell` argument of install/script from the known shells;
      // a user handler of the same name still wins.
      const cfg = Object.assign({}, ctx.config, {
        handlers: Object.assign({ shell: stubs.shells.slice().sort() }, ctx.config && ctx.config.handlers),
      });
      return handle((prior, toComplete) => reply(decode(prior, toComplete, ctx.opts), cfg), rest, { out: out() });
    },
  };
}

// `script` prints the stub; `install` writes it into the shell's autoload dir.
function emit(action, shell, ctx, out) {
  let inst;
  try {
    inst = installation({ request: REQUEST, name: (ctx.config && ctx.config.name) || programName(ctx.opts), shell: shell || 'auto' });
  } catch (e) {
    // e.g. an unknown shell name
    process.exitCode = 2;
    console.error('error: ' + (e && e.message ? e.message : e));
    return;
  }
  if (action === 'install') {
    // install() writes the stub, then reports the path (and, when the shell
    // won't autoload it, the one rc line that fixes it) to `out` itself.
    inst.install({ out });
  } else {
    out.write(inst.script);
  }
}

// The command name the stub registers against: explicit option wins, else the
// invoked script's basename without a .js/.mjs/.cjs extension.
function programName(opts) {
  const arg0 = (opts && opts.arg0) || 'cli';
  return arg0.split('/').pop().replace(/\.[cm]?js$/, '');
}

// Seam A — cursor-aware decode: (prior words, cursor word, descriptor) ->
//
//   { toComplete, optDesc, commandPath, expecting, ... }
//
// A lenient, purpose-built walk (not fncli's strict decodeArgs): it descends
// nested commands and classifies what the cursor token is completing.
function decode(prior, toComplete, optDesc) {
  // Walk prior tokens: descend commands, and count positional slots consumed so
  // we know which positional the cursor is on.
  const commandPath = [];
  let positionalIndex = 0;
  let i = 0;
  while (i < prior.length) {
    const token = prior[i];
    if (optDesc.commands && optDesc.commands[token] && token !== '') {
      commandPath.push(token);
      optDesc = optDesc.commands[token].optDesc;
      positionalIndex = 0;
      i++;
    } else if (optDesc.commands && optDesc.commands['']) {
      // Default ('') command: the token isn't a named sub-command, so descend
      // into the default *without* consuming it (mirrors decodeArgs) and
      // reprocess it against the default's own args/options.
      commandPath.push('');
      optDesc = optDesc.commands[''].optDesc;
      positionalIndex = 0;
    } else if (token.charAt(0) === '-') {
      // A bare value-taking flag consumes the NEXT token as its (detached)
      // value, so skip it — otherwise that value is miscounted as a positional.
      if (awaitingValueOption(optDesc, token)) i++;
      i++;
    } else {
      positionalIndex++;
      i++;
    }
  }
  // Nothing typed past the group yet (or the cursor sits at the group): the
  // default owns the position, so classify against it rather than listing ''.
  if (optDesc.commands && optDesc.commands['']) {
    commandPath.push('');
    optDesc = optDesc.commands[''].optDesc;
  }

  // Detached value: the prior token is a value-taking flag still awaiting its
  // value (`--config <cursor>` or `-c <cursor>`), so the cursor IS that value.
  const prev = prior.length ? prior[prior.length - 1] : '';
  const awaiting = awaitingValueOption(optDesc, prev);
  if (awaiting) {
    return {
      toComplete,
      optDesc,
      commandPath,
      expecting: 'optionValue',
      option: awaiting,
      optionToken: '', // detached: the value is its own token, no prefix
      valuePartial: toComplete,
    };
  }

  // `--name=<partial>`: past the flag name, now completing its VALUE. Only when
  // `name` is a known option that takes an argument.
  const eq = toComplete.match(/^--([\w-]+)=(.*)$/);
  if (eq) {
    const opt = (optDesc.options || {})[kebabToCamel(eq[1])];
    if (opt && opt.hasArg) {
      return {
        toComplete,
        optDesc,
        commandPath,
        expecting: 'optionValue',
        option: opt,
        optionToken: '--' + eq[1] + '=', // prefix to prepend to value candidates
        valuePartial: eq[2],
      };
    }
  }

  // `-c<partial>`: short option that takes a value (fncli accepts `-cval`),
  // completing that value attached to the flag. A bare `-c` is NOT a value
  // position — it falls through to the option branch and completes as the
  // token plus a space, so the value is then completed detached (uniform across
  // enumerated / { ext } / file handlers; the shell matches real paths, not
  // `-c*`).
  const shortEq = toComplete.match(/^-([A-Za-z0-9])(.+)$/);
  if (shortEq) {
    const opt = (optDesc.options || {})[shortEq[1]];
    if (opt && opt.hasArg) {
      return {
        toComplete,
        optDesc,
        commandPath,
        expecting: 'optionValue',
        option: opt,
        optionToken: '-' + shortEq[1],
        valuePartial: shortEq[2],
      };
    }
  }

  let expecting;
  let positional;
  if (toComplete[0] === '-') {
    expecting = 'option';
  } else if (optDesc.commands) {
    expecting = 'command';
  } else {
    expecting = 'positional';
    positional = positionalSlot(optDesc, positionalIndex);
  }

  return { toComplete, optDesc, commandPath, expecting, positionalIndex, positional };
}

// The positional descriptor at `index`, falling back to a trailing rest param
// (`...files`) once the fixed slots are exhausted.
function positionalSlot(optDesc, index) {
  const pos = optDesc.positional || [];
  if (pos[index]) return pos[index];
  const last = pos[pos.length - 1];
  return last && last.rest ? last : undefined;
}

function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, function (_, c) {
    return c.toUpperCase();
  });
}

// If `token` is a value-taking option with no value yet attached (bare `--name`
// or `-c`), return that option — the next token is its value. Otherwise null.
function awaitingValueOption(optDesc, token) {
  const options = optDesc.options || {};
  let m = token.match(/^--([\w-]+)$/);
  if (m) {
    const opt = options[kebabToCamel(m[1])];
    if (opt && opt.hasArg) return opt;
  }
  m = token.match(/^-([A-Za-z0-9])$/);
  if (m) {
    const opt = options[m[1]];
    if (opt && opt.hasArg) return opt;
  }
  return null;
}

// Seam B — parse-state -> shell-complete Reply (may be a Promise). Policy:
//   command      -> command names (candidates only)
//   option       -> long+short option tokens; `--name=` keeps the cursor (noSpace)
//   optionValue / positional -> registered handler, else undefined (shell files)
async function reply(state, config) {
  const optDesc = state.optDesc || {};
  const toComplete = state.toComplete || '';

  if (state.expecting === 'command') {
    const items = [];
    for (const name in optDesc.commands || {}) {
      const d = optDesc.commands[name].optDesc || {};
      // Skip the '' default (it has no name to type) and hidden commands (the
      // injected `completions`/`v1` wire surface).
      if (name === '' || d.hidden) continue;
      items.push({ value: name, description: summary(d.synopsis) });
    }
    return filterByPrefix(items, toComplete);
  }

  if (state.expecting === 'option') {
    return filterByPrefix(optionItems(optDesc, toComplete), toComplete);
  }

  if (state.expecting === 'optionValue' || state.expecting === 'positional') {
    const param = state.expecting === 'optionValue' ? state.option : state.positional;
    const handler = param && handlerFor(param, config);
    if (handler == null) return; // no handler -> shell's file completion
    const partial = state.expecting === 'optionValue' ? state.valuePartial : toComplete;
    const result = typeof handler === 'function' ? await handler(partial, state) : handler;
    return valueReply(result, state.optionToken || '', toComplete);
  }

  return; // anything we don't recognise: shell default
}

// A handler for a parameter: the value under the name the user wrote in the
// signature (long form) or its short form. Static Replies pass through as-is.
function handlerFor(param, config) {
  const map = (config && config.handlers) || {};
  if (param.alias != null && map[param.alias] !== undefined) return map[param.alias];
  return map[param.name];
}

// Lower a handler result to a Reply: prefix candidate values with the attached
// option token (`--name=` / `-c`) so they complete as whole words, and filter
// by what's typed. { ext } / { dirs } pass through untouched — they delegate
// to shell-native file completion (best with detached values / positionals;
// an attached `--name=` prefix isn't file-matchable).
function valueReply(result, prefix, toComplete) {
  if (result == null) return result; // no opinion -> shell files
  if (Array.isArray(result)) {
    return filterByPrefix(result.map((v) => prefixItem(v, prefix)), toComplete);
  }
  if (result.items) {
    const items = filterByPrefix(result.items.map((v) => prefixItem(v, prefix)), toComplete);
    return Object.assign({}, result, { items });
  }
  return result;
}

function prefixItem(item, prefix) {
  if (!prefix) return item;
  if (typeof item === 'string') return prefix + item;
  return Object.assign({}, item, { value: prefix + item.value });
}

// Keep only candidates whose value starts with the partial. Filtering in the
// program (rather than leaning on each shell) is fewer candidates over the wire
// and one consistent behaviour across bash/zsh/fish.
function filterByPrefix(items, prefix) {
  if (!prefix) return items;
  return items.filter((it) => (typeof it === 'string' ? it : it.value).indexOf(prefix) === 0);
}

// The option tokens for a descriptor: each distinct option contributes its long
// (`--kebab-case`) form; a short form contributes `-x`. opts.options is keyed by
// both name and alias pointing at one object, so dedupe by identity. Value
// options complete as `--name=` with noSpace so the cursor stays put for the
// value. Two deliberate rules: `--help` / its `-h` is never offered, and a long
// flag's `-x` alias is not listed at a bare `-<TAB>` — it would be noise beside
// the long form. That alias is still offered once the user reaches for it
// (`-x…`), so typing `-t<TAB>` completes to `-t ` and its value then completes
// detached. A short-ONLY option (no long form) always lists — it is the only
// way to name that option.
function optionItems(optDesc, toComplete) {
  // The user has reached for a short form: `-x…` (dash then an alnum).
  const reachingShort = /^-[A-Za-z0-9]/.test(toComplete || '');
  const items = [];
  const seen = new Set();
  for (const key in optDesc.options || {}) {
    const opt = optDesc.options[key];
    if (seen.has(opt)) continue;
    seen.add(opt);
    const ids = [opt.name, opt.alias].filter(Boolean);
    if (ids.some((id) => camelToKebab(id) === 'help')) continue; // don't complete --help
    const hasLong = ids.some((id) => id.length > 1);
    for (const id of ids) {
      if (id.length === 1) {
        // A long flag's short alias is suppressed until the user types `-x…`.
        if (hasLong && !reachingShort) continue;
        // short: value is `-c val` / `-cval`, no `=`
        items.push({ value: '-' + id, description: summary(opt.synopsis) });
      } else {
        items.push({
          value: '--' + camelToKebab(id) + (opt.hasArg ? '=' : ''),
          description: summary(opt.synopsis),
          noSpace: opt.hasArg || undefined,
        });
      }
    }
  }
  return items;
}

function camelToKebab(str) {
  return str.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

// Candidate descriptions ride a line-oriented wire format (value\tdescription,
// one per line), so a multi-line synopsis must be cut to its first line — the
// rest would otherwise be parsed by the stub as candidate values.
function summary(synopsis) {
  if (!synopsis) return undefined;
  const line = synopsis.split('\n', 1)[0].trim();
  return line || undefined;
}

module.exports = commands;
module.exports.commands = commands;
module.exports.REQUEST = REQUEST;
module.exports.decode = decode;
module.exports.reply = reply;
