/**
 * Construye el sitio de progreso de Copolero.
 *
 * Toma los documentos de docs/ y los publica como HTML en sitio/, más un índice
 * con el estado de los hitos. Lo despliega GitHub Pages en cada push (ver
 * .github/workflows/pages.yml), así que Bebo puede seguir el avance sin
 * clonar nada ni instalar nada.
 *
 *   node scripts/construir-sitio.mjs
 */

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { marked } from 'marked';

const RAIZ = new URL('..', import.meta.url).pathname;
const DIR_DOCS = join(RAIZ, 'docs');
const DIR_SALIDA = join(RAIZ, 'sitio');
const ARCHIVO_PEDIDOS = join(DIR_DOCS, 'pedidos-alan.json');

/** Orden y presentación de los documentos en el índice. */
const DOCUMENTOS = [
	{
		archivo: 'diseno-tecnico.md',
		titulo: 'Diseño técnico',
		bajada: 'Las decisiones tomadas: economías, fases, motor, puntajes, stack y modelo de datos.'
	},
	{
		archivo: 'diseno-inicial.md',
		titulo: 'Diseño inicial',
		bajada: 'El documento de arranque de Alan: motor de eventos, información oculta y confianza.'
	},
	{
		archivo: 'spec-bebo.md',
		titulo: 'Spec de Bebo',
		bajada: 'El pedido de MVP: cartera, staff, resumen de temporada y capa narrativa.'
	}
];

/** Estado de los hitos, tal como están definidos en el diseño técnico. */
const HITOS = [
	{
		id: 'M0',
		estado: 'listo',
		que: 'Crear partida, código de invitación, dos roles, las tres fases con barrera'
	},
	{
		id: 'M1',
		estado: 'listo',
		que: 'Temporada simulada, progresión de atributos y la rueda de ocasión'
	},
	{
		id: 'M2',
		estado: 'en curso',
		que: 'Ofertas y pases (listo); falta renovación y el contrato de representación'
	},
	{
		id: 'M3',
		estado: 'pendiente',
		que: 'Las dos economías: entorno del futbolista, agencia del representante'
	},
	{
		id: 'M4',
		estado: 'pendiente',
		que: 'Fin de temporada con capa narrativa y confianza de punta a punta'
	},
	{
		id: 'M5',
		estado: 'pendiente',
		que: 'Retiro, los dos puntajes y la comparación con una figura histórica'
	},
	{
		id: 'M6',
		estado: 'en curso',
		que: 'Contenido: el mundo real y su mercado (listo); faltan los 120 eventos'
	}
];

