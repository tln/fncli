const assert = require('assert');

describe('fncli', function () {
  let errs = [], result = null;
  function subject(fn, args) {
    let fncli = require('../index');
    let orig = console.error;
    errs = []; result = null;
    console.error = (e) => errs.push(e);
    try {
      fncli(fn, {argv: ['node', 'script.js'].concat(args)});
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
      // Should print the command on usage line
      assert(errs[0].match(/usage: script.js a/m), errs);
      // Should include the synopses
      assert(errs[0].match(/describe a/m), errs);
      assert(errs[0].match(/describe x/m), errs);
      assert(errs[0].match(/describe opt/m), errs);
      // Should show the short option
      assert(errs[0].match(/-o, --opt/m), errs);
      // Should show the rest parameter
      assert(errs[0].match(/\[z\.\.\.\]/m), errs);
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
});
