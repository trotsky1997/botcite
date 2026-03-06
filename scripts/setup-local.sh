#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZOTERO_DIR="${ZOTERO_DIR:-$(cd "$ROOT_DIR/.." && pwd)/zotero}"
CN_TRANSLATORS_DIR="${CN_TRANSLATORS_DIR:-$(cd "$ROOT_DIR/.." && pwd)/translators_CN}"
LOCAL_TRANSLATORS_DIR="${LOCAL_TRANSLATORS_DIR:-$ROOT_DIR/.local/translators}"

require_cmd() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "missing required command: $1" >&2
		exit 1
	fi
}

require_cmd git
require_cmd node
require_cmd bun

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "$NODE_MAJOR" != "20" && "$NODE_MAJOR" != "22" ]]; then
	echo "unsupported Node.js version: $(node -v)" >&2
	echo "citoid expects Node 20 or 22" >&2
	exit 1
fi

mkdir -p "$ROOT_DIR/.local/logs" "$ROOT_DIR/.local/run"

echo "[1/4] installing citoid dependencies"
( cd "$ROOT_DIR" && bun install )

if [[ ! -d "$ZOTERO_DIR/.git" ]]; then
	echo "[2/4] cloning zotero translation server into $ZOTERO_DIR"
	git clone https://gitlab.wikimedia.org/repos/mediawiki/services/zotero.git "$ZOTERO_DIR"
else
	echo "[2/4] zotero repo already present at $ZOTERO_DIR"
fi

echo "[3/4] syncing zotero submodules"
( cd "$ZOTERO_DIR" && git submodule update --init --recursive )

echo "[4/4] installing zotero dependencies"
( cd "$ZOTERO_DIR" && bun install )

if [[ ! -d "$CN_TRANSLATORS_DIR/.git" ]]; then
	echo "[extra] cloning Chinese translators into $CN_TRANSLATORS_DIR"
	git clone https://github.com/l0o0/translators_CN.git "$CN_TRANSLATORS_DIR"
else
	echo "[extra] updating Chinese translators at $CN_TRANSLATORS_DIR"
	( cd "$CN_TRANSLATORS_DIR" && git pull --ff-only )
fi

echo "[extra] rebuilding merged translators directory at $LOCAL_TRANSLATORS_DIR"
rm -rf "$LOCAL_TRANSLATORS_DIR"
mkdir -p "$LOCAL_TRANSLATORS_DIR"
find "$ZOTERO_DIR/modules/translators" -maxdepth 1 -type f -name '*.js' -exec cp -f {} "$LOCAL_TRANSLATORS_DIR/" \;
find "$CN_TRANSLATORS_DIR" -maxdepth 1 -type f -name '*.js' -exec cp -f {} "$LOCAL_TRANSLATORS_DIR/" \;

cat <<EOF

local setup complete
zotero dir: $ZOTERO_DIR
merged translators dir: $LOCAL_TRANSLATORS_DIR

next:
  npx --no-install citoid-local cite bibtex 10.1145/3368089.3409741
  npx --no-install citoid-local api '/_info'
EOF
