# Baja Copolero y lo levanta en tu propia máquina, para verlo.  Windows.
#
#   irm https://raw.githubusercontent.com/alanpomato/Copolero/main/deploy/probar-local.ps1 | iex
#
# La primera vez clona y compila (tarda un par de minutos). Las siguientes solo
# baja lo nuevo. Necesita Node 22+ y git instalados.

$ErrorActionPreference = 'Stop'

$repositorio = 'https://github.com/alanpomato/Copolero.git'
$rama = if ($env:RAMA) { $env:RAMA } else { 'main' }
$carpeta = if ($env:CARPETA) { $env:CARPETA } else { Join-Path $HOME 'Copolero' }

function Paso($texto) { Write-Host "`n> $texto" -ForegroundColor Cyan }
function Falta($que, $donde) {
	Write-Host "Falta $que." -ForegroundColor Red
	Write-Host "  Instalalo desde $donde y volvé a correr esto."
	exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
	Falta 'git' 'https://git-scm.com'
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
	Falta 'Node' 'https://nodejs.org (versión LTS)'
}

$versionNode = [int]((node -v) -replace '^v(\d+)\..*$', '$1')
if ($versionNode -lt 22) {
	Write-Host "Tenés Node $(node -v) y hace falta 22 o más nuevo." -ForegroundColor Red
	Write-Host '  Actualizalo desde https://nodejs.org'
	exit 1
}

if (Test-Path (Join-Path $carpeta '.git')) {
	Paso "Bajando lo último a $carpeta"
	git -C $carpeta fetch --quiet origin $rama
	git -C $carpeta checkout --quiet -B $rama "origin/$rama"
} else {
	Paso "Clonando en $carpeta"
	git clone --quiet --branch $rama $repositorio $carpeta
}

Set-Location $carpeta

Paso 'Instalando dependencias (esto tarda)'
npm ci --silent

if (-not (Test-Path '.env')) { Copy-Item '.env.example' '.env' }

Write-Host @'

Listo. Arrancando el juego.

  Abrí:  http://localhost:5173
  Cortá: Ctrl + C

Para probar los dos roles vos solo, creá la partida en una ventana normal y
abrí el link de invitación en una ventana de incógnito.

'@ -ForegroundColor Green

npm run dev
