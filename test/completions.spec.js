const assert = require('assert');
const fncli = require('../index');
const parseSignature = require('../parseSignature');
const completions = require('../completions');
const { decode, reply } = completions;

// Built-in shell completion (completions.js), on by default under the
// reserved `completions` command:
//   completions [shell]                        print the stub
//   completions install [shell]                write it to the autoload dir
//   completions v1 -- <proto> <word...> <cur>  per-TAB runtime
// Two seams: decode (cursor -> parse-state) and reply (parse-state ->
// shell-complete Reply), then the fncli-level routing.

const commands = {
  main(file) {},
  config({ c: config = '' }) {},
};
const opts = parseSignature(commands);

function sink() {
  const chunks = [];
  return { write: (s) => chunks.push(s), text: () => chunks.join('') };
}

describe('completions decode', function () {
  it('at the top level, the cursor completes a command', function () {
    const state = decode([], '', opts);
    assert.strictEqual(state.expecting, 'command');
    assert.deepStrictEqual(state.commandPath, []);
    assert.strictEqual(state.toComplete, '');
    assert.strictEqual(state.optDesc, opts);
  });

  it('a partial first token still completes a command', function () {
    const state = decode([], 'co', opts);
    assert.strictEqual(state.expecting, 'command');
    assert.strictEqual(state.toComplete, 'co');
    assert.deepStrictEqual(state.commandPath, []);
  });

  it('a dash token after a command completes an option', function () {
    const state = decode(['config'], '--', opts);
    assert.strictEqual(state.expecting, 'option');
    assert.strictEqual(state.toComplete, '--');
    assert.deepStrictEqual(state.commandPath, ['config']);
    assert.strictEqual(state.optDesc, opts.commands.config.optDesc);
  });

  it('a plain token after a command completes a positional', function () {
    const state = decode(['main'], '', opts);
    assert.strictEqual(state.expecting, 'positional');
    assert.deepStrictEqual(state.commandPath, ['main']);
    assert.strictEqual(state.optDesc, opts.commands.main.optDesc);
  });

  it('`--name=<val>` completes the option value, not the flag name', function () {
    const state = decode(['config'], '--config=de', opts);
    assert.strictEqual(state.expecting, 'optionValue');
    assert.strictEqual(state.valuePartial, 'de');
    assert.strictEqual(state.optionToken, '--config=');
    assert.strictEqual(state.option.hasArg, true);
  });

  it('`-c<val>` (short option taking a value) completes the value', function () {
    const state = decode(['config'], '-cde', opts);
    assert.strictEqual(state.expecting, 'optionValue');
    assert.strictEqual(state.optionToken, '-c');
    assert.strictEqual(state.valuePartial, 'de');
    assert.strictEqual(state.option.hasArg, true);
  });

  it('a bare `-c` completes as the option token, not an attached value', function () {
    // Short values are detached (`-c val`): complete `-c` itself (plus the
    // space), never fall to a file completion matching `-c*`.
    const state = decode(['config'], '-c', opts);
    assert.strictEqual(state.expecting, 'option');
    assert.strictEqual(state.toComplete, '-c');
  });

  it('`--name <val>` (detached) completes the option value', function () {
    const state = decode(['config', '--config'], 'de', opts);
    assert.strictEqual(state.expecting, 'optionValue');
    assert.strictEqual(state.optionToken, ''); // detached: the value is its own token
    assert.strictEqual(state.valuePartial, 'de');
    assert.strictEqual(state.option.hasArg, true);
  });

  it('`-c <val>` (detached short) completes the option value', function () {
    const state = decode(['config', '-c'], 'de', opts);
    assert.strictEqual(state.expecting, 'optionValue');
    assert.strictEqual(state.optionToken, '');
    assert.strictEqual(state.valuePartial, 'de');
  });

  it('a positional resolves its slot (for value handlers)', function () {
    const state = decode(['main'], 'a', opts);
    assert.strictEqual(state.expecting, 'positional');
    assert.strictEqual(state.positionalIndex, 0);
    assert.strictEqual(state.positional.name, 'file');
  });

  it('a detached option value is not miscounted as a positional', function () {
    // serve has a value option (--port) and a positional (host)
    const o = parseSignature({ serve(host, { p: port = '' }) {} });
    // `serve --port 8080 <cursor>` -> the cursor is host (index 0), not index 1
    const state = decode(['serve', '--port', '8080'], '', o);
    assert.strictEqual(state.expecting, 'positional');
    assert.strictEqual(state.positionalIndex, 0);
    assert.strictEqual(state.positional.name, 'host');
  });
});

