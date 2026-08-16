<script lang="ts">
	import type { Foto } from '$lib/engine/portada';
	import { escudoDe } from './escudos';

	/**
	 * La foto de tapa.
	 *
	 * No hay ninguna foto: son escenas dibujadas, en duotono, con los colores del
	 * club de ese año. Es a propósito y no una limitación. Una foto de archivo de
	 * un jugador que no existe se nota siempre; una silueta contra el color de la
	 * camiseta, no, y encima cambia sola cuando lo transfieren.
	 *
	 * Cada escena es la misma grilla de 200×112, así que la tapa no salta de alto
	 * cuando cambia el año.
	 */
	let { foto, clubId, alto = 130 }: { foto: Foto; clubId: string; alto?: number } = $props();

	const c = $derived(escudoDe(clubId));
	const id = $derived(`ilu-${foto}-${clubId}`);

	/** La silueta va siempre en el mismo tono oscuro: es la sombra, no el club. */
	const SOMBRA = '#12161c';
	const SOMBRA_SUAVE = 'rgba(18,22,28,.55)';
</script>

<svg class="ilustracion" viewBox="0 0 200 112" height={alto} role="img" aria-label="Ilustración">
	<defs>
		<linearGradient id={`cielo-${id}`} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color={c.principal} />
			<stop offset="1" stop-color={c.secundario} stop-opacity="0.75" />
		</linearGradient>
		<clipPath id={`marco-${id}`}>
			<rect x="0" y="0" width="200" height="112" rx="3" />
		</clipPath>
	</defs>

	<g clip-path="url(#marco-{id})">
		<rect x="0" y="0" width="200" height="112" fill="url(#cielo-{id})" />

		{#if foto === 'gol'}
			<!-- La red, el arquero vencido y la pelota adentro. -->
			<rect x="112" y="18" width="80" height="72" fill={SOMBRA_SUAVE} />
			{#each [120, 132, 144, 156, 168, 180] as x (x)}
				<line x1={x} y1="18" x2={x} y2="90" stroke="rgba(255,255,255,.35)" stroke-width="0.8" />
			{/each}
			{#each [28, 40, 52, 64, 76, 88] as y (y)}
				<line x1="112" y1={y} x2="192" y2={y} stroke="rgba(255,255,255,.35)" stroke-width="0.8" />
			{/each}
			<circle cx="158" cy="40" r="7" fill="#fff" stroke={SOMBRA} stroke-width="1.5" />
			<!-- El que la metió, de espaldas y con los brazos arriba. -->
			<path
				d="M52 92 L52 64 Q52 54 60 52 L60 40 A8 8 0 1 1 76 40 L76 52 Q84 54 84 64 L84 92 Z"
				fill={SOMBRA}
			/>
			<path d="M56 56 L34 30 L40 26 L62 50 Z M80 56 L102 30 L96 26 L74 50 Z" fill={SOMBRA} />
			<line x1="0" y1="92" x2="200" y2="92" stroke="rgba(255,255,255,.5)" stroke-width="1.5" />
		{:else if foto === 'copa'}
			<!-- Una copa levantada, sin imitar ninguna en particular. -->
			<circle cx="100" cy="52" r="42" fill="rgba(255,255,255,.14)" />
			<path
				d="M84 24 L116 24 L114 46 Q114 58 100 62 Q86 58 86 46 Z"
				fill="#e8c766"
				stroke={SOMBRA}
				stroke-width="1.6"
			/>
			<path d="M84 28 Q72 28 72 38 Q72 46 84 46" fill="none" stroke="#e8c766" stroke-width="4" />
			<path
				d="M116 28 Q128 28 128 38 Q128 46 116 46"
				fill="none"
				stroke="#e8c766"
				stroke-width="4"
			/>
			<rect x="96" y="62" width="8" height="10" fill="#e8c766" />
			<rect x="86" y="72" width="28" height="7" rx="1.5" fill="#c9a544" />
			<path d="M74 112 L74 86 Q100 78 126 86 L126 112 Z" fill={SOMBRA} />
			<circle cx="100" cy="80" r="9" fill={SOMBRA} />
		{:else if foto === 'mundial'}
			<!-- El mundo y la copa. No es la copa de nadie: es una copa. -->
			<circle
				cx="100"
				cy="58"
				r="34"
				fill="rgba(255,255,255,.16)"
				stroke={SOMBRA}
				stroke-width="2"
			/>
			<ellipse
				cx="100"
				cy="58"
				rx="14"
				ry="34"
				fill="none"
				stroke={SOMBRA}
				stroke-width="1.6"
				opacity=".7"
			/>
			<line x1="66" y1="58" x2="134" y2="58" stroke={SOMBRA} stroke-width="1.6" opacity=".7" />
			<path d="M70 40 Q100 32 130 40" fill="none" stroke={SOMBRA} stroke-width="1.4" opacity=".6" />
			<path d="M70 76 Q100 84 130 76" fill="none" stroke={SOMBRA} stroke-width="1.4" opacity=".6" />
			<path
				d="M92 20 L108 20 L106 32 Q100 36 94 32 Z"
				fill="#e8c766"
				stroke={SOMBRA}
				stroke-width="1.4"
			/>
			<!-- Los papelitos de la tribuna. -->
			{#each [[24, 16], [60, 100], [96, 14], [132, 102], [168, 18], [44, 96]] as [x, y] (x)}
				<circle cx={x} cy={y} r="1.6" fill="rgba(255,255,255,.6)" />
			{/each}
		{:else if foto === 'banco'}
			<!-- Tres siluetas sentadas, mirando la cancha desde afuera. -->
			<rect x="0" y="76" width="200" height="36" fill="rgba(255,255,255,.1)" />
			{#each [46, 100, 154] as x (x)}
				<g fill={SOMBRA}>
					<circle cx={x} cy="42" r="9" />
					<path
						d="M{x - 13} 76 L{x - 13} 60 Q{x - 13} 52 {x} 52 Q{x + 13} 52 {x + 13} 60 L{x +
							13} 76 Z"
					/>
					<rect x={x - 14} y="76" width="28" height="7" rx="2" />
				</g>
			{/each}
			<rect x="10" y="83" width="180" height="5" rx="2" fill={SOMBRA} opacity=".8" />
			<rect x="18" y="88" width="6" height="18" fill={SOMBRA} opacity=".8" />
			<rect x="176" y="88" width="6" height="18" fill={SOMBRA} opacity=".8" />
		{:else if foto === 'lesion'}
			<!-- En el piso, y el cuerpo técnico entrando. -->
			<rect x="0" y="70" width="200" height="42" fill="rgba(255,255,255,.1)" />
			<g fill={SOMBRA}>
				<circle cx="62" cy="86" r="9" />
				<path d="M72 80 L118 80 Q126 80 126 88 L126 94 L72 94 Z" />
				<path d="M126 88 L146 74 L152 80 L132 96 Z" />
				<rect x="140" y="66" width="9" height="16" rx="4" fill="#f2f2f0" opacity=".95" />
				<rect x="138" y="70" width="13" height="4" fill="#f2f2f0" opacity=".95" />
			</g>
			<g fill={SOMBRA_SUAVE}>
				<circle cx="170" cy="34" r="8" />
				<path d="M158 74 L158 50 Q158 42 170 42 Q182 42 182 50 L182 74 Z" />
			</g>
		{:else if foto === 'pase'}
			<!-- Una valija, un avión y la flecha. Se va. -->
			<path d="M0 96 L200 96" stroke="rgba(255,255,255,.4)" stroke-width="1.4" />
			<g fill={SOMBRA}>
				<rect x="34" y="52" width="46" height="34" rx="4" />
				<rect x="48" y="42" width="18" height="12" rx="3" />
				<rect x="34" y="62" width="46" height="4" fill="rgba(255,255,255,.25)" />
				<rect x="40" y="86" width="6" height="8" />
				<rect x="68" y="86" width="6" height="8" />
			</g>
			<path
				d="M96 62 L150 62 M150 62 L138 50 M150 62 L138 74"
				fill="none"
				stroke={SOMBRA}
				stroke-width="4"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<path d="M158 26 L190 34 L176 40 L172 52 L166 40 L152 36 Z" fill={SOMBRA} opacity=".7" />
		{:else if foto === 'debut'}
			<!-- La tribuna llena y uno solo saliendo del túnel. -->
			{#each [12, 30, 48, 66, 84, 102, 120, 138, 156, 174] as x (x)}
				{#each [14, 28, 42] as y (y)}
					<circle cx={x + (y === 28 ? 9 : 0)} cy={y} r="5" fill="rgba(255,255,255,.18)" />
				{/each}
			{/each}
			<rect x="0" y="56" width="200" height="6" fill={SOMBRA} opacity=".6" />
			<rect x="0" y="62" width="200" height="50" fill="rgba(255,255,255,.1)" />
			<g fill={SOMBRA}>
				<circle cx="100" cy="70" r="9" />
				<path d="M87 112 L87 88 Q87 80 100 80 Q113 80 113 88 L113 112 Z" />
			</g>
			<ellipse cx="100" cy="110" rx="26" ry="5" fill="rgba(255,255,255,.2)" />
		{:else}
			<!-- La cancha vacía: el año que no dejó nada para contar. -->
			<rect x="0" y="0" width="200" height="112" fill="rgba(255,255,255,.06)" />
			<circle cx="100" cy="56" r="26" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2" />
			<circle cx="100" cy="56" r="3" fill="rgba(255,255,255,.45)" />
			<line x1="100" y1="0" x2="100" y2="112" stroke="rgba(255,255,255,.45)" stroke-width="2" />
			<rect
				x="0"
				y="30"
				width="24"
				height="52"
				fill="none"
				stroke="rgba(255,255,255,.45)"
				stroke-width="2"
			/>
			<rect
				x="176"
				y="30"
				width="24"
				height="52"
				fill="none"
				stroke="rgba(255,255,255,.45)"
				stroke-width="2"
			/>
			{#each [0, 25, 50, 75, 100, 125, 150, 175] as x (x)}
				<rect {x} y="0" width="12.5" height="112" fill="rgba(255,255,255,.04)" />
			{/each}
		{/if}

		<!-- El viñeteado, que es lo que hace que parezca una foto y no un ícono. -->
		<rect x="0" y="0" width="200" height="112" fill="url(#vineta-{id})" />
	</g>

	<defs>
		<radialGradient id={`vineta-${id}`} cx="0.5" cy="0.45" r="0.75">
			<stop offset="0.55" stop-color="#000" stop-opacity="0" />
			<stop offset="1" stop-color="#000" stop-opacity="0.4" />
		</radialGradient>
	</defs>
</svg>

<style>
	.ilustracion {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 3px;
	}
</style>