const ESTILOS = `
:root {
  --fondo: #0d1117;
  --fondo-tarjeta: #161b22;
  --borde: #272e38;
  --texto: #e6edf3;
  --texto-tenue: #9aa7b4;
  --acento: #4ade80;
  --acento-tenue: #1f6f43;
  --alerta: #fbbf24;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--fondo);
  color: var(--texto);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  line-height: 1.65;
  -webkit-text-size-adjust: 100%;
}
.envoltorio { max-width: 46rem; margin: 0 auto; padding: 2rem 1.25rem 5rem; }
a { color: var(--acento); }
h1, h2, h3, h4 { line-height: 1.2; font-weight: 800; letter-spacing: -0.02em; }
h1 { font-size: clamp(2rem, 7vw, 3rem); margin: 0 0 .5rem; }
h2 { font-size: clamp(1.4rem, 4.5vw, 1.9rem); margin: 2.75rem 0 .75rem; padding-top: 1.25rem; border-top: 1px solid var(--borde); }
h3 { font-size: 1.15rem; margin: 2rem 0 .5rem; color: var(--acento); }
h4 { font-size: 1rem; margin: 1.5rem 0 .4rem; }
p, li { font-size: 1rem; }
code {
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde);
  border-radius: 4px;
  padding: .1em .35em;
  font-size: .875em;
}
pre {
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde);
  border-radius: 10px;
  padding: 1rem;
  overflow-x: auto;
}
pre code { background: none; border: 0; padding: 0; }
blockquote {
  margin: 1.25rem 0;
  padding: .25rem 0 .25rem 1rem;
  border-left: 3px solid var(--acento-tenue);
  color: var(--texto-tenue);
}
.tabla-scroll { overflow-x: auto; margin: 1.25rem 0; }
table { border-collapse: collapse; width: 100%; font-size: .9rem; }
th, td { border: 1px solid var(--borde); padding: .5rem .7rem; text-align: left; vertical-align: top; }
th { background: var(--fondo-tarjeta); font-weight: 700; }
hr { border: 0; border-top: 1px solid var(--borde); margin: 2.5rem 0; }
.bajada { color: var(--texto-tenue); font-size: 1.05rem; margin-top: 0; }
.volver { display: inline-block; margin-bottom: 2rem; color: var(--texto-tenue); text-decoration: none; font-size: .9rem; }
.volver:hover { color: var(--acento); }
.tarjetas { display: grid; gap: 1rem; margin: 1.5rem 0 0; padding: 0; list-style: none; }
.tarjeta {
  display: block;
  background: var(--fondo-tarjeta);
  border: 1px solid var(--borde);
  border-radius: 12px;
  padding: 1.1rem 1.25rem;
  text-decoration: none;
  color: inherit;
}
.tarjeta:hover { border-color: var(--acento-tenue); }
.tarjeta strong { display: block; font-size: 1.15rem; color: var(--acento); margin-bottom: .2rem; }
.tarjeta span { color: var(--texto-tenue); font-size: .95rem; }
.hitos { list-style: none; padding: 0; margin: 1.5rem 0 0; }
.hito { display: flex; gap: .85rem; align-items: baseline; padding: .7rem 0; border-bottom: 1px solid var(--borde); }
.hito-id { font-weight: 800; font-variant-numeric: tabular-nums; min-width: 2.2rem; }
.hito-que { flex: 1; }
.pill { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; padding: .18rem .5rem; border-radius: 999px; white-space: nowrap; }
.pill-curso { background: rgba(251,191,36,.14); color: var(--alerta); border: 1px solid rgba(251,191,36,.3); }
.pill-listo { background: rgba(74,222,128,.14); color: var(--acento); border: 1px solid rgba(74,222,128,.3); }
.pill-pendiente { background: rgba(154,167,180,.1); color: var(--texto-tenue); border: 1px solid var(--borde); }
.nota { color: var(--texto-tenue); font-size: .9rem; margin-top: 3rem; padding-top: 1.25rem; border-top: 1px solid var(--borde); }
.pill-backlog { background: rgba(154,167,180,.1); color: var(--texto-tenue); border: 1px solid var(--borde); }
.fila-pedido td:first-child { font-variant-numeric: tabular-nums; color: var(--texto-tenue); }
.fila-pedido .area { color: var(--texto-tenue); white-space: nowrap; }
.fila-pedido .obs { color: var(--texto-tenue); font-size: .88rem; }
`;

function pagina({ titulo, cuerpo, descripcion = '' }) {
	return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(titulo)}</title>
