// A signature long enough that prettier must reflow it across lines. The
// descriptions are line comments placed after each parameter on one line.
require('fncli')(function deploy(application, environment, region, // where to run it
  {dryRun=false, force=false, verbose=false, timeout="30s", tags="none"}) {});
