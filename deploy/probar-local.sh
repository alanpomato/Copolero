#!/usr/bin/env bash
#
# Baja Copolero y lo levanta en tu propia máquina, para verlo.  Mac y Linux.
#
#   curl -fsSL https://raw.githubusercontent.com/alanpomato/Copolero/claude/buenas-9b6dk2/deploy/probar-local.sh | bash
#
# La primera vez clona y compila (tarda un par de minutos). Las siguientes solo
# baja lo nuevo. Necesita Node 22+ y git instalados.

set -euo pipefail

REPOSITORIO="https://github.com/alanpomato/Copolero.git"
# La rama donde vive el juego.
#
# `main` todavía tiene sólo el commit inicial: todo el juego está en la rama de
# trabajo. Mientras siga así, ése es el default, porque bajar `main` te deja con
# un proyecto vacío y el error no dice eso en ningún lado. El día que esto se
# mergee a `main`, se cambia esta línea y nada más.
RAMA_POR_DEFECTO="claude/buenas-9b6dk2"
RAMA="${RAMA:-$RAMA_POR_DEFECTO}"
CARPETA="${CARPETA:-$HOME/Copolero}"

rojo() { printf '\033[1;31m%s\033[0m\n' "$*"; }
verde() { printf '\033[1;32m%s\033[0m\n' "$*"; }
paso() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }

falta() {
	rojo "Falta $1."
	echo "  Instalalo desde $2 y volvé a correr esto."
	exit 1
}

command -v git > /dev/null || falta "git" "https://git-scm.com"
command -v node > /dev/null || falta "Node" "https://nodejs.org (versión LTS)"

VERSION_NODE="$(node -v | cut -d. -f1 | tr -d v)"
if [[ "$VERSION_NODE" -lt 22 ]]; then
	rojo "Tenés Node $(node -v) y hace falta 22 o más nuevo."
	echo "  Actualizalo desde https://nodejs.org"
	exit 1
fi

if [[ -d "$CARPETA/.git" ]]; then
	paso "Bajando lo último a $CARPETA"
	git -C "$CARPETA" fetch --quiet origin "$RAMA"
	git -C "$CARPETA" checkout --quiet -B "$RAMA" "origin/$RAMA"
else
	paso "Clonando en $CARPETA"
	git clone --quiet --branch "$RAMA" "$REPOSITORIO" "$CARPETA"
fi

cd "$CARPETA"

paso "Instalando dependencias (esto tarda)"
npm ci --silent

[[ -f .env ]] || cp .env.example .env

verde "
Listo. Arrancando el juego.

  Abrí:  http://localhost:5173
  Cortá: Ctrl + C

Para probar los dos roles vos solo, creá la partida en una ventana normal y
abrí el link de invitación en una ventana de incógnito.
"

npm run dev
