require('fncli')(
  function main(name, {greeting="Hello", shout=false}) {
    let output = `${greeting} ${name}!`;
    if (shout) output = output.toUpperCase();
    console.log(output);
  }
);
