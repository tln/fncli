require('../index')({
  clone( // Clone the repo
    url  // Repository URL
  ) {
    console.log(`cloning ${url}`);
  },
  push({f: force=false}, upstream="origin") {
    console.log(`push${force ? ' --force' : ''} to ${upstream}`);
  },
  add({A: all=false}, ...files) {
    if (all) console.log('adding all');
    else console.log(`adding ${files.join(', ')}`);
  },
});
