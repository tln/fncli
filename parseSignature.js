const {Parser} = require("acorn")

/**
 * Return an opts data structure that describes the options and arguments.
 * @param {*} func
 */
module.exports = function parseSignatures(handlers) {
  if (typeof handlers === 'function') {
      return parseSignature(handlers);
  }
  let commands = {}, synopsis = null;
  for (let name in handlers) {
    // A string-valued `synopsis` key describes the group itself (eg
    // fncli({synopsis: '...', ...commands})); it is not a command. Works at
    // any nesting level.
    if (name === 'synopsis' && typeof handlers[name] === 'string') {
      synopsis = handlers[name];
      continue;
    }
    // Plain-object values are nested sub-command groups; recurse.
    let optDesc = parseSignatures(handlers[name]);
    commands[name] = {name, optDesc};
  }
  return {
    synopsis,
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
    // Discard comments collected during the failed parse above; otherwise
    // onComment double-counts every comment (with stale offsets from the old
    // source), polluting later params' descriptions.
    comments.length = 0;
    source = '(' + fn.toString().replace(/^(async )?/, '$1function ') + ')'
    node = Parser.parse(source, options)
  }
  node = node.body[0].expression;
  // remove comments after start of body
  comments = comments.filter(c => c[1] < node.body.start)

  // The synopsis is every comment before the first parameter (or before the
  // body, when there are no params). Consecutive `//` lines arrive as separate
  // comments, so take all of them and join — otherwise a multi-line synopsis
  // leaks its later lines onto the first positional arg's description.
  const firstParamStart = node.params.length ? node.params[0].start : node.body.start;
  function setSynopsis() {
    if (result.synopsis != null) return;
    let ix = comments.findIndex(c => c[1] >= firstParamStart);
    if (ix === -1) ix = comments.length;
    if (ix > 0) {
      result.synopsis = comments.splice(0, ix).map(c => c[0].trim()).join('\n');
    }
  }
  function getCommentUntil(tokenEnd, nextStart=Infinity) {
      if (!comments.length) return null;

      // find the end of the line after tokenEnd
      const re = /\n|$/g;
      re.lastIndex = tokenEnd;
      let until = re.exec(source).index;

      // A trailing comment describes the param to its left. When several params
      // share one physical line (`a, b, c, // comment`), don't let an earlier
      // param swallow a comment that trails a later one: stop at the next
      // param's start so the comment attaches to the param it actually follows.
      until = Math.min(until, nextStart);

      // remove comments until that index and join
      let ix = comments.findIndex(c => c[1] > until);
      if (ix == -1) ix = comments.length;
      return comments.splice(0, ix).map(c => c[0]).join('\n').trim();
  }

  function mapNodes(nodes, handlers, unknown=node=>({error: 'unknown node type', type: node.type, node})) {
      return nodes.map((node, i) => {
          const nextStart = i + 1 < nodes.length ? nodes[i + 1].start : Infinity;
          return (handlers[node.type]||unknown)(node, nextStart);
      });
  }
  function positional({name, required=false, rest=false, end}, nextStart) {
    result.positional.push({name, required, rest, synopsis: getCommentUntil(end, nextStart)});
  }
  // Claim the synopsis comments before any param consumes a trailing comment.
  setSynopsis();
  mapNodes(node.params, {
      Identifier({name, end}, nextStart) {
        positional({name, end, required: true}, nextStart);
      },
      RestElement({argument: {name}, end}, nextStart) {
        positional({name, end, rest: true}, nextStart);
      },
      AssignmentPattern({left, end}, nextStart) {
        // Handle default values for both identifiers and object patterns
        if (left.type === 'ObjectPattern') {
          // This is an object pattern with a default, e.g., {opt1}={}
          // Compare to null: index 0 (options is the first param) is valid.
          if (result.optionParamIndex != null) throw new Error('only one options object allowed');
          result.optionParamIndex = result.positional.length;
          mapNodes(left.properties, {
              Property({key: {name}, value: {name: alias, left: valueLeft, right}, end}, nextStart) {
                  if (valueLeft) alias = valueLeft.name;
                  if (name == alias) alias = undefined;
                  const hasArg = !(right && right.type == 'Literal' && right.value === false);
                  const synopsis = getCommentUntil(end, nextStart);
                  result.options[name] = {name, hasArg, synopsis};
                  if (alias) {
                    result.options[name].alias = alias;
                    result.options[alias] = result.options[name];
                  }
              }
          });
        } else {
          // This is an identifier with a default value
          positional({name: left.name, end}, nextStart);
        }
      },
      ObjectPattern({properties}) {
          if (result.optionParamIndex != null) throw new Error('only one options object allowed');
          result.optionParamIndex = result.positional.length;
          mapNodes(properties, {
              Property({key: {name}, value: {name: alias, left, right}, end}, nextStart) {
                  if (left) alias = left.name;
                  if (name == alias) alias = undefined;
                  const hasArg = !(right && right.type == 'Literal' && right.value === false);
                  const synopsis = getCommentUntil(end, nextStart);
                  result.options[name] = {name, hasArg, synopsis};
                  if (alias) {
                    result.options[name].alias = alias;
                    result.options[alias] = result.options[name];
                  }
              }
          });
      }
  });

  // warning if unused comments?
  return result;
}


