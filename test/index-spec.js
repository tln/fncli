const assert = require('assert');

describe('optDescFromSignature', function () {
  var funcli;
  beforeEach(function () {
    funcli = require('../index');
  });
  it('simple function', function () {
    let result = funcli.optDescFromSignature((x, y)=>0);
    assert.deepEqual(result, {
      optionParamIndex: null,
      options: {},
      positional: [{name: 'x', required: true}, {name: 'y', required: true}]
    });
  });
  it('an optional arg', function () {
    let result = funcli.optDescFromSignature((port=0)=>0);
    assert.deepEqual(result, {
      optionParamIndex: null,
      options: {},
      positional: [{name: 'port', required: false}]
    });
  });
  it('single option', function () {
    let result = funcli.optDescFromSignature(({port})=>0);
    assert.deepEqual(result, {
      optionParamIndex: 0,
      options: {port: {name: 'port', hasArg: true}},
      positional: []
    });
  });
  it('flag option', function () {
    let result = funcli.optDescFromSignature(({verbose=false})=>0);
    assert.deepEqual(result, {
      optionParamIndex: 0,
      options: {verbose: {name: 'verbose', hasArg: false}},
      positional: []
    });
  });
  it('kitchen sink', function () {
    let result = funcli.optDescFromSignature((host, port=0, {verbose=false, module})=>0);
    assert.deepEqual(result, {
      optionParamIndex: 2,
      options: {
        verbose: {name: 'verbose', hasArg: false},
        module: {name: 'module', hasArg: true}
      },
      positional: [{name: 'host', required: true}, {name: 'port', required: false}]
    });
  });
});

describe('optDescFromCommands', function () {
  var funcli;
  beforeEach(function () {
    funcli = require('../index');
  });
  it('simple functions', function () {
    let result = funcli.optDescFromCommands({
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
            optionParamIndex: null,
            options: {},
            positional: [{name: 'x', required: true}, {name: 'y', required: true}]
          }
        },
        b: {
          name: 'b',
          optDesc: {
            optionParamIndex: 2,
            options: {
              verbose: {name: 'verbose', hasArg: false},
              module: {name: 'module', hasArg: true}
            },
            positional: [{name: 'host', required: true}, {name: 'port', required: false}]
          }
        }
      }
    });
  });
});

describe('decodeArgs', function () {
  var funcli, opts;
  beforeEach(function () {
    funcli = require('../index');
    opts = {
      optionParamIndex: 2,
      options: {
        verbose: {name: 'verbose', hasArg: false},
        module: {name: 'module', hasArg: true}
      },
      positional: [{name: 'host', required: true}, {name: 'port', required: false}]
    };
  });
  it('gives error with no args', function () {
    let result = funcli.decodeArgs(opts, []);
    assert.ok(result.error);
  });
  it('parses 1 arg', function () {
    let result = funcli.decodeArgs(opts, ['x']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {}]);
    assert.deepEqual(result.values, {host: 'x'});
    assert.deepEqual(result.optionValues, {});
  });
  it('parses 2 args', function () {
    let result = funcli.decodeArgs(opts, ['x', 'y']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', 'y', {}]);
    assert.deepEqual(result.values, {host: 'x', port: 'y'});
    assert.deepEqual(result.optionValues, {});
  });
  it('gives error with 3 args', function () {
    let result = funcli.decodeArgs(opts, ['x', 'y', 'z']);
    assert.ok(result.error);
  });
  it('parses an option', function () {
    let result = funcli.decodeArgs(opts, ['--verbose', 'x']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {verbose: true}]);
    assert.deepEqual(result.values, {host: 'x', verbose: true});
    assert.deepEqual(result.optionValues, {verbose: true});
  });
  it('parses an option after args', function () {
    let result = funcli.decodeArgs(opts, ['x', '--verbose']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {verbose: true}]);
    assert.deepEqual(result.values, {host: 'x', verbose: true});
    assert.deepEqual(result.optionValues, {verbose: true});
  });
  it('parses an option followed by value', function () {
    let result = funcli.decodeArgs(opts, ['--module', 'funcli', 'x']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {module: 'funcli'}]);
    assert.deepEqual(result.values, {host: 'x', module: 'funcli'});
    assert.deepEqual(result.optionValues, {module: 'funcli'});
  });
  it('parses an option=value', function () {
    let result = funcli.decodeArgs(opts, ['--module=funcli', 'x']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {module: 'funcli'}]);
    assert.deepEqual(result.values, {host: 'x', module: 'funcli'});
    assert.deepEqual(result.optionValues, {module: 'funcli'});
  });
  it('parses an option followed by value after args', function () {
    let result = funcli.decodeArgs(opts, ['x', '--module', 'funcli']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {module: 'funcli'}]);
    assert.deepEqual(result.values, {host: 'x', module: 'funcli'});
    assert.deepEqual(result.optionValues, {module: 'funcli'});
  });
  it('parses an option=value after args', function () {
    let result = funcli.decodeArgs(opts, ['x', '--module=funcli']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {module: 'funcli'}]);
    assert.deepEqual(result.values, {host: 'x', module: 'funcli'});
    assert.deepEqual(result.optionValues, {module: 'funcli'});
  });
  describe('using commands', function () {
    beforeEach(function () {
      opts = {
        optionParamIndex: null,
        options: {},
        positional: [{
          name: 'command', 
          required: true
        }],
        commands: {
          a: {
            name: 'a',
            optDesc: {
              optionParamIndex: null,
              options: {},
              positional: [{name: 'x', required: true}, {name: 'y', required: true}]
            }
          },
          b: {
            name: 'b',
            optDesc: {
              optionParamIndex: 2,
              options: {
                verbose: {name: 'verbose', hasArg: false},
                module: {name: 'module', hasArg: true}
              },
              positional: [{name: 'host', required: true}, {name: 'port', required: false}]
            }
          }
        }
      };
    });   
    it('parses a command', function () {
      console.log(opts);
      let result = funcli.decodeArgs(opts, ['b', 'x', '--module=funcli']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['x', undefined, {module: 'funcli'}]);
      assert.deepEqual(result.values, {host: 'x', module: 'funcli'});
      assert.deepEqual(result.optionValues, {module: 'funcli'});
    });  
  })
});

