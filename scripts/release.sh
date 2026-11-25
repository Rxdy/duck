#!/usr/bin/env bash
# Publie une version : pose le tag vX.Y.Z sur main et le pousse. La CI fait le reste (voir .github/workflows/release.yml).
# Usage : make release V=1.2.3
set -euo pipefail

V="${1:-}"
echec() { echo "Échec : $1" >&2; exit 1; }

[[ "$V" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || echec "version attendue au format X.Y.Z (make release V=1.2.3)"
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || echec "il faut être sur main"
[ -z "$(git status --porcelain)" ] || echec "des modifications ne sont pas commitées"

git fetch -q origin main --tags
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || echec "main n'est pas identique à origin/main (pousser ou récupérer d'abord)"
git rev-parse -q --verify "refs/tags/v$V" > /dev/null && echec "le tag v$V existe déjà"

echo "Release v$V sur $(git rev-parse --short HEAD) : $(git log -1 --format=%s)"
git tag -a "v$V" -m "Version $V"
git push origin "v$V"
echo "Tag poussé. La CI publie les images v$V et crée la release."
