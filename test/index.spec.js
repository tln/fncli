const assert = require('assert');
describe('fncli', function () {
  let errs = [], outs = [], result = null;
  function subject(fn, args, config={}) {
    let fncli = require('../index');
    let origError = console.error, origLog = console.log;
    errs = []; outs = []; result = null;
    console.error = (e) => errs.push(e);
    console.log = (e) => outs.push(e);
    try {
      fncli(fn, {...config, argv: ['node', 'script.js'].concat(args)});
    } finally {
      console.error = origError;
      console.log = origLog;
    }
  }

  it('calls the function', function () {
    let x = 0, fn = () => x++
    subject(fn, []);
    assert(x === 1);
  });
  it('calls the function with args', function () {
    let x = 0, fn = (y) => x += +y;
    subject(fn, ['2']);
    assert(x === 2);
  });
  it('prints an error when arg is not passed', function () {
    let x = 0, fn = (y) => x += +y;
    subject(fn, []);
    assert(errs.length);
  });
  describe('parses arguments correctly', function () {
    let fn = (x, y=0, {flag=false, opt}, ...z) => result = {x, y, flag, opt, z};
    it('with min args', function () {
      subject(fn, ['x']);
      assert(errs.length === 0, errs);
      assert.deepEqual(result, {x:'x', y: 0, flag: false, opt: undefined, z: []});
    });

    it('with all args', function () {
      subject(fn, ['--flag', '--opt=1', 'x', 'y']);
      assert(errs.length === 0);
      assert.deepEqual(result, {x: 'x', y: 'y', flag: true, opt: '1', z: []});
    });

    it('with additional args', function () {
      subject(fn, ['--flag', '--opt=1', 'x', 'y', 'z', 'z2']);
      assert(errs.length === 0);
      assert.deepEqual(result, {x:'x', y: 'y', flag: true, opt: '1', z: ['z', 'z2']});
    });
  });
  describe('parses commands correctly', function () {
    let commands = {
      a(// describe a
        x, // describe x
        y=0,
        {
          f: flag=false,
          o: opt // describe opt
        },
        ...z
      ) {
        result = {x, y, flag, opt};
      },
      b() {
        result = 'b';
      }
    };

    it('with no args', function () {
      subject(commands, []);
      assert.ok(errs);
    });

    it('with min args', function () {
      subject(commands, ['a', 'x']);
      assert(errs.length === 0);
      assert.deepEqual(result, {x:'x', y: 0, flag: false, opt: undefined});
    });

    it('with short arg', function () {
      subject(commands, ['a', '-fo1', 'x']);
      assert(errs.length === 0);
      assert.deepEqual(result, {x:'x', y: 0, flag: true, opt: '1'});
    });

    it('with all args', function () {
      subject(commands, ['a', '--flag', '--opt=1', 'x', 'y']);
      assert(errs.length === 0);
      assert.deepEqual(result, {x:'x', y: 'y', flag: true, opt: '1'});
    });

    it('with missing args', function () {
      subject(commands, ['a']);
      assert.ok(errs);
      console.log('errs', errs);
      // Should print the command on usage line
      assert(errs[0].match(/usage: script.js a x/m), errs);
      // Should include command synopsis
      assert(errs[0].match(/describe a/m), errs);
      // Should show inline options (new format: long form with short alias)
      assert(/\[--flag\|-f\]/.test(errs[0]), errs);
      // Short option with an arg renders as `-o <value>` (a space, not `=`).
      assert(/\[--opt=<value>\|-o <value>\]/.test(errs[0]), errs);
      // Should show the rest parameter
      assert(errs[0].match(/\[z\.\.\.\]/m), errs);
    });
  });
  describe('parses nested sub-commands correctly', function () {
    let commands = {
      secrets: {
        add(envar, {doit=false}) {
          result = {command: 'secrets add', envar, doit};
        },
        deploy({doit=false, deploy=false}) {
          result = {command: 'secrets deploy', doit, deploy};
        }
      },
      status() {
        result = 'status';
      }
    };

    it('calls a nested command', function () {
      subject(commands, ['secrets', 'add', 'FOO', '--doit']);
      assert(errs.length === 0, errs);
      assert.deepEqual(result, {command: 'secrets add', envar: 'FOO', doit: true});
    });

    it('calls a sibling nested command', function () {
      subject(commands, ['secrets', 'deploy', '--deploy']);
      assert(errs.length === 0, errs);
      assert.deepEqual(result, {command: 'secrets deploy', doit: false, deploy: true});
    });

    it('still calls top-level commands', function () {
      subject(commands, ['status']);
      assert(errs.length === 0, errs);
      assert.equal(result, 'status');
    });

    it('shows sub-commands when group is given without a sub-command', function () {
      subject(commands, ['secrets']);
      assert(errs.length);
      // Usage line shows the group
      assert(errs[0].match(/usage: script.js secrets/m), errs);
      // Lists the group's own sub-commands (each prefixed with the group path)
      assert(errs[0].match(/^\s+secrets add\b/m), errs);
      assert(errs[0].match(/^\s+secrets deploy\b/m), errs);
    });

    it('shows the full command path on usage errors', function () {
      subject(commands, ['secrets', 'add']);
      assert(errs.length);
      assert(errs[0].match(/usage: script.js secrets add/m), errs);
    });

    it('gives error on unknown sub-command', function () {
      subject(commands, ['secrets', 'nope']);
      assert(errs.length);
      assert(errs[0].match(/Command not found/m), errs);
    });

    it('an unknown sub-command shows the group usage, not a doubled prefix', function () {
      // Regression: a failed lookup inside `secrets` must keep `secrets` as the
      // resolved command, so usage lists `secrets add`/`secrets deploy` — not
      // the top level reprinted with a stray `secrets ` (which doubled the
      // group to `secrets secrets add`).
      subject(commands, ['secrets', 'nope']);
      const out = errs.join('\n');
      assert(/usage: script.js secrets/.test(out), out);
      assert(/^\s+secrets add\b/m.test(out), out);
      assert(!/secrets secrets/.test(out), out);
      // The sibling top-level command is not relisted under `secrets`.
      assert(!/secrets status\b/.test(out), out);
    });
  });
  describe('HIDE commands', function () {
    let commands = {
      visible() { result = 'visible'; },
      secret(// HIDE
        x) { result = {secret: x}; },
    };
    it('a HIDE command still dispatches when named', function () {
      subject(commands, ['secret', 'v']);
      assert(errs.length === 0, errs);
      assert.deepEqual(result, {secret: 'v'});
    });
    it('a HIDE command is not listed in usage', function () {
      subject(commands, []);
      assert(errs.length, 'expected a usage error');
      assert(/^\s+visible\b/m.test(errs.join('\n')), errs);
      assert(!/\bsecret\b/.test(errs.join('\n')), errs);
    });
  });
  describe('group synopsis', function () {
    let commands = {
      synopsis: 'Tool for doing things.',
      sub: {
        synopsis: 'Nested group synopsis.',
        a() {}
      },
      b() {}
    };
    it('shows the top-level synopsis and does not list it as a command', function () {
      subject(commands, []);
      assert(errs[0].match(/Tool for doing things\./), errs);
      assert(!errs[0].match(/^\s+synopsis\b/m), errs);
    });
    it('shows a nested group synopsis when the group is the target', function () {
      subject(commands, ['sub']);
      assert(errs[0].match(/Nested group synopsis\./), errs);
    });
  });
  describe('handles camelCase <=> kebab case correctly', function () {
    let fn = (theParam, {theOption, O=false}) => result = [theParam, theOption, O];
    it('parses camelCase option', function () {
      subject(fn, ['1', '--theOption=2']);
      assert(errs.length === 0);
      assert.deepEqual(result, ['1', '2', false]);
    });
    it('parses kebab-case option', function () {
      subject(fn, ['1', '--the-option=2']);
      assert(errs.length === 0);
      assert.deepEqual(result, ['1', '2', false]);
    });
    it('parses single-letter uppercase options', function () {
      subject(fn, ['1', '-O']);
      assert(errs.length === 0);
      assert.deepEqual(result, ['1', undefined, true]);
    });
    it('does not change single-letter uppercase options to lowercase', function () {
      subject(fn, ['1', '-o']);
      assert(errs.length > 0);
    });
    it('shows kebab-case options in usage', function () {
      subject(fn, []);
      assert(errs.length > 0, 'no errors');
      assert(errs[0].match(/the-option/), '/the-option/');
      assert(errs[0].match(/the-param/), '/the-param/');
      assert(errs[0].match(/-O/), '/-O/');
      assert(!errs[0].match(/theParam/), '/theParam/');
      assert(!errs[0].match(/theOption/), '/theOption/');
      assert(!errs[0].match(/\b-o\b/), '/-o/');
    });
  });
  describe('adds a help option', function () {
    it('does not advertise --help in the usage text', function () {
      // help is available but intentionally not listed (it would be noise).
      let x = 0, fn = (y) => x += +y;
      subject(fn, [], {help: true});
      assert(errs.length, 'expected a usage error');
      assert(!/--help/.test(errs.join('\n')), errs);
    });
    it('shows help when --help is passed', function () {
      let fn = (y='1') => {};
      subject(fn, ['--help'], {help: true});
      // --help prints the usage (no error prefix), including the params.
      assert(/^usage:/.test(outs.join('\n')), outs);
      assert(/\[y\]/.test(outs.join('\n')), outs);
    });
    it('prints help to stdout, not stderr', function () {
      let fn = (y='1') => {};
      subject(fn, ['--help'], {help: true});
      assert(outs.length, 'expected help on stdout');
      assert(errs.length === 0, errs);
    });
    it('does not chide user --help is passed', function () {
      // ie, the usage starts with usage:
      let x = 0, fn = (y) => x += +y;
      subject(fn, ['--help'], {help: true});
      assert(outs.join('\n').startsWith('usage: '), outs);
    });
    it('shows the subcommand options when appropriate', function () {
      let commands = {subcommand({x=true}) {}, b() {}};
      subject(commands, ['--help', 'subcommand'], {help: true});
      assert(outs.join('\n').match(/^usage: .* subcommand/), outs);
    });
    it('recognizes --help after a sub-command', function () {
      let commands = {subcommand(required, {x=true}) {}, b() {}};
      subject(commands, ['subcommand', '--help'], {help: true});
      assert(errs.length === 0, errs);
      assert(outs.join('\n').match(/^usage: .* subcommand/), outs);
      assert(!/error:/.test(outs.join('\n')), outs);
    });
    it('shows full descriptions under --help instead of snipping', function () {
      let fn = (
        y // A very long description that goes well past the snipping width so it would normally be cut off with a marker
      ) => {};
      subject(fn, [], {help: true});
      assert(/\[\.\.\.\]/.test(errs.join('\n')), errs);
      subject(fn, ['--help', 'y'], {help: true});
      let help = outs.join('\n');
      assert(!/\[\.\.\.\]/.test(help), help);
      // Long text wraps onto a continuation line rather than being cut.
      assert(/normally be cut/.test(help), help);
      // Full output is already complete, so --help is not listed.
      assert(!/--help/.test(help), help);
    });
    it('does not advertise --help for an [options] collapse alone', function () {
      // The inline options overflow and collapse, but every option is still
      // listed below — nothing is hidden, so no --help row.
      let fn = (required, {alpha, bravo, charlie, delta, echo}) => {};
      subject(fn, [], {help: true});
      let err = errs.join('\n');
      assert(/\[options\]/.test(err), err);
      assert(/--echo/.test(err), err);
      assert(!/Display more help/.test(err), err);
    });
    it('keeps the commands listing trimmed under --help', function () {
      let commands = {
        long( // This command synopsis is extremely long and rambles on far far beyond the configured synopsis width so it must be snipped in listings
          x) {},
        b() {}
      };
      subject(commands, ['--help'], {help: true});
      let help = outs.join('\n');
      assert(/\[\.\.\.\]/.test(help), help);
      // The trimmed command lists --help among its own options; the
      // untrimmed sibling does not.
      assert(/--help\s+Display more help/.test(help), help);
      assert(help.indexOf('Display more help') > help.indexOf('long'), help);
      assert(!/b[\s\S]*Display more help[\s\S]*$/.test(help.slice(help.indexOf('\n  b'))), help);
      // The full text still shows when that command is the target.
      subject(commands, ['--help', 'long'], {help: true});
      help = outs.join('\n');
      assert(!/\[\.\.\.\]/.test(help), help);
      assert(/snipped in listings/.test(help), help);
    });
    it('preserves preformatted indentation under --help', function () {
      let fn = (
        y /* Prose explaining the file format,
             which continues on a second line.

               example: value
               - item */
      ) => {};
      subject(fn, ['--help', 'x'], {help: true});
      let help = outs.join('\n');
      // Blank line and the example's relative indent survive.
      assert(/\n(\s+)example: value\n\1- item/.test(help), help);
      const exampleIndent = help.match(/\n(\s*)example: value/)[1].length;
      const proseIndent = help.match(/\n(\s*)which continues/)[1].length;
      assert(exampleIndent > proseIndent, help);
    });
  });

  describe('adds a version option', function () {
    it('prints the version to stdout', function () {
      let x = 0, fn = () => x++;
      subject(fn, ['--version'], {version: '1.2.3'});
      assert.equal(outs.join('\n'), 'script.js version 1.2.3');
      assert(errs.length === 0, errs);
      assert(x === 0, 'handler should not run');
    });
    it('is absent unless a version is configured', function () {
      let fn = () => {};
      subject(fn, ['--version']);
      assert(/Unknown option/.test(errs.join('\n')), errs);
    });
    it('answers even when required args are missing', function () {
      let fn = (required) => {};
      subject(fn, ['--version'], {version: '1.2.3'});
      assert.equal(outs.join('\n'), 'script.js version 1.2.3');
      assert(errs.length === 0, errs);
    });
    it('wins over --help', function () {
      let fn = () => {};
      subject(fn, ['--help', '--version'], {version: '1.2.3'});
      assert.equal(outs.join('\n'), 'script.js version 1.2.3');
    });
    it('works after a sub-command', function () {
      let commands = {sub(x) {}, b() {}};
      subject(commands, ['sub', '--version'], {version: '1.2.3'});
      assert.equal(outs.join('\n'), 'script.js version 1.2.3');
      assert(errs.length === 0, errs);
    });
    it('answers after an unknown command, at any nesting level', function () {
      let commands = {sql: {run(q) {}}, status() {}};
      subject(commands, ['nosuch', '--version'], {version: '1.2.3'});
      assert.equal(outs.join('\n'), 'script.js version 1.2.3');
      subject(commands, ['sql', 'nosuch', '--version'], {version: '1.2.3'});
      assert.equal(outs.join('\n'), 'script.js version 1.2.3');
      assert(errs.length === 0, errs);
    });
    it('does not add -V', function () {
      let fn = () => {};
      subject(fn, ['-V'], {version: '1.2.3'});
      assert(/Unknown option/.test(errs.join('\n')), errs);
    });
    it('leaves a user-defined version option alone', function () {
      let fn = ({version}) => result = version;
      subject(fn, ['--version=mine'], {version: '1.2.3'});
      assert.equal(result, 'mine');
      assert(outs.length === 0, outs);
    });
    it('is not advertised in the usage text', function () {
      let fn = (y) => {};
      subject(fn, [], {version: '1.2.3'});
      assert(errs.length, 'expected a usage error');
      assert(!/--version/.test(errs.join('\n')), errs);
    });
    it('closes full help with a version: section, but not error usage', function () {
      let fn = (y='1') => {};
      subject(fn, ['--help'], {version: '1.2.3'});
      assert(/\n\nversion:\n  1\.2\.3\n$/.test(outs.join('\n')), outs);
      subject(fn, ['a', 'b'], {version: '1.2.3'});
      assert(errs.length, 'expected a usage error');
      assert(!/1\.2\.3/.test(errs.join('\n')), errs);
    });
  });

  describe('short option rendering', function () {
    it('renders a short option arg as "-o <value>", not "-o=<value>"', function () {
      // The `=` form is a long-option convention; the parser keeps the `=` as
      // part of the value for short options, so the help must not advertise it.
      let fn = (required, {o: out}) => {};
      subject(fn, []);
      let err = errs.join('\n');
      assert(/-o <value>/.test(err), err);
      assert(!/-o=<value>/.test(err), err);
    });
  });

  describe('getHandler', function () {
    it('throws a descriptive error when a command path is not a function', function () {
      let {getHandler} = require('../index');
      assert.throws(() => getHandler({a: {}}, ['a']), /invalid type: object/);
    });
  });

  describe('handler validation', function () {
    it('treats a returned "error: ..." string as a usage error', function () {
      let fn = (...files) => files.length === 0 ? 'error: pass at least one file' : null;
      subject(fn, []);
      assert(errs.length, 'expected an error to be printed');
      assert(/error: pass at least one file/.test(errs.join('\n')), errs);
      assert(/usage:/.test(errs.join('\n')), errs);
    });
    it('ignores returned strings that do not start with "error:"', function () {
      let fn = () => 'all good';
      subject(fn, []);
      assert(errs.length === 0, errs);
    });
  });

  describe('processes process.argv', function () {
    it('runs the command successfully', function () {
      let fncli = require('../index');
      process.argv = ['node', 'script.js', 'x'];
      let result;
      fncli(x => result = x);
      assert(result === 'x');
    });
  });

  describe('exit codes', function () {
    let exitCode = null;
    function subjectWithExitCode(fn, args, config={}) {
      let fncli = require('../index');
      let orig = console.error;
      errs = [];
      exitCode = null;
      process.exitCode = undefined;
      console.error = (e) => errs.push(e);
      try {
        fncli(fn, {...config, argv: ['node', 'script.js'].concat(args)});
      } finally {
        console.error = orig;
        exitCode = process.exitCode;
      }
    }

    it('exits with code 2 on usage error', function () {
      let fn = (required) => {};
      subjectWithExitCode(fn, []);
      assert.equal(exitCode, 2, 'expected exit code 2 for usage error');
    });

    it('exits with code 1 on returned error', function () {
      let fn = () => 'error: validation failed';
      subjectWithExitCode(fn, []);
      assert.equal(exitCode, 1, 'expected exit code 1 for returned error');
    });

    it('exits with code 1 on thrown error', function () {
      let fn = () => { throw 'error: handler failed'; };
      subjectWithExitCode(fn, []);
      assert.equal(exitCode, 1, 'expected exit code 1 for thrown error');
    });

    it('does not set exit code on success', function () {
      let fn = () => {};
      subjectWithExitCode(fn, []);
      assert.equal(exitCode, undefined, 'expected no exit code on success');
    });
  });

});
