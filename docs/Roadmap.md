# Roadmap

Post-0.8.0 ideas, not yet scheduled.

- **Colorized output in docs** — show the actual ANSI-colored help in README /
  docs (commands cyan, args green, options yellow), not just plain text. Use `ansi2`
- **Website** — a landing page with live, side-by-side JS signature ↔ CLI usage.
  - ansi-to-html or highlight.js or ansi2
  - Hero
    - Colorized JS on right 
    - Colorized CLI on left
  - Live example 
    - same situation, just live!
- **Help-length control** — an option to choose verbosity, e.g.
  `fncli(cmds, {help: "short"})` (beyond today's fixed terse-on-error /
  full-on-`--help` pair). Idea: `-h` is short, `--help` is long
- **Shell completions** — generate bash/zsh/fish completions from the signature.
