const assert = require('assert');
describe('fncli', function () {
  let errs = [], result = null;
  function subject(fn, args, config={}) {
    let fncli = require('../index');
    let orig = console.error;
    errs = []; result = null;
    console.error = (e) => errs.push(e);
    try {
      fncli(fn, {...config, argv: ['node', 'script.js'].concat(args)});
    } finally {
      console.error = orig;
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
      assert(/\[--opt=<value>\|-o=<value>\]/.test(errs[0]), errs);
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
      assert(/^usage:/.test(errs.join('\n')), errs);
      assert(/\[y\]/.test(errs.join('\n')), errs);
    });
    it('does not chide user --help is passed', function () {
      // ie, the usage starts with usage:
      let x = 0, fn = (y) => x += +y;
      subject(fn, ['--help'], {help: true});
      assert(errs.join('\n').startsWith('usage: '), errs);
    });
    it('shows the subcommand options when appropriate', function () {
      let commands = {subcommand({x=true}) {}, b() {}};
      subject(commands, ['--help', 'subcommand'], {help: true});
      assert(errs.join('\n').match(/^usage: .* subcommand/), errs);
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
