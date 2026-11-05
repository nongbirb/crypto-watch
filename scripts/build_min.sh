#!/usr/bin/env bash
# Minify app JS into min/ (served by index.html). Run after editing any *.js; the "build" GitHub Action also runs it on push.
set -euo pipefail
cd "$(dirname "$0")/.."
for f in i18n onchain interop leverage app extra wallets narrative patterns smartmoney positioning; do
  npx --yes terser@5 "$f.js" --compress passes=2 --mangle --ecma 2020 --comments false -o "min/$f.js"
  node --check "min/$f.js"
done
ls -l min
