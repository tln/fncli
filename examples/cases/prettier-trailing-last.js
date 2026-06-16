// Comment after the last parameter with no trailing comma. Prettier inserts a
// trailing comma (and may move the comment), which can re-associate the text.
require('fncli')(function pack(
  input, // file to pack
  output // where to write
  // note: output is optional in spirit
) {});