describe('completions reply', function () {
  it('command position -> command name candidates', async function () {
    const r = await reply({ expecting: 'command', optDesc: opts }, {});
    assert.ok(Array.isArray(r), 'candidates only (no file fallback)');
    assert.deepStrictEqual(r.map((i) => i.value).sort(), ['config', 'main']);
  });

  it('option position -> long (with =, it takes a value) and short tokens', async function () {
    const r = await reply({ expecting: 'option', optDesc: opts.commands.config.optDesc }, {});
    assert.deepStrictEqual(r.map((i) => i.value).sort(), ['--config=', '-c']);
  });

  it('a value option completes as `--name=` with noSpace', async function () {
    const state = { expecting: 'option', optDesc: opts.commands.config.optDesc, toComplete: '--con' };
    const r = await reply(state, {});
    assert.deepStrictEqual(r.map((i) => i.value), ['--config=']);
    assert.strictEqual(r[0].noSpace, true, 'noSpace so the cursor stays after =');
  });

  it('a boolean flag completes bare (no =, no noSpace)', async function () {
    const flagOpts = parseSignature(function ({ v: verbose = false }) {});
    const r = await reply({ expecting: 'option', optDesc: flagOpts, toComplete: '--v' }, {});
    assert.deepStrictEqual(r.map((i) => i.value), ['--verbose']);
    assert.ok(!r[0].noSpace);
  });

  it('positional without a handler -> no opinion (shell completes files)', async function () {
    const r = await reply({ expecting: 'positional', optDesc: opts.commands.main.optDesc }, {});
    assert.strictEqual(r, undefined);
  });

  it('optionValue without a handler -> no opinion (shell completes files)', async function () {
    const state = {
      expecting: 'optionValue',
      option: opts.commands.config.optDesc.options.config,
      optionToken: '--config=',
      valuePartial: '',
      toComplete: '--config=',
    };
    const r = await reply(state, {});
    assert.strictEqual(r, undefined);
  });

  it('filters command candidates by the toComplete prefix', async function () {
    const r = await reply({ expecting: 'command', optDesc: opts, toComplete: 'co' }, {});
    assert.deepStrictEqual(r.map((i) => i.value), ['config']);
  });

  it('filters option candidates by the toComplete prefix', async function () {
    const state = { expecting: 'option', optDesc: opts.commands.config.optDesc, toComplete: '--c' };
    const r = await reply(state, {});
    assert.deepStrictEqual(r.map((i) => i.value), ['--config=']);
  });

  it('a function handler offers `--name=<value>` tokens', async function () {
    const state = {
      expecting: 'optionValue',
      option: opts.commands.config.optDesc.options.config,
      optionToken: '--config=',
      valuePartial: 'de',
      toComplete: '--config=de',
    };
    const cfg = { handlers: { config: () => ['dev', 'prod', 'debug'] } };
    const r = await reply(state, cfg);
    assert.deepStrictEqual(r, ['--config=dev', '--config=debug']);
  });

  it('a static array handler works like a function returning it', async function () {
    const state = {
      expecting: 'optionValue',
      option: opts.commands.config.optDesc.options.config,
      optionToken: '--config=',
      valuePartial: 'p',
      toComplete: '--config=p',
    };
    const cfg = { handlers: { config: ['dev', 'prod', 'staging'] } };
    const r = await reply(state, cfg);
    assert.deepStrictEqual(r, ['--config=prod']);
  });

  it('a static { ext } handler passes through to shell file completion', async function () {
    const state = { expecting: 'positional', positional: { name: 'file' }, toComplete: '' };
    const cfg = { handlers: { file: { ext: ['md'] } } };
    const r = await reply(state, cfg);
    assert.deepStrictEqual(r, { ext: ['md'] });
  });

  it('a positional with a handler offers its values', async function () {
    const state = { expecting: 'positional', positional: { name: 'file' }, toComplete: 'a' };
    const cfg = { handlers: { file: (p) => [p + '1', p + '2'] } };
    const r = await reply(state, cfg);
    assert.deepStrictEqual(r, ['a1', 'a2']);
  });

  it('awaits an async handler', async function () {
    const state = { expecting: 'positional', positional: { name: 'file' }, toComplete: 'a' };
    const cfg = { handlers: { file: async (p) => [p + 'x', p + 'y'] } };
    const r = await reply(state, cfg);
    assert.deepStrictEqual(r, ['ax', 'ay']);
  });

  it('cuts a multi-line synopsis to its first line (wire is line-oriented)', async function () {
    // A raw newline in a description would be parsed by the stub as extra
    // candidate lines (seen with real multi-line // comments).
    const o = {
      commands: {
        read: { optDesc: { synopsis: 'Fetch a thread.\nTarget: archive URL or ref name.' } },
      },
    };
    const r = await reply({ expecting: 'command', optDesc: o }, {});
    assert.deepStrictEqual(r, [{ value: 'read', description: 'Fetch a thread.' }]);
  });
});

