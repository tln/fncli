// Nested sub-commands: a plain-object value is itself a command group, so
// fncli builds a multi-level CLI (eg `git-nested remote add origin <url>`).
// Mix top-level commands with groups freely.
require('fncli')({
  clone( // Clone the repo
    url  // Repository URL
  ) {
    console.log(`cloning ${url}`);
  },
  remote: {
    add( // Add a remote
      name, // Remote name, eg "origin"
      url   // Remote URL
    ) {
      console.log(`remote add ${name} ${url}`);
    },
    remove( // Remove a remote
      name  // Remote name
    ) {
      console.log(`remote remove ${name}`);
    },
  },
  stash: {
    push( // Save changes to a new stash
      {m: message} // Stash message
    ) {
      console.log(`stash push${message ? ` -m ${message}` : ''}`);
    },
    pop( // Restore the most recent stash
      index="0" // Stash index to restore
    ) {
      console.log(`stash pop ${index}`);
    },
  },
});
