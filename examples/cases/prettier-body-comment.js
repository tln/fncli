// Synopsis written as a line comment after the opening body brace. fncli only
// reads comments before the body starts, so this is already fragile; prettier
// reindents it deeper into the body. Included to show a pattern to avoid.
require('fncli')(function init(name) {
  // Initialize a new project
  console.log(name);
});
