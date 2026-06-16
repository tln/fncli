// Several params share one physical line with a single trailing comment.
// fncli attaches that comment to the FIRST param on the line (it scans to the
// end of the physical line). When prettier splits the params onto separate
// lines, the comment ends up trailing the LAST param instead -> the help text
// moves the description from `alpha` to `gamma`.
require('fncli')(function run(alpha, beta, gamma, // an important flag
  {force=false}) {});
