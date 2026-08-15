#!/usr/bin/env bash
#
# Despliega la última versión en un servidor ya instalado.
#
#   sudo bash /opt/copolero/deploy/actualizar.sh
#   sudo bash /opt/copolero/deploy/actualizar.sh claude/buenas-9b6dk2
#
# Baja el código, compila y reinicia. Si algo falla, deja el servicio como
# estaba: no reinicia con un build roto.

set -euo pipefail

DIR_CODIGO="/opt/copolero"
USUARIO="copolero"
RAMA="${1:-}"

rojo() { printf '\033[1;31m%s\033[0m\n' "$*"; }
verde() { printf '\033[1;32m%s\033[0m\n' "$*"; }
paso() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
	rojo "Corré esto como root:  sudo bash $0 $*"
	exit 1
fi

if [[ ! -d "$DIR_CODIGO/.git" ]]; then
	rojo "No encuentro la instalación en $DIR_CODIGO."
	echo "¿Corriste deploy/instalar.sh primero?"
	exit 1
fi

# El repositorio es del usuario del servicio pero git corre como root: hay que
# declararlo confiable o git se niega ("dubious ownership").
git config --global --get-all safe.directory 2> /dev/null | grep -qx "$DIR_CODIGO" ||
	git config --global --add safe.directory "$DIR_CODIGO"

# Si no dijeron rama, seguimos en la que ya estaba.
if [[ -z "$RAMA" ]]; then
	RAMA="$(git -C "$DIR_CODIGO" rev-parse --abbrev-ref HEAD)"
fi

ANTERIOR="$(git -C "$DIR_CODIGO" rev-parse HEAD)"

paso "Bajando la rama $RAMA"
git -C "$DIR_CODIGO" fetch --quiet origin "$RAMA"
git -C "$DIR_CODIGO" checkout --quiet -B "$RAMA" "origin/$RAMA"
chown -R "$USUARIO:$USUARIO" "$DIR_CODIGO"

NUEVO="$(git -C "$DIR_CODIGO" rev-parse HEAD)"
if [[ "$ANTERIOR" == "$NUEVO" ]]; then
	verde "Ya estaba al día ($(git -C "$DIR_CODIGO" log -1 --format=%s))."
	exit 0
fi

compilar() {
	sudo -u "$USUARIO" bash -c "cd '$DIR_CODIGO' && npm ci --silent && npm run build --silent"
}

paso "Compilando"
if ! compilar; then
	rojo "Falló la compilación."
	# Un build a medias deja build/ roto, así que no alcanza con no reiniciar:
	# hay que volver al commit anterior y recompilarlo, para que el servicio
	# quede sano si alguien lo reinicia después.
	paso "Volviendo a $(git -C "$DIR_CODIGO" log -1 --format=%h "$ANTERIOR") y recompilando"
	git -C "$DIR_CODIGO" checkout --quiet --force "$ANTERIOR"
	chown -R "$USUARIO:$USUARIO" "$DIR_CODIGO"
	if compilar; then
		rojo "Nada cambió: el servicio sigue con la versión anterior."
	else
		rojo "Tampoco compila la versión anterior. Mirá los logs y arreglalo a mano:"
		echo "  journalctl -u copolero -n 50 --no-pager"
	fi
	exit 1
fi

paso "Reiniciando"
# Las migraciones se aplican solas al arrancar (src/hooks.server.ts).
systemctl restart copolero
sleep 2

if ! systemctl is-active --quiet copolero; then
	rojo "El servicio no levantó. Mirá:  journalctl -u copolero -n 50 --no-pager"
	exit 1
fi

verde "
Desplegado: $(git -C "$DIR_CODIGO" log -1 --format='%h %s')
"
