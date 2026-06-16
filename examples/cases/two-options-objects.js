// REGRESSION (fixed in e7252e3): the "only one options object allowed" guard
// used to misfire when the FIRST parameter was an options object.
//
// parseSignature records optionParamIndex = positional.length when it sees the
// object. If options is the first param that index is 0, and the old duplicate
// check `if (result.optionParamIndex)` read 0 as "not set yet" (0 is falsy), so
// a second options object slipped through and merged instead of erroring. The
// guard now compares `!= null`, so index 0 is caught.
//
// Run: node examples/cases/two-options-objects.js
//   Both cases now throw "only one options object allowed".
const parseSignature = require('../../parseSignature.js');

function show(label, fn) {
  try {
    fn();
    console.log(`${label} -> threw? no`);
  } catch (e) {
    console.log(`${label} -> threw? ${JSON.stringify(e.message)}`);
  }
}

// First param is an options object (the case that used to slip through).
show('first-arg-object ', () => parseSignature(function deploy({prod = false}, {force = false}) {}));
// A positional in front: caught before and after the fix.
show('positional-first ', () => parseSignature(function deploy(target, {prod = false}, {force = false}) {}));
