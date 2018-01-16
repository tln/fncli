const assert = require('assert');

describe('optDescFromSignature', function () {
  var fncli;
  beforeEach(function () {
    fncli = require('../index');
  });
  it('simple function', function () {
    let result = fncli.optDescFromSignature((x, y)=>0);
    assert.deepEqual(result, {
      synopsis: null,
      optionParamIndex: null,
      options: {},
      positional: [{name: 'x', rest: false, required: true, synopsis: null}, {name: 'y', rest: false, required: true, synopsis: null}]
    });
  });
  it('an optional arg', function () {
    let result = fncli.optDescFromSignature((port=0)=>0);
    assert.deepEqual(result, {
      synopsis: null,
      optionParamIndex: null,
      options: {},
      positional: [{name: 'port', rest: false, required: false, synopsis: null}]
    });
  });
  it('single option', function () {
    let result = fncli.optDescFromSignature(({port})=>0);
    assert.deepEqual(result, {
      synopsis: null,
      optionParamIndex: 0,
      options: {port: {name: 'port', hasArg: true, synopsis: null}},
      positional: []
    });
  });
  it('flag option', function () {
    let result = fncli.optDescFromSignature(({verbose=false})=>0);
    assert.deepEqual(result, {
      synopsis: null,
      optionParamIndex: 0,
      options: {verbose: {name: 'verbose', hasArg: false, synopsis: null}},
      positional: []
    });
  });
  it('kitchen sink', function () {
    let result = fncli.optDescFromSignature((host, port=0, {verbose=false, module})=>0);
    assert.deepEqual(result, {
      synopsis: null,
      optionParamIndex: 2,
      options: {
        verbose: {name: 'verbose', hasArg: false, synopsis: null},
        module: {name: 'module', hasArg: true, synopsis: null}
      },
      positional: [{name: 'host', rest: false, required: true, synopsis: null}, {name: 'port', rest: false, required: false, synopsis: null}]
    });
  });
  it('synopsis', function () {
    let result = fncli.optDescFromSignature(
      (/* synopsis */
        host, // describe host
        port=0, // describe port
        {
          verbose=false, // describe verbose
          module // describe module
        }
      )=>0);
    assert.deepEqual(result, {
      synopsis: 'synopsis',
      optionParamIndex: 2,
      options: {
        verbose: {name: 'verbose', hasArg: false, synopsis: 'describe verbose'},
        module: {name: 'module', hasArg: true, synopsis: 'describe module'}
      },
      positional: [
        {name: 'host', rest: false, required: true, synopsis: 'describe host'},
        {name: 'port', rest: false, required: false, synopsis: 'describe port'}
      ]
    });
  });
  it('option aliases', function () {
    let result = fncli.optDescFromSignature(({m: module,
      v: verbose=false
    })=>0);
    assert.deepEqual(result, {
      synopsis: null,
      optionParamIndex: 0,
      options: {
        verbose: {name: 'v', alias: 'verbose', hasArg: false, synopsis: null},
        v: {name: 'v', alias: 'verbose', hasArg: false, synopsis: null},
        module: {name: 'm', alias: 'module', hasArg: true, synopsis: null},
        m: {name: 'm', alias: 'module', hasArg: true, synopsis: null},
      },
      positional: []
    });
  });
  it('rest param', function () {
    let result = fncli.optDescFromSignature((...x)=>0);
    assert.deepEqual(result, {
      synopsis: null,
      optionParamIndex: null,
      options: {},
      positional: [{name: 'x', rest: false, required: false, rest: true, synopsis: null}]
    });
  });
});

describe('optDescFromCommands', function () {
  var fncli;
  beforeEach(function () {
    fncli = require('../index');
  });
  it('simple functions', function () {
    let result = fncli.optDescFromCommands({
      a(x, y) {},
      b(host, port=0, {verbose=false, module}) {}
    });
    assert.deepEqual(result, {
      optionParamIndex: null,
      options: {},
      positional: [{name: 'command', required: true}],
      commands: {
        a: {
          name: 'a',
          optDesc: {
            synopsis: null,
            optionParamIndex: null,
            options: {},
            positional: [{name: 'x', rest: false, required: true, synopsis: null}, {name: 'y', rest: false, required: true, synopsis: null}]
          }
        },
        b: {
          name: 'b',
          optDesc: {
            synopsis: null,
            optionParamIndex: 2,
            options: {
              verbose: {name: 'verbose', hasArg: false, synopsis: null},
              module: {name: 'module', hasArg: true, synopsis: null}
            },
            positional: [{name: 'host', rest: false, required: true, synopsis: null}, {name: 'port', rest: false, required: false, synopsis: null}]
          }
        }
      }
    });
  });
});

