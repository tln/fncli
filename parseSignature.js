const {Parser} = require("acorn")

/**
 * Return an opts data structure that describes the options and arguments.
 * @param {*} func
 */
module.exports = function parseSignatures(handlers) {
  if (typeof handlers === 'function') {
      return parseSignature(handlers);
  }
  let commands = {};
  for (let name in handlers) {
    let optDesc = parseSignature(handlers[name]);
    commands[name] = {name, optDesc};
  }
  return {
    optionParamIndex: null,
    options: {},
    positional: [{name: 'command', required: true}],
    commands
  };
}


function parseSignature(fn) {
  const result = {
    synopsis: null,
    optionParamIndex: null,
    options: {},
    positional: [],
  };
  // massage source into somthing acorn will parse.
  // 'function(){}' -> '(function(){})'
  // 'a(){}' -> 'function a(){}'

  let comments = [], options = {
    ecmaVersion: 'latest', 
    onComment(block, text, start, end) {
        comments.push([text, start]);
    },
  };
  let node, source = '('+fn+')';
  try{
    node = Parser.parse(source, options)
  } catch(e) {
    // function source may be using method shorthand, eg {a(){}}.a.toString() -> 'a() {}'
    source = '(function ' + fn.toString().replace(/^async /, '') + ')'
    node = Parser.parse(source, options)
  }
  node = node.body[0].expression;
  // remove comments after start of body
  comments = comments.filter(c => c[1] < node.body.start)

  let firstTimeCalled = true;
  function setSynopsis(end=source.length) {
    if (comments.length && result.synopsis == null && comments[0][1] < end) {
      // first comment is the function synopsis, as long as it starts before the token
      result.synopsis = comments.shift()[0].trim();
    }
  }
  function getCommentUntil(tokenEnd, name) {
      if (firstTimeCalled) firstTimeCalled = setSynopsis(tokenEnd);
      if (!comments.length) return null;

      // find the end of the line after tokenEnd
      const re = /\n|$/g; 
      re.lastIndex = tokenEnd;
      const until = re.exec(source).index;


      // remove comments until that index and join
      let ix = comments.findIndex(c => c[1] > until);
      if (ix == -1) ix = comments.length;
      return comments.splice(0, ix).map(c => c[0]).join('\n').trim();
  }

  function mapNodes(nodes, handlers, unknown=node=>({error: 'unknown node type', type: node.type, node})) {
      return nodes.map(node => (handlers[node.type]||unknown)(node))
  }
  function positional({name, required=false, rest=false, end}) {
    result.positional.push({name, required, rest, synopsis: getCommentUntil(end)});
  }
  mapNodes(node.params, {
      Identifier({name, end}) {
        positional({name, end, required: true});
      },
      RestElement({argument: {name}, end}) {
        positional({name, end, rest: true});
      },
      AssignmentPattern({left: {name}, end}) {
        positional({name, end});
      },
      ObjectPattern({properties}) {
          if (result.optionParamIndex) throw new Error('only one options object allowed');
          result.optionParamIndex = result.positional.length;
          mapNodes(properties, {
              Property({key: {name}, value: {name: alias, left, right}, end}) {
                  if (left) alias = left.name;
                  if (name == alias) alias = undefined;
                  const hasArg = !(right && right.type == 'Literal' && right.value === false);
                  const synopsis = getCommentUntil(end);
                  result.options[name] = {name, hasArg, synopsis};
                  if (alias) {
                    result.options[name].alias = alias;
                    result.options[alias] = result.options[name];
                  }
              }
          });
      }
  });

  // If there are no args, the synopsis won't be set yet.
  setSynopsis();

  // warning if unused comments?
  return result;
}