describe('funcli', function () {
  var funcli;
  beforeEach(function () {
    funcli = require('../index');
  });
  it('calls the function', function () {
    let x = 0, fn = () => x++
    funcli(fn, []);
    console.assert(x === 1);
  });
  it('calls the function with args', function () {
    let x = 0, fn = (y) => x += +y;
    funcli(fn, ['2']);
    console.assert(x === 2);
  });
  it('prints an error when arg is not passed', function () {
    let x = 0, fn = (y) => x += +y;
    let errs = [], orig = console.error;
    console.error = (e) => errs.push(e);
    funcli(fn, []);
    console.assert(errs.length);
  });
  describe('parses arguments correctly', function () {
    var result, errs, orig;
    let fn = (x, y=0, {flag=false, opt}) => result = {x, y, flag, opt};
    beforeEach(function () {
      result = null;
      errs = [];
      orig = console.error;
      console.error = (e) => errs.push(e);
    });
    afterEach(function () {
      console.error = orig;
    });

    it('with min args', function () {
      funcli(fn, ['x']);
      assert(errs.length === 0);
      assert.deepEqual(result, {x:'x', y: 0, flag: false, opt: undefined});
    });

    it('with all args', function () {
      funcli(fn, ['--flag', '--opt=1', 'x', 'y']);
      assert(errs.length === 0);
      assert.deepEqual(result, {x:'x', y: 'y', flag: true, opt: '1'});
    });
  });
  describe('parses commands correctly', function () {
    var result, errs, orig;
    let commands = {
      a(x, y=0, {flag=false, opt}) { 
        result = {x, y, flag, opt}; 
      },
      b() {
        result = 'b';
      }
    }
    beforeEach(function () {
      result = null;
      errs = [];
      orig = console.error;
      console.error = (e) => errs.push(e);
    });
    afterEach(function () {
      console.error = orig;
    });

    it('with no args', function () {
      funcli(commands, []);
      assert.ok(errs);
      console.log(errs);
    });

    it('with min args', function () {
      funcli(commands, ['a', 'x']);
      assert(errs.length === 0);
      assert.deepEqual(result, {x:'x', y: 0, flag: false, opt: undefined});
    });

    it('with all args', function () {
      funcli(commands, ['a', '--flag', '--opt=1', 'x', 'y']);
      assert(errs.length === 0);
      assert.deepEqual(result, {x:'x', y: 'y', flag: true, opt: '1'});
    });

    it('with missing args', function () {
      funcli(commands, ['a']);
      assert.ok(errs);
      // Should print the command on usage line
      assert(errs[0].match(/usage: \w+ a/m));
      console.log(errs);
    });
  });
});