describe('decodeArgs', function () {
  var fncli, opts;
  beforeEach(function () {
    fncli = require('../index');
    opts = {
      optionParamIndex: 2,
      options: {
        verbose: {name: 'verbose', hasArg: false},
        module: {name: 'module', hasArg: true},
      },
      positional: [{name: 'host', rest: false, required: true}, {name: 'port', rest: false, required: false}]
    };
  });
  it('gives error with no args', function () {
    let result = fncli.decodeArgs(opts, []);
    assert.ok(result.error);
  });
  it('gives error with unknown options', function () {
    let result = fncli.decodeArgs(opts, ['--foo']);
    assert.ok(result.error);
  });
  it('parses 1 arg', function () {
    let result = fncli.decodeArgs(opts, ['x']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {}]);
    assert.deepEqual(result.values, {host: 'x'});
    assert.deepEqual(result.optionValues, {});
  });
  it('parses 2 args', function () {
    let result = fncli.decodeArgs(opts, ['x', 'y']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', 'y', {}]);
    assert.deepEqual(result.values, {host: 'x', port: 'y'});
    assert.deepEqual(result.optionValues, {});
  });
  it('gives error with 3 args', function () {
    let result = fncli.decodeArgs(opts, ['x', 'y', 'z']);
    assert.ok(result.error);
  });
  it('parses an option', function () {
    let result = fncli.decodeArgs(opts, ['--verbose', 'x']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {verbose: true}]);
    assert.deepEqual(result.values, {host: 'x', verbose: true});
    assert.deepEqual(result.optionValues, {verbose: true});
  });
  it('parses an option after args', function () {
    let result = fncli.decodeArgs(opts, ['x', '--verbose']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {verbose: true}]);
    assert.deepEqual(result.values, {host: 'x', verbose: true});
    assert.deepEqual(result.optionValues, {verbose: true});
  });
  it('parses an option followed by value', function () {
    let result = fncli.decodeArgs(opts, ['--module', 'fncli', 'x']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {module: 'fncli'}]);
    assert.deepEqual(result.values, {host: 'x', module: 'fncli'});
    assert.deepEqual(result.optionValues, {module: 'fncli'});
  });
  it('parses an option=value', function () {
    let result = fncli.decodeArgs(opts, ['--module=fncli', 'x']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {module: 'fncli'}]);
    assert.deepEqual(result.values, {host: 'x', module: 'fncli'});
    assert.deepEqual(result.optionValues, {module: 'fncli'});
  });
  it('parses an option followed by value after args', function () {
    let result = fncli.decodeArgs(opts, ['x', '--module', 'fncli']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {module: 'fncli'}]);
    assert.deepEqual(result.values, {host: 'x', module: 'fncli'});
    assert.deepEqual(result.optionValues, {module: 'fncli'});
  });
  it('parses an option=value after args', function () {
    let result = fncli.decodeArgs(opts, ['x', '--module=fncli']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {module: 'fncli'}]);
    assert.deepEqual(result.values, {host: 'x', module: 'fncli'});
    assert.deepEqual(result.optionValues, {module: 'fncli'});
  });
  describe('short options', function () {
    beforeEach(function () {
      opts = {
        optionParamIndex: 2,
        options: {
          v: {name: 'v', hasArg: false},
          m: {name: 'm', hasArg: true},
        },
        positional: [{name: 'host', rest: false, required: true}, {name: 'port', rest: false, required: false}]
      };
    });
    it('parses an option', function () {
      let result = fncli.decodeArgs(opts, ['-v', 'x']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['x', undefined, {v: true}]);
      assert.deepEqual(result.values, {host: 'x', v: true});
      assert.deepEqual(result.optionValues, {v: true});
    });
    it('parses an option after args', function () {
      let result = fncli.decodeArgs(opts, ['x', '-v']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['x', undefined, {v: true}]);
      assert.deepEqual(result.values, {host: 'x', v: true});
      assert.deepEqual(result.optionValues, {v: true});
    });
    it('parses an option followed by value', function () {
      let result = fncli.decodeArgs(opts, ['-m', 'fncli', 'x']);
      assert(!result.error, result.error);
      assert.deepEqual(result.apply, ['x', undefined, {m: 'fncli'}]);
      assert.deepEqual(result.values, {host: 'x', m: 'fncli'});
      assert.deepEqual(result.optionValues, {m: 'fncli'});
    });
    it('parses an option=value', function () {
      let result = fncli.decodeArgs(opts, ['-mfncli', 'x']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['x', undefined, {m: 'fncli'}]);
      assert.deepEqual(result.values, {host: 'x', m: 'fncli'});
      assert.deepEqual(result.optionValues, {m: 'fncli'});
    });
    it('parses combined options followed by value', function () {
      let result = fncli.decodeArgs(opts, ['x', '-vm', 'fncli']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['x', undefined, {v: true, m: 'fncli'}]);
      assert.deepEqual(result.values, {host: 'x', v: true, m: 'fncli'});
      assert.deepEqual(result.optionValues, {v: true, m: 'fncli'});
    });
    it('parses combined options and value', function () {
      let result = fncli.decodeArgs(opts, ['x', '-vmfncli']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['x', undefined, {v: true, m: 'fncli'}]);
      assert.deepEqual(result.values, {host: 'x', v: true, m: 'fncli'});
      assert.deepEqual(result.optionValues, {v: true, m: 'fncli'});
    });
    it('gives error with unknown options', function () {
      let result = fncli.decodeArgs(opts, ['-vf']);
      assert.ok(result.error);
    });
  });
  describe('using commands', function () {
    beforeEach(function () {
      opts = {
        optionParamIndex: null,
        options: {},
        positional: [{
          name: 'command',
          rest: false, required: true
        }],
        commands: {
          a: {
            name: 'a',
            optDesc: {
              optionParamIndex: null,
              options: {},
              positional: [{name: 'x', rest: false, required: true, synopsis: null}, {name: 'y', rest: false, required: true, synopsis: null}]
            }
          },
          b: {
            name: 'b',
            optDesc: {
              optionParamIndex: 2,
              options: {
                verbose: {name: 'verbose', hasArg: false, synopsis: null},
                module: {name: 'module', hasArg: true, synopsis: null}
              },
              positional: [{name: 'host', rest: false, required: true, synopsis: null}, {name: 'port', rest: false, required: false, synopsis: null}]
            }
          }
        }
      };
    });
    it('parses a command', function () {
      let result = fncli.decodeArgs(opts, ['b', 'x', '--module=fncli']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['x', undefined, {module: 'fncli'}]);
      assert.deepEqual(result.values, {host: 'x', module: 'fncli'});
      assert.deepEqual(result.optionValues, {module: 'fncli'});
    });
  });
  describe('rest params', function () {
    beforeEach(function () {
      opts = {
        optionParamIndex: null,
        options: {},
        positional: [
          {name: 'x', rest: false, required: true, synopsis: null},
          {name: 'y', rest: true, required: false, synopsis: null}]
      };
    });
    it('parses extra args', function () {
      let result = fncli.decodeArgs(opts, ['1']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['1']);
    });
    it('parses extra args', function () {
      let result = fncli.decodeArgs(opts, ['1', '2']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['1', '2']);
    });
    it('parses extra args', function () {
      let result = fncli.decodeArgs(opts, ['1', '2', '3']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['1', '2', '3']);
    });
  })
  describe('camelCase params', function () {
    beforeEach(function () {
      opts = {
        optionParamIndex: 1,
        options: {
          theOption: {name: 'theOption',  hasArg: true, synopsis: null}
        },
        positional: [
          {name: 'theParam', rest: false, required: true, synopsis: null}
        ]
      };
    });
    it('parses camelCase args', function () {
      let result = fncli.decodeArgs(opts, ['hello', '--theOption=1']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['hello', {theOption: '1'}]);
    });
    it('parses kebab args', function () {
      let result = fncli.decodeArgs(opts, ['hello', '--the-option=1']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['hello', {theOption: '1'}]);
    });
  });
});

describe('fncli', function () {
  let errs = [], result = null;
  function subject(fn, args) {
    let fncli = require('../index');
    let orig = console.error;
    errs = []; result = null;
    console.error = (e) => errs.push(e);
    try {
      fncli(fn, ['node', 'script.js'].concat(args));
    } finally {
      console.error = orig;
    }
  }

  it('calls the function', function () {
    let x = 0, fn = () => x++
    subject(fn, []);
    console.assert(x === 1);
  });
  it('calls the function with args', function () {
    let x = 0, fn = (y) => x += +y;
    subject(fn, ['2']);
    console.assert(x === 2);
  });
  it('prints an error when arg is not passed', function () {
    let x = 0, fn = (y) => x += +y;
    subject(fn, []);
    console.assert(errs.length);
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
      assert.deepEqual(result, {x:'x', y: 'y', flag: true, opt: '1', z: []});
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
