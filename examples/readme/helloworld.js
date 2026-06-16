const fncli = require('../../index.js');
process.argv[1] = 'script'; // program name shown in usage (kept out of the embed)

// 1. write function
function main(name, {greeting = "Hello", shout = false}) {}

// 2. call fncli
fncli(main);
