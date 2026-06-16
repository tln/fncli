// REGRESSION (fixed in e7252e3): the help used to advertise `-f=<value>` for a
// short option, but the parser keeps the `=` as part of the value. `=` is a
// long-option separator only (GNU getopt); short options take `-f value`.
//
// Now the help renders the short form as `-f <value>` (a space), matching how
// the parser reads it.
//
// Run:
//   node examples/cases/short-option-equals.js          # help shows `-f <value>`
//   node examples/cases/short-option-equals.js -f gmail # value = "gmail"
require('../../index.js')(function message(
  {f: format = 'parsed'} // parsed (default) | gmail (raw) | text (trimmed body)
) {
  console.log('format =', JSON.stringify(format));
});
