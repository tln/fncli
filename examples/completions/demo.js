#!/usr/bin/env node
'use strict';

// End-to-end demo of fncli's built-in shell completion. No import needed —
// completion is on by default under the reserved `completions` command:
//
//   node demo.js completions                  -> help
//   node demo.js completions script [shell]   -> print the stub (auto-detects)
//   node demo.js completions install [shell]  -> write stub to the autoload dir
//   node demo.js completions v1 -- bash/1 ''  -> inspect the raw wire protocol
//
// Install for a session (the stub calls back into `demo completions v1 --`):
//   eval "$(demo completions script zsh)"

const fncli = require('../..');

fncli(
  {
    main(file) {}, // run the main thing
    ssh(host) {}, // connect somewhere
    config({ c: config = '' }) {}, // configure
  },
  {
    // Handlers complete parameter VALUES (commands/options need no config).
    // Each shape: static candidates, a shell file filter, or a function.
    completions: {
      handlers: {
        config: ['dev', 'prod', 'staging'], // demo config --config=<TAB>
        file: { ext: ['md', 'js'] }, // demo main <TAB> -> *.md / *.js
        host: async () => ['alpha', 'beta', 'gamma'], // demo ssh <TAB>
      },
    },
  }
);
