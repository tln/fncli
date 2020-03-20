require('../index')({
  // Comments within the parameters will be used as short descriptions.
  // Comment before the first parameter will be used as the synopsys.
  //
  // Note that comments before the function can't be used by fncli becase 
  // Javascript does not include them in "toString" output.

  hello( // Greet the day.
    name, // Subject of greeting, eg "world"
    {
      greeting="Hello", // Text for greeting
      shout=false // Capitalizes output
    }) {
    var output = `${greeting} ${name}!`;
    if (shout) output = output.toUpperCase();
    console.log(output);
  },
  goodbye({shout=false}) {
    console.log(shout ? 'GOODBYE' : 'Bye!');
  }
});
