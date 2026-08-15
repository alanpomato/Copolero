<script lang="ts">
	import { club } from '../../../content/mundo';
	import { EXTENSIONES_DE_ESCUDO, escudoDe } from './escudos';

	/**
	 * El escudo de un club.
	 *
	 * Por defecto es nuestro dibujo: fondo, patrón e iniciales, con los colores
	 * del club. Pero si el que corre el servidor puso un archivo en
	 * `static/escudos/<id-del-club>.png` (o `.svg`, `.webp`), se usa ése.
	 *
	 * La carpeta está fuera de git a propósito: lo que cada uno ponga en su
	 * servidor es cosa suya, y el repo —que es público— no distribuye nada. Ver
	 * `static/escudos/LEEME.md`.
	 */
	let { clubId, tamano = 32 }: { clubId: string; tamano?: number } = $props();

	const escudo = $derived(escudoDe(clubId));
	const nombre = $derived(club(clubId).nombre);

	// Contorno del escudo, en una grilla de 32×36.
	const CONTORNO = 'M2 2 H30 V19 C30 27.5 24.5 32.8 16 35 C7.5 32.8 2 27.5 2 19 Z';
	const id = $derived(`recorte-${clubId}`);

	/**
	 * Se prueban las extensiones una por una y gana la primera que cargue. Si no
	 * carga ninguna —que es lo normal— queda el dibujado, y no se nota nada:
	 * el nuestro se muestra desde el principio y el propio lo tapa recién cuando
	 * está listo.
	 */
	let intento = $state(0);
	let hayPropio = $state(false);

	const candidato = $derived(
		intento < EXTENSIONES_DE_ESCUDO.length
			? `/escudos/${clubId}.${EXTENSIONES_DE_ESCUDO[intento]}`
			: null
	);

	// Cambiar de club vuelve a empezar la búsqueda.
	$effect(() => {
		void clubId;
		intento = 0;
		hayPropio = false;
	});
</script>

{#if candidato}
	<img
		class="propio"
		src={candidato}
		alt={nombre}
		width={tamano}
		height={tamano * 1.125}
		style:display={hayPropio ? 'inline-block' : 'none'}
		onload={() => (hayPropio = true)}
		onerror={() => (intento += 1)}
	/>
{/if}

{#if !hayPropio}
	<svg
		class="escudo"
		viewBox="0 0 32 36"
		width={tamano}
		height={tamano * 1.125}
		role="img"
		aria-label={nombre}
	>
		<title>{nombre}</title>
		<defs>
			<clipPath {id}>
				<path d={CONTORNO} />
			</clipPath>
		</defs>

		<g clip-path="url(#{id})">
			<rect x="0" y="0" width="32" height="36" fill={escudo.principal} />

			{#if escudo.patron === 'bandas'}
				<rect x="4" y="0" width="5" height="36" fill={escudo.secundario} />
				<rect x="14" y="0" width="5" height="36" fill={escudo.secundario} />
				<rect x="24" y="0" width="5" height="36" fill={escudo.secundario} />
			{:else if escudo.patron === 'mitades'}
				<rect x="16" y="0" width="16" height="36" fill={escudo.secundario} />
			{:else if escudo.patron === 'sash'}
				<polygon points="0,26 26,0 32,0 32,6 6,32 0,32" fill={escudo.secundario} />
			{:else if escudo.patron === 'franjas'}
				<rect x="0" y="6" width="32" height="5" fill={escudo.secundario} />
				<rect x="0" y="17" width="32" height="5" fill={escudo.secundario} />
				<rect x="0" y="28" width="32" height="5" fill={escudo.secundario} />
			{:else if escudo.patron === 'aro'}
				<circle cx="16" cy="17" r="11" fill="none" stroke={escudo.secundario} stroke-width="5" />
			{/if}

			<!-- Un brillo suave arriba, para que no quede plano. -->
			<rect x="0" y="0" width="32" height="14" fill="rgba(255,255,255,.10)" />
		</g>

		<path d={CONTORNO} fill="none" stroke="rgba(0,0,0,.45)" stroke-width="2" />
		<path d={CONTORNO} fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1" />

		<text
			x="16"
			y="20"
			text-anchor="middle"
			dominant-baseline="middle"
			font-size={escudo.iniciales.length > 2 ? 11 : 14}
			font-weight="800"
			letter-spacing="-0.4"
			fill={escudo.tinta}
			stroke="rgba(0,0,0,.35)"
			stroke-width="2.4"
			paint-order="stroke"
		>
			{escudo.iniciales}
		</text>
	</svg>
{/if}

<style>
	.propio {
		display: inline-block;
		vertical-align: middle;
		flex: none;
		object-fit: contain;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
	}
	.escudo {
		display: inline-block;
		vertical-align: middle;
		flex: none;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
	}
</style>
