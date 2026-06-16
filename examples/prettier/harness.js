#!/usr/bin/env node
// Prettier comment-placement harness for fncli.
//
// fncli derives help text from comments written *inside* a function's
// parameter list, associating each comment with a parameter by source
// position (see ../../parseSignature.js). Prettier reflows signatures and can
// move those comments, which silently changes the generated help text.
//
// This harness makes the damage visible. For each input .js file it writes,
// into a gitignored gen/ directory:
//
//   <name>.orig.js           verbatim copy of the input
//   <name>.prettier.js       the same file after `prettier`
//   <name>.orig.help.txt     `node <name>.orig.js --help` output
//   <name>.prettier.help.txt `node <name>.prettier.js --help` output
//
// then prints the cases whose help text changed.
//
// Usage:
//   node harness.js [file.js ...]
//
// With no args it defaults to ../js/*.js and ../cases/prettier-*.js.
// To experiment with prettier options, drop a .prettierrc in this directory
// (prettier auto-discovers it relative to the file it formats in gen/).

const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

const HERE = __dirname; // examples/prettier
const EXAMPLES = path.resolve(HERE, '..'); // examples
const ROOT = path.resolve(EXAMPLES, '..'); // project root (holds index.js)
const GEN = path.join(HERE, 'gen');

// Make `require('fncli')` resolve from the generated files. Files in gen/
// resolve modules upward, finding examples/node_modules/fncli.
function ensureFncliLink() {
  const nm = path.join(EXAMPLES, 'node_modules');
  fs.mkdirSync(nm, {recursive: true});
  const link = path.join(nm, 'fncli');
  try {
    fs.lstatSync(link);
  } catch {
    fs.symlinkSync(ROOT, link, 'dir');
  }
}

function listDefaults() {
  // examples/cases also holds standalone bug repros that require('../../index.js');
  // only the prettier-*.js cases call require('fncli') and belong to this harness.
  const dirs = [
    {dir: path.join(EXAMPLES, 'js'), match: (n) => n.endsWith('.js')},
    {dir: path.join(EXAMPLES, 'cases'), match: (n) => /^prettier-.*\.js$/.test(n)},
  ];
  const out = [];
  for (const {dir, match} of dirs) {
    let names = [];
    try {
      names = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const n of names.sort()) {
      if (match(n)) out.push(path.join(dir, n));
    }
  }
  return out;
}

// examples/js/git.js -> "js__git"; examples/cases/prettier-foo.js -> "cases__prettier-foo"
function flatName(file) {
  const rel = path.relative(EXAMPLES, file).replace(/\.js$/, '');
  return rel.replace(/[\/\\]/g, '__');
}

function prettier(file) {
  const r = spawnSync('npx', ['prettier', file], {encoding: 'utf8'});
  if (r.status !== 0) {
    throw new Error(
      `prettier failed on ${file}:\n${r.stderr || r.stdout || r.error}`
    );
  }
  return r.stdout;
}

function help(file) {
  const r = spawnSync('node', [file, '--help'], {
    encoding: 'utf8',
    env: {...process.env, NO_COLOR: '1'},
  });
  // fncli prints usage/help to stderr; include stdout defensively.
  const out = (r.stdout || '') + (r.stderr || '');
  // The usage line echoes the script's basename, which differs between the
  // .orig.js and .prettier.js copies. Normalize it so only real help-text
  // changes (from moved comments) show up.
  return out.split(path.basename(file)).join('script');
}

function main() {
  const args = process.argv.slice(2);
  const inputs = args.length ? args.map((f) => path.resolve(f)) : listDefaults();

  ensureFncliLink();
  fs.rmSync(GEN, {recursive: true, force: true});
  fs.mkdirSync(GEN, {recursive: true});

  const changed = [];
  for (const input of inputs) {
    const base = flatName(input);
    const origJs = path.join(GEN, base + '.orig.js');
    const prettyJs = path.join(GEN, base + '.prettier.js');

    fs.writeFileSync(origJs, fs.readFileSync(input, 'utf8'));
    fs.writeFileSync(prettyJs, prettier(origJs));

    const origHelp = help(origJs);
    const prettyHelp = help(prettyJs);
    fs.writeFileSync(path.join(GEN, base + '.orig.help.txt'), origHelp);
    fs.writeFileSync(path.join(GEN, base + '.prettier.help.txt'), prettyHelp);

    if (origHelp !== prettyHelp) changed.push(base);
  }

  const rel = path.relative(ROOT, GEN);
  console.log(`Generated ${inputs.length} case(s) in ${rel}/`);
  if (changed.length === 0) {
    console.log('No help-text changes: prettier preserved all comment placement.');
    return;
  }
  console.log(`\nHelp text CHANGED in ${changed.length} case(s):`);
  for (const c of changed) {
    console.log(`  ${c}`);
    console.log(
      `    diff ${path.join(rel, c + '.orig.help.txt')} ${path.join(rel, c + '.prettier.help.txt')}`
    );
  }
}

main();