describe('fncli completions command', function () {
  it('is on by default: `completions script bash` prints the stub, the command does not run', async function () {
    let ran = false;
    const out = sink();
    await fncli({ main(file) { ran = true; }, config({ c: config = '' }) {} }, {
      argv: ['node', 'demo.js', 'completions', 'script', 'bash'],
      completions: { out },
    });
    assert.strictEqual(ran, false, 'the real command must not run');
    assert.ok(/complete\b[^\n]* -F \S+ demo\b/.test(out.text()), 'registers bash completion for `demo`');
    assert.ok(/demo completions v1 --/.test(out.text()), 'stub calls back into `demo completions v1 --`');
  });

  it('works with zero config (stub goes to stdout)', async function () {
    const orig = process.stdout.write;
    let text = '';
    process.stdout.write = (s) => ((text += s), true);
    try {
      await fncli(commands, { argv: ['node', 'demo.js', 'completions', 'script', 'bash'] });
    } finally {
      process.stdout.write = orig;
    }
    assert.ok(/demo completions v1 --/.test(text));
  });

  it('bare `completions` shows help, not a stub', async function () {
    const out = sink();
    await fncli(commands, {
      argv: ['node', 'demo.js', 'completions'],
      completions: { out },
    });
    assert.ok(/usage: demo completions install\|script \[shell\]/.test(out.text()));
    assert.ok(/eval "\$\(demo completions script bash\)"/.test(out.text()));
    assert.ok(!/complete -F/.test(out.text()), 'no stub in the help output');
  });

  it('runtime: `completions v1 -- <proto> <words>` answers on the wire', async function () {
    const out = sink();
    await fncli(commands, {
      argv: ['node', 'demo.js', 'completions', 'v1', '--', 'bash/1', ''],
      completions: { out },
    });
    assert.strictEqual(out.text(), 'NODEFAULT\nmain\nconfig\n');
  });

  it('runtime: a static handler completes an option value end to end', async function () {
    const out = sink();
    await fncli(commands, {
      argv: ['node', 'demo.js', 'completions', 'v1', '--', 'bash/1', 'config', '--config=d'],
      completions: { out, handlers: { config: ['dev', 'prod', 'staging'] } },
    });
    assert.strictEqual(out.text(), 'NODEFAULT\n--config=dev\n');
  });

  it('runtime: an { ext } handler answers with shell-native file filtering', async function () {
    const out = sink();
    await fncli(commands, {
      argv: ['node', 'demo.js', 'completions', 'v1', '--', 'bash/1', 'main', ''],
      completions: { out, handlers: { file: { ext: ['md'] } } },
    });
    assert.strictEqual(out.text(), 'EXT\nmd\n');
  });

  it('runtime: tolerates a missing shell stamp (hand-testing the wire)', async function () {
    const out = sink();
    await fncli(commands, {
      argv: ['node', 'demo.js', 'completions', 'v1', '--', 'config', '--config=d'],
      completions: { out, handlers: { config: ['dev', 'prod'] } },
    });
    assert.strictEqual(out.text(), 'NODEFAULT\n--config=dev\n');
  });

  it('completes its own surface: `completions <TAB>` offers install|script', async function () {
    const out = sink();
    await fncli(commands, {
      argv: ['node', 'demo.js', 'completions', 'v1', '--', 'bash/1', 'completions', ''],
      completions: { out },
    });
    assert.strictEqual(out.text(), 'NODEFAULT\ninstall\nscript\n');
  });

  it('completes its own surface: `completions script <TAB>` offers shells', async function () {
    const out = sink();
    await fncli(commands, {
      argv: ['node', 'demo.js', 'completions', 'v1', '--', 'bash/1', 'completions', 'script', ''],
      completions: { out },
    });
    assert.strictEqual(out.text(), 'NODEFAULT\nbash\nfish\nzsh\n');
  });

  it('completions: false frees the name; the command runs normally', async function () {
    let arg = null;
    await fncli((name) => { arg = name; }, {
      argv: ['node', 'demo.js', 'completions'],
      completions: false,
    });
    assert.strictEqual(arg, 'completions');
  });

  it('does not intercept a normal invocation; the command runs', async function () {
    let ran = false;
    await fncli(function main() { ran = true; }, { argv: ['node', 'script.js'] });
    assert.strictEqual(ran, true);
  });
});
