const assert = require('assert');

describe('parseSignature', function () {
  const parseSignature = require('../parseSignature');
  it('simple function', function () {
    let result = parseSignature((x, y)=>0);
    assert.deepEqual(result, {
      synopsis: null,
      optionParamIndex: null,
      options: {},
      positional: [{name: 'x', rest: false, required: true, synopsis: null}, {name: 'y', rest: false, required: true, synopsis: null}]
    });
  });
  it('an optional arg', function () {
    let result = parseSignature((port=0)=>0);
    assert.deepEqual(result, {
      synopsis: null,
      optionParamIndex: null,
      options: {},
      positional: [{name: 'port', rest: false, required: false, synopsis: null}]
    });
  });
  it('single option', function () {
    let result = parseSignature(({port})=>0);
    assert.deepEqual(result, {
      synopsis: null,
      optionParamIndex: 0,
      options: {port: {name: 'port', hasArg: true, synopsis: null}},
      positional: []
    });
  });
  it('flag option', function () {
    let result = parseSignature(({verbose=false})=>0);
    assert.deepEqual(result, {
      synopsis: null,
      optionParamIndex: 0,
      options: {verbose: {name: 'verbose', hasArg: false, synopsis: null}},
      positional: []
    });
  });
  it('kitchen sink', function () {
    let result = parseSignature((host, port=0, {verbose=false, module})=>0);
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
    let result = parseSignature(
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
  it('synopsis on last option', function () {
    let result = parseSignature(
      ({
          n=null // A number
       }
       )=>0);
    assert.deepEqual(result, {
      optionParamIndex: 0,
      options: {
        n: {
          hasArg: true,
          name: 'n',
          synopsis: 'A number'
        }
      },
      positional: [],
      synopsis: null
    });
  });
  it('option aliases', function () {
    let result = parseSignature(({m: module,
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
    let result = parseSignature((...x)=>0);
    assert.deepEqual(result, {
      synopsis: null,
      optionParamIndex: null,
      options: {},
      positional: [{name: 'x', rest: false, required: false, rest: true, synopsis: null}]
    });
  });
  it("doesn't use comments from function body", function () {
    let result = parseSignature(()=>{
      /* hello */
    });
    assert(!result.synopsis, result);
  })
});

describe('parseSignature commands', function () {
  const parseSignature = require('../parseSignature');
  it('simple functions', function () {
    let result = parseSignature({
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
