#!/usr/bin/env bash
# Compile helloworld.ts and run it. Pass args through to the CLI.
set -eu
cd "$(dirname "$0")"

npx --yes -p typescript@6 tsc
node dist/helloworld.js "$@"
