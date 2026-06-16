// Destructured options object on a single line with per-option descriptions.
// Prettier tends to explode the object across lines; comment association may
// shift in the process.
require('fncli')(function serve({port=8080 /* listen port */, host="localhost" /* bind address */, tls=false /* enable https */}) {});
