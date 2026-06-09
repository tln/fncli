// Mocha loads this via `--require` (see .mocharc.json) before any test or
// source module. picocolors decides whether to emit color once, at import
// time, so NO_COLOR must be set here — before usage.js pulls in picocolors —
// to keep asserted usage strings free of ANSI escape codes.
process.env.NO_COLOR = '1';
