require('..')(
  function (// Description of command
    {
      greeting="Hello", // Description of greeting
      s: shout=false
    },
    name,         // Description of name
    ...moreNames // Description of moreNames
    ) {
    moreNames.unshift(name);
    for (name of moreNames) {
      var output = `${greeting} ${name}!`;
      if (shout) output = output.toUpperCase();
      console.log(output);
    }
  }
);
