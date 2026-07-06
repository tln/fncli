#!/usr/bin/env bash
#
# Launch an interactive subshell with the demo CLI and its completion loaded,
# so you can actually press TAB. Nothing is written to your real rc files; the
# temp setup is removed on exit.
#
#   ./run-demo.sh            # uses $SHELL (bash/zsh/fish)
#   ./run-demo.sh zsh        # force a shell
#
# Inside, try:   demo <TAB>    demo config --<TAB>    demo ssh <TAB>
# Leave with:    exit   (or Ctrl-D)

set -u
DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
DEMO="$DIR/demo.js"

shell_name="${1:-$(basename "${SHELL:-zsh}")}"
tmp="$(mktemp -d "${TMPDIR:-/tmp}/fncli-demo.XXXXXX")"
trap 'rm -rf "$tmp"' EXIT

hint="fncli completions demo — try:  demo <TAB>   demo config --<TAB>   demo ssh <TAB>   (exit to leave)"

case "$shell_name" in
  zsh)
    cat > "$tmp/.zshrc" <<EOF
demo() { node "$DEMO" "\$@"; }
autoload -U compinit && compinit -u
eval "\$(demo completions script zsh)"
PROMPT='%F{cyan}(demo)%f %~ %# '
print -P "%F{cyan}$hint%f"
EOF
    ZDOTDIR="$tmp" zsh -i
    ;;
  bash)
    cat > "$tmp/bashrc" <<EOF
demo() { node "$DEMO" "\$@"; }
eval "\$(demo completions script bash)"
PS1='(demo) \w \$ '
echo "$hint"
EOF
    bash --noprofile --rcfile "$tmp/bashrc" -i
    ;;
  fish)
    cat > "$tmp/setup.fish" <<EOF
function demo; node "$DEMO" \$argv; end
demo completions script fish | source
function fish_prompt; echo -n '(demo) '; end
function fish_greeting; end
echo "$hint"
EOF
    fish -N -i -C "source '$tmp/setup.fish'"
    ;;
  *)
    echo "run-demo.sh: unsupported shell '$shell_name' (use: zsh | bash | fish)" >&2
    exit 1
    ;;
esac
