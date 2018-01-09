require('../index')({
  // Comments within the parameters can be used as short descriptions
  // Note that you can't describbe the overall command this way, because  
  // only comments within parameter isn't present in the "toString" output.

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
