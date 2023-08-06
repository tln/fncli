const assert = require('assert');

describe('decodeArgs', function () {
  const decodeArgs = require('../decodeArgs');
  let opts;
  beforeEach(function () {
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
    let result = decodeArgs(opts, []);
    assert.ok(result.error);
  });
  it('gives error with unknown options', function () {
    let result = decodeArgs(opts, ['--foo']);
    assert.ok(result.error);
  });
  it('parses 1 arg', function () {
    let result = decodeArgs(opts, ['x']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {}]);
    assert.deepEqual(result.values, {host: 'x'});
    assert.deepEqual(result.optionValues, {});
  });
  it('parses 2 args', function () {
    let result = decodeArgs(opts, ['x', 'y']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', 'y', {}]);
    assert.deepEqual(result.values, {host: 'x', port: 'y'});
    assert.deepEqual(result.optionValues, {});
  });
  it('gives error with 3 args', function () {
    let result = decodeArgs(opts, ['x', 'y', 'z']);
    assert.ok(result.error);
  });
  it('parses an option', function () {
    let result = decodeArgs(opts, ['--verbose', 'x']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {verbose: true}]);
    assert.deepEqual(result.values, {host: 'x', verbose: true});
    assert.deepEqual(result.optionValues, {verbose: true});
  });
  it('parses an option after args', function () {
    let result = decodeArgs(opts, ['x', '--verbose']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {verbose: true}]);
    assert.deepEqual(result.values, {host: 'x', verbose: true});
    assert.deepEqual(result.optionValues, {verbose: true});
  });
  it('parses an option followed by value', function () {
    let result = decodeArgs(opts, ['--module', 'fncli', 'x']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {module: 'fncli'}]);
    assert.deepEqual(result.values, {host: 'x', module: 'fncli'});
    assert.deepEqual(result.optionValues, {module: 'fncli'});
  });
  it('parses an option=value', function () {
    let result = decodeArgs(opts, ['--module=fncli', 'x']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {module: 'fncli'}]);
    assert.deepEqual(result.values, {host: 'x', module: 'fncli'});
    assert.deepEqual(result.optionValues, {module: 'fncli'});
  });
  it('parses an option followed by value after args', function () {
    let result = decodeArgs(opts, ['x', '--module', 'fncli']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {module: 'fncli'}]);
    assert.deepEqual(result.values, {host: 'x', module: 'fncli'});
    assert.deepEqual(result.optionValues, {module: 'fncli'});
  });
  it('parses an option=value after args', function () {
    let result = decodeArgs(opts, ['x', '--module=fncli']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['x', undefined, {module: 'fncli'}]);
    assert.deepEqual(result.values, {host: 'x', module: 'fncli'});
    assert.deepEqual(result.optionValues, {module: 'fncli'});
  });
  it('does not treat -- as an arg', function () {
    let result = decodeArgs(opts, ['--module=fncli', '--', '-x']);
    assert(!result.error);
    assert.deepEqual(result.apply, ['-x', undefined, {module: 'fncli'}]);
    assert.deepEqual(result.values, {host: '-x', module: 'fncli'});
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
      let result = decodeArgs(opts, ['-v', 'x']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['x', undefined, {v: true}]);
      assert.deepEqual(result.values, {host: 'x', v: true});
      assert.deepEqual(result.optionValues, {v: true});
    });
    it('parses an option after args', function () {
      let result = decodeArgs(opts, ['x', '-v']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['x', undefined, {v: true}]);
      assert.deepEqual(result.values, {host: 'x', v: true});
      assert.deepEqual(result.optionValues, {v: true});
    });
    it('parses an option followed by value', function () {
      let result = decodeArgs(opts, ['-m', 'fncli', 'x']);
      assert(!result.error, result.error);
      assert.deepEqual(result.apply, ['x', undefined, {m: 'fncli'}]);
      assert.deepEqual(result.values, {host: 'x', m: 'fncli'});
      assert.deepEqual(result.optionValues, {m: 'fncli'});
    });
    it('parses an option=value', function () {
      let result = decodeArgs(opts, ['-mfncli', 'x']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['x', undefined, {m: 'fncli'}]);
      assert.deepEqual(result.values, {host: 'x', m: 'fncli'});
      assert.deepEqual(result.optionValues, {m: 'fncli'});
    });
    it('parses combined options followed by value', function () {
      let result = decodeArgs(opts, ['x', '-vm', 'fncli']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['x', undefined, {v: true, m: 'fncli'}]);
      assert.deepEqual(result.values, {host: 'x', v: true, m: 'fncli'});
      assert.deepEqual(result.optionValues, {v: true, m: 'fncli'});
    });
    it('parses combined options and value', function () {
      let result = decodeArgs(opts, ['x', '-vmfncli']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['x', undefined, {v: true, m: 'fncli'}]);
      assert.deepEqual(result.values, {host: 'x', v: true, m: 'fncli'});
      assert.deepEqual(result.optionValues, {v: true, m: 'fncli'});
    });
    it('gives error with unknown options', function () {
      let result = decodeArgs(opts, ['-vf']);
      assert.ok(result.error);
    });
    it('gives error with unknown options after args', function () {
      let result = decodeArgs(opts, ['abc.com', '8080', '-f']);
      assert.ok(result.error);
    });
    it('gives error with unknown option in rest argument', function () {
      let opts2 = {...opts, positional: [{name: 'host', rest: true, required: false}]}
      let result = decodeArgs(opts, ['a', 'x', 'y', '-f']);
      assert.ok(result.error);
    });
    it('does not treat "-" as an option', function () {
      let result = decodeArgs(opts, ['-']);
      assert(!result.error);
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
      let result = decodeArgs(opts, ['b', 'x', '--module=fncli']);
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
      let result = decodeArgs(opts, ['1']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['1']);
    });
    it('parses extra args', function () {
      let result = decodeArgs(opts, ['1', '2']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['1', '2']);
    });
    it('parses extra args', function () {
      let result = decodeArgs(opts, ['1', '2', '3']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['1', '2', '3']);
    });
    it('parses extra args', function () {
      let result = decodeArgs(opts, ['1', '2', '3']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['1', '2', '3']);
    });
  })
  describe('rest params with options', function () {
    beforeEach(function () {
      opts = {
        optionParamIndex: 0,
        options: {
          v: {name: 'v', hasArg: false},
          m: {name: 'm', hasArg: true},
        },
        positional: [
          {name: 'x', rest: false, required: true, synopsis: null},
          {name: 'y', rest: true, required: false, synopsis: null}]
        };
    });
    it('parses extra args', function () {
      let result = decodeArgs(opts, ['1', '2', '3']);
      assert(!result.error);
      assert.deepEqual(result.apply, [{}, '1', '2', '3']);
    });
    it('parses extra args and options', function () {
      let result = decodeArgs(opts, ['-v', '1', '2', '3']);
      assert(!result.error);
      assert.deepEqual(result.apply, [{v: true}, '1', '2', '3']);
    });
    it('parses extra args with options at end', function () {
      let result = decodeArgs(opts, ['1', '2', '-', '-v']);
      assert(!result.error, result.error);
      assert.deepEqual(result.apply, [{v: true}, '1', '2', '-']);
    });
  });
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
      let result = decodeArgs(opts, ['hello', '--theOption=1']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['hello', {theOption: '1'}]);
    });
    it('parses kebab args', function () {
      let result = decodeArgs(opts, ['hello', '--the-option=1']);
      assert(!result.error);
      assert.deepEqual(result.apply, ['hello', {theOption: '1'}]);
    });
  });
  describe('speed test', function () {
    beforeEach(function () {
      opts = {
        optionParamIndex: null,
        options: {},
        positional: [
          {name: 'x', rest: false, required: true, synopsis: null},
          {name: 'y', rest: true, required: false, synopsis: null}]
      };
    });
    it('handles lots of args and is not O(n^2)', function () {
      const {performance} = require('perf_hooks');
      const warmup = 100000, 
        small = 25000, 
        factor = 100,
        maxSlowdown = factor * 5;
      assert(small*factor > 2097152); // typical `getconf ARG_MAX`

      // warmup run
      let args = Array.from({length:warmup}).map(String)
      decodeArgs(opts, args);

      args = Array.from({length:small}).map(String)
      let t0 = performance.now();
      decodeArgs(opts, args);
      const elapsedSmall = performance.now() - t0;

      args = Array.from({length:small * factor}).map(String);
      t0 = performance.now();
      decodeArgs(opts, args);
      const elapsedLarge = performance.now() - t0;

      assert((elapsedLarge/elapsedSmall) < maxSlowdown, elapsedLarge/elapsedSmall);
    });
  });
});

