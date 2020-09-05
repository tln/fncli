require('../index')(
  function hello({greeting="Hello", shout=false}, ...names) {
    for (let name of names) {
        var output = `${greeting} ${name}!`;
        if (shout) output = output.toUpperCase();
        console.log(output);
    }
});
