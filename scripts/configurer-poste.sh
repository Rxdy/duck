#!/usr/bin/env bash
# Configure un poste de développement UNE fois pour toutes. Relançable sans risque : chaque étape déjà
# faite est passée. Rien de secret n'est dans le dépôt : la connexion GitHub se fait dans le navigateur,
# et gh la garde ensuite sur ce poste.
set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="$HOME/.local/bin:$PATH"

echo "== Outils"
for outil in git node npm docker; do
  command -v "$outil" >/dev/null || { echo "Il manque « $outil » : installe-le puis relance." >&2; exit 1; }
done

if ! command -v gh >/dev/null; then
  echo "== Installation de gh dans ~/.local/bin (sans sudo, empreinte vérifiée)"
  case "$(uname -m)" in x86_64) arch=amd64 ;; aarch64|arm64) arch=arm64 ;; *) echo "Architecture non gérée." >&2; exit 1 ;; esac
  version=2.106.0
  base="https://github.com/cli/cli/releases/download/v$version"
  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT
  curl -fsSL -o "$tmp/gh_${version}_linux_$arch.tar.gz" "$base/gh_${version}_linux_$arch.tar.gz"
  curl -fsSL -o "$tmp/sommes.txt" "$base/gh_${version}_checksums.txt"
  (cd "$tmp" && grep " gh_${version}_linux_$arch.tar.gz\$" sommes.txt | sha256sum -c -)
  tar -xzf "$tmp/gh_${version}_linux_$arch.tar.gz" -C "$tmp"
  install -D -m755 "$tmp/gh_${version}_linux_$arch/bin/gh" "$HOME/.local/bin/gh"
fi

echo "== Identité Git"
if [ -z "$(git config --global user.name || true)" ] || [ -z "$(git config --global user.email || true)" ]; then
  # Par défaut, celle du dernier commit du dépôt (à changer si ce n'est pas toi).
  nom=$(git log -1 --format=%an) mail=$(git log -1 --format=%ae)
  read -r -p "Nom [$nom] : " saisie; nom=${saisie:-$nom}
  read -r -p "Email [$mail] : " saisie; mail=${saisie:-$mail}
  git config --global user.name "$nom"
  git config --global user.email "$mail"
fi
echo "$(git config --global user.name) <$(git config --global user.email)>"

echo "== Connexion GitHub"
gh auth status --hostname github.com >/dev/null 2>&1 \
  || gh auth login --hostname github.com --git-protocol https --web
gh auth setup-git --hostname github.com
echo "Connecté, et Git s'en sert pour pousser."

echo "== Dépendances du projet"
make --no-print-directory install

echo
echo "Poste prêt. « make dev » lance le jeu sur http://localhost:5173."
