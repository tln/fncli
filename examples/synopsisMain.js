require('..')(
  function (// Description of command
    name, // Description of name
    {
      greeting="Hello", // Description of greeting
      s: shout=false
    }) {
    var output = `${greeting} ${name}!`;
    if (shout) output = output.toUpperCase();
    console.log(output);
  }
);
