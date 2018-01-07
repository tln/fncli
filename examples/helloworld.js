require('../index')(
  // Pass a main function. Parameters become arguments or options
  function main(name, {greeting="Hello", shout=false}) {
    var output = `${greeting} ${name}!`;
    if (shout) output = output.toUpperCase();
    console.log(output);
  }
);
