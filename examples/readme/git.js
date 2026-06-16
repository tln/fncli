const fncli = require('../../index.js');
process.argv[1] = 'script'; // program name shown in usage (kept out of the embed)

// Multiple functions become sub-commands
function clone(  // Clone the repo
  url  // Repository URL
) {}
function push({f: force = false}, upstream = "origin") {}
function add({A: all = false}, ...files) {}

// Call fncli with object
fncli({
  clone,
  push,
  add,
});
