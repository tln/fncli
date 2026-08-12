const fncli = require('../..');
const {version} = require('../../package.json');

// Manage widgets.
function build(
  target, // What to build
  {watch = false} // Rebuild on change
) {
  console.log('build', target, {watch});
}

function clean() {
  console.log('clean');
}

fncli({build, clean}, {version});