${descripcion ? `<meta name="description" content="${escapar(descripcion)}">` : ''}
<style>${ESTILOS}</style>
</head>
<body>
<div class="envoltorio">
${cuerpo}
</div>
</body>
</html>
`;
}

function escapar(texto) {
	return texto.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
	);
}

/** Envuelve las tablas para que scrolleen solas en el celular. */
function envolverTablas(html) {
	return html.replace(/<table>[\s\S]*?<\/table>/g, (t) => `<div class="tabla-scroll">${t}</div>`);
}

function claseDeEstado(estado) {
	if (estado === 'en curso') return 'pill-curso';
	if (estado === 'listo') return 'pill-listo';
	return 'pill-pendiente';
}

/**
 * Si un pedido ya está resuelto, para el orden y el color del pill.
 *
 * Sólo estos dos estados cierran un pedido. Los otros cuatro —Pendiente,
 * Pendiente de decisión, Pendiente de charla, Backlog— siguen abiertos aunque
 * cada uno lo esté por un motivo distinto.
 */
const ESTADOS_CERRADOS = new Set(['Implementado', 'Confirmado · sin cambios']);

function claseDelPedido(estado) {
	if (ESTADOS_CERRADOS.has(estado)) return 'pill-listo';
	if (estado === 'Backlog') return 'pill-backlog';
	return 'pill-pendiente';
}

/**
 * Lo que anda hoy, sacado del README.
 *
 * Se lee de ahí a propósito: es el texto que se actualiza cuando se agrega algo
 * al juego, así que la página no puede quedar contando una versión vieja.
 */
async function queAndaHoy() {
	const readme = await readFile(join(RAIZ, 'README.md'), 'utf8');
	const desde = readme.indexOf('## Qué anda hoy');
	if (desde === -1) return '';
	const hasta = readme.indexOf('\n## ', desde + 5);
	const trozo = readme.slice(desde, hasta === -1 ? undefined : hasta);
	// El h2 del README pasa a ser el h2 de la página, con el mismo estilo.
	return envolverTablas(marked.parse(trozo));
}

/**
 * La página del checklist: lo pendiente arriba, lo hecho abajo.
 *
 * Alan lo pidió así después de que le mandé el Excel un par de veces por
 * chat: "quiero que en la pages de github incluyamos el excel de seguimiento
 * de pendientes (lo pendiente arriba lo hecho abajo)". El Excel en sí no se
 * lee en el navegador —GitHub Pages lo ofrece para descargar y ahí se
 * queda—, así que esto lee el JSON que exporta `scripts/exportar-pedidos.py`
 * y arma la tabla.
 *
 * Dentro de "pendiente" se ordena por prioridad (1 primero); los que no
 * tienen —charla, decisión, backlog— quedan al final del grupo, en el orden
 * en que se pidieron. Dentro de "hecho" no hay nada que ordenar más que
 * cuándo se pidió, así que queda tal cual.
 */
async function construirPedidos() {
	let datos;
	try {
		datos = JSON.parse(await readFile(ARCHIVO_PEDIDOS, 'utf8'));
	} catch {
		return null;
	}

	const filas = datos.filas ?? [];
	const abiertas = filas.filter((f) => !ESTADOS_CERRADOS.has(f.estado));
	const cerradas = filas.filter((f) => ESTADOS_CERRADOS.has(f.estado));

	abiertas.sort((a, b) => (a.prioridad ?? 99) - (b.prioridad ?? 99));

	const filaHtml = (f) => `  <tr class="fila-pedido">
    <td>#${f.numero}</td>
    <td class="area">${escapar(f.area)}</td>
    <td>${escapar(f.pedido)}</td>
    <td><span class="pill ${claseDelPedido(f.estado)}">${escapar(f.estado)}</span></td>
    <td class="obs">${escapar(f.observaciones)}</td>
  </tr>`;

	const cuerpo = `<a class="volver" href="./index.html">← Volver al estado del proyecto</a>
<h1>Los pedidos de Alan</h1>
<p class="bajada">Todo lo que pidió, con su estado y qué se hizo. Lo que
todavía está abierto va primero, ordenado por prioridad; lo ya resuelto queda
al final.</p>

<h2>Abierto — ${abiertas.length}</h2>
<div class="tabla-scroll">
<table>
<thead><tr><th>#</th><th>Área</th><th>Pedido</th><th>Estado</th><th>Observaciones</th></tr></thead>
<tbody>
${abiertas.map(filaHtml).join('\n')}
</tbody>
</table>
</div>

<h2>Resuelto — ${cerradas.length}</h2>
<div class="tabla-scroll">
<table>
<thead><tr><th>#</th><th>Área</th><th>Pedido</th><th>Estado</th><th>Observaciones</th></tr></thead>
<tbody>
${cerradas.map(filaHtml).join('\n')}
</tbody>
</table>
</div>

