// REGRESSION (fixed in e7252e3): a command synopsis written as two consecutive
// `//` lines used to mis-attribute its second line to the first positional arg.
//
// The synopsis now claims all comments before the first parameter, so:
//   command synopsis: the full two-line sentence
//   arg 'id':         "Thread id or message id"
//
// Run: node examples/cases/multiline-synopsis.js
const parseSignature = require('../../parseSignature.js');

const r = parseSignature(function analyze(
  // Print the most recent analysis for a thread (id may be a thread
  // id or a message id — we back out to its thread). DB-only for now.
  id // Thread id or message id
) {});

console.log('command synopsis:', JSON.stringify(r.synopsis));
console.log("arg 'id' synopsis:", JSON.stringify(r.positional[0].synopsis));
