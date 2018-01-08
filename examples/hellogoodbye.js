require('../index')({
  // Pass an object with functions. Function names become 
  // subcommands.
  hello(name, {greeting="Hello", shout=false}) {
    var output = `${greeting} ${name}!`;
    if (shout) output = output.toUpperCase();
    console.log(output);
  },
  goodbye({shout=false}) {
    console.log(shout ? 'GOODBYE' : 'Bye!');
  }
});