<p class="nota">Se genera desde <code>docs/pedidos-alan.xlsx</code> —donde de
verdad se edita, con fórmulas y todo— vía
<code>scripts/exportar-pedidos.py</code>. Esta página no se toca a mano.</p>`;

	return pagina({
		titulo: 'Los pedidos de Alan — Copolero',
		descripcion: 'El checklist de pedidos: lo abierto primero, lo resuelto al final.',
		cuerpo
	});
}

async function construirIndice(docsPresentes, hayPedidos) {
	const tarjetas = DOCUMENTOS.filter((d) => docsPresentes.has(d.archivo))
		.map(
			(d) => `  <li><a class="tarjeta" href="./${d.archivo.replace(/\.md$/, '.html')}">
    <strong>${escapar(d.titulo)}</strong>
    <span>${escapar(d.bajada)}</span>
  </a></li>`
		)
		.join('\n');

	const hitos = HITOS.map(
		(h) => `  <li class="hito">
    <span class="hito-id">${h.id}</span>
    <span class="hito-que">${escapar(h.que)}</span>
    <span class="pill ${claseDeEstado(h.estado)}">${escapar(h.estado)}</span>
  </li>`
	).join('\n');

	const cuerpo = `<h1>Copolero</h1>
<p class="bajada">Juego de carrera de futbolista para dos personas: uno es el
futbolista, el otro es su representante. Por turnos, asincrónico, en el navegador.</p>

${await queAndaHoy()}

<h2>Hitos</h2>
<ul class="hitos">
${hitos}
</ul>

${
	hayPedidos
		? `<h2>Pedidos</h2>
<ul class="tarjetas">
  <li><a class="tarjeta" href="./pedidos-alan.html">
    <strong>Los pedidos de Alan</strong>
    <span>El checklist de seguimiento: lo abierto primero, lo resuelto al final.</span>
  </a></li>
</ul>`
		: ''
}

<h2>Documentos</h2>
<ul class="tarjetas">
${tarjetas}
</ul>

<p class="nota">Esta página se regenera sola en cada push al repositorio.
El juego en sí no vive acá: necesita servidor y base de datos, así que corre
aparte. Código en <a href="https://github.com/alanpomato/Copolero">github.com/alanpomato/Copolero</a>.</p>`;

	return pagina({
		titulo: 'Copolero — estado del proyecto',
		descripcion: 'Juego de carrera de futbolista para dos personas: futbolista y representante.',
		cuerpo
	});
}

async function main() {
	await rm(DIR_SALIDA, { recursive: true, force: true });
	await mkdir(DIR_SALIDA, { recursive: true });

	const archivos = (await readdir(DIR_DOCS)).filter((a) => a.endsWith('.md'));
	const presentes = new Set(archivos);

	for (const archivo of archivos) {
		const markdown = await readFile(join(DIR_DOCS, archivo), 'utf8');
		const meta = DOCUMENTOS.find((d) => d.archivo === archivo);
		const titulo = meta ? `${meta.titulo} — Copolero` : `${archivo} — Copolero`;

		const cuerpo = `<a class="volver" href="./index.html">← Volver al estado del proyecto</a>
${envolverTablas(marked.parse(markdown))}`;

		await writeFile(
			join(DIR_SALIDA, archivo.replace(/\.md$/, '.html')),
			pagina({ titulo, descripcion: meta?.bajada ?? '', cuerpo }),
			'utf8'
		);
	}

	const pedidosHtml = await construirPedidos();
	if (pedidosHtml) {
		await writeFile(join(DIR_SALIDA, 'pedidos-alan.html'), pedidosHtml, 'utf8');
	}

	await writeFile(
		join(DIR_SALIDA, 'index.html'),
		await construirIndice(presentes, pedidosHtml !== null),
		'utf8'
	);
	// GitHub Pages usa Jekyll por defecto y se saltea lo que empieza con guion bajo.
	await writeFile(join(DIR_SALIDA, '.nojekyll'), '', 'utf8');

	console.log(`Sitio construido en sitio/ (${archivos.length + 1} páginas).`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
