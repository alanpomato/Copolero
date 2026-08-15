#!/usr/bin/env bash
#
# Instala Copolero en un servidor Ubuntu recién creado. Se corre una sola vez.
#
#   sudo bash instalar.sh copolero.midominio.com
#   sudo bash instalar.sh 203.0.113.10            # sin dominio, solo HTTP
#   sudo bash instalar.sh copolero.midominio.com claude/buenas-9b6dk2
#
# Deja andando:
#   - Node 22 y la aplicación como servicio de systemd, que arranca sola si el
#     servidor se reinicia.
#   - Caddy adelante, con certificado HTTPS automático si le diste un dominio.
#   - La base SQLite en /var/lib/copolero, separada del código.
#
# Es seguro volver a correrlo: no pisa la base de datos.

set -euo pipefail

REPOSITORIO="https://github.com/alanpomato/Copolero.git"
DOMINIO="${1:-}"
RAMA="${2:-main}"

USUARIO="copolero"
DIR_CODIGO="/opt/copolero"
DIR_DATOS="/var/lib/copolero"
ARCHIVO_ENTORNO="/etc/copolero.env"
PUERTO_INTERNO=3000

rojo() { printf '\033[1;31m%s\033[0m\n' "$*"; }
verde() { printf '\033[1;32m%s\033[0m\n' "$*"; }
paso() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
	rojo "Esto hay que correrlo como root. Probá:  sudo bash $0 $*"
	exit 1
fi

if [[ -z "$DOMINIO" ]]; then
	rojo "Falta decirle el dominio (o la IP) del servidor."
	echo "  sudo bash $0 copolero.midominio.com"
	echo "  sudo bash $0 203.0.113.10"
	exit 1
fi

# Si es una IP no hay certificado posible: Caddy sirve por HTTP a secas.
if [[ "$DOMINIO" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	ES_IP=true
	ORIGEN="http://$DOMINIO"
	DIRECTIVA_CADDY=":80"
else
	ES_IP=false
	ORIGEN="https://$DOMINIO"
	DIRECTIVA_CADDY="$DOMINIO"
fi

paso "Actualizando el sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https

paso "Instalando Node 22"
if ! command -v node > /dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]]; then
	curl -fsSL https://deb.nodesource.com/setup_22.x | bash - > /dev/null
	apt-get install -y -qq nodejs
fi
echo "  Node $(node -v)"

paso "Instalando Caddy"
if ! command -v caddy > /dev/null; then
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' |
		gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
		> /etc/apt/sources.list.d/caddy-stable.list
	apt-get update -qq
	apt-get install -y -qq caddy
fi

paso "Creando el usuario del servicio"
if ! id "$USUARIO" > /dev/null 2>&1; then
	useradd --system --create-home --home-dir "/home/$USUARIO" --shell /usr/sbin/nologin "$USUARIO"
fi
install -d -o "$USUARIO" -g "$USUARIO" -m 750 "$DIR_DATOS"

paso "Bajando el código (rama $RAMA)"
if [[ -d "$DIR_CODIGO/.git" ]]; then
	git -C "$DIR_CODIGO" remote set-url origin "$REPOSITORIO"
	git -C "$DIR_CODIGO" fetch --quiet origin "$RAMA"
	git -C "$DIR_CODIGO" checkout --quiet -B "$RAMA" "origin/$RAMA"
else
	git clone --quiet --branch "$RAMA" "$REPOSITORIO" "$DIR_CODIGO"
fi
chown -R "$USUARIO:$USUARIO" "$DIR_CODIGO"

paso "Compilando"
sudo -u "$USUARIO" bash -c "cd '$DIR_CODIGO' && npm ci --silent && npm run build --silent"

paso "Escribiendo la configuración"
# ORIGIN es obligatorio: sin eso SvelteKit rechaza los formularios por CSRF.
cat > "$ARCHIVO_ENTORNO" <<ENTORNO
DATABASE_URL=$DIR_DATOS/copolero.db
ORIGIN=$ORIGEN
PORT=$PUERTO_INTERNO
HOST=127.0.0.1
NODE_ENV=production
ENTORNO
chmod 640 "$ARCHIVO_ENTORNO"
chown root:"$USUARIO" "$ARCHIVO_ENTORNO"

install -m 644 "$DIR_CODIGO/deploy/copolero.service" /etc/systemd/system/copolero.service

cat > /etc/caddy/Caddyfile <<CADDY
# Generado por deploy/instalar.sh
$DIRECTIVA_CADDY {
	encode zstd gzip
	reverse_proxy 127.0.0.1:$PUERTO_INTERNO
}
CADDY

paso "Arrancando"
systemctl daemon-reload
systemctl enable --now copolero > /dev/null
systemctl restart copolero
systemctl reload caddy 2> /dev/null || systemctl restart caddy

sleep 2
if ! systemctl is-active --quiet copolero; then
	rojo "El servicio no arrancó. Mirá qué pasó con:"
	echo "  journalctl -u copolero -n 50 --no-pager"
	exit 1
fi

verde "
Listo. Copolero está andando en $ORIGEN
"
if [[ "$ES_IP" == true ]]; then
	echo "Sin dominio no hay HTTPS. Cuando tengas uno, apuntalo a este servidor y"
	echo "volvé a correr este script con el dominio en vez de la IP."
else
	echo "El certificado HTTPS lo saca Caddy solo. Si recién apuntaste el dominio,"
	echo "puede tardar un minuto en estar listo."
fi
echo "
  Ver los logs:      journalctl -u copolero -f
  Reiniciar:         systemctl restart copolero
  Actualizar:        bash $DIR_CODIGO/deploy/actualizar.sh
  Respaldar la base: sqlite3 $DIR_DATOS/copolero.db \".backup respaldo.db\"
"
