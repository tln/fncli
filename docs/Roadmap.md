# Roadmap

Post-0.9.0 ideas

- SKILL.md
- **Completions** using synopsis eg {env /* dev | prod */}
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
- **Companion CLI (`fnclize`)** — scaffold, convert-to-fncli, eject, README/help
  generation, a `doctor` lint, and an optional build step.
