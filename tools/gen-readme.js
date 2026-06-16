#!/usr/bin/env node
// Regenerate the rendered-usage snippets embedded in README.md.
//
// For each examples/readme/*.js, run it with --help at a fixed width and with
// color off, and capture the usage text into a sibling .txt. `embedme` then
// injects both the source and the .txt into README (see `npm run docs`). This
// keeps the documented output honest: it is produced by the real renderer, so
// it cannot drift from the code.
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'examples', 'readme');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();

for (const file of files) {
  const js = path.join(dir, file);
  // --help prints clean usage (no error prefix) to stdout and exits 0.
  // NO_COLOR strips ANSI; COLUMNS pins the wrap width so output is stable.
  const out = execFileSync(process.execPath, [js, '--help'], {
    env: {...process.env, NO_COLOR: '1', COLUMNS: '80'},
    encoding: 'utf8',
  });
  const txt = js.replace(/\.js$/, '.txt');
  fs.writeFileSync(txt, out.replace(/\s+$/, '') + '\n');
  console.log('wrote', path.relative(path.join(__dirname, '..'), txt));
}
