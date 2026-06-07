require('..')(
  function (// Description of command
    {
      greeting="Hello", // Description of greeting
      s: shout=false
    },
    ...names         // Description of name
    ) {
    if (names.length === 0) {
      throw "error: pass at least one name";
    }
    for (name of names) {
      var output = `${greeting} ${name}!`;
      if (shout) output = output.toUpperCase();
      console.log(output);
    }
  }
);
