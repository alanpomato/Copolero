<script lang="ts">
	import type { Escena } from './efectos';
	import { escudoDe } from './escudos';

	/**
	 * La estampa de una opción.
	 *
	 * Alan pidió que los momentos se vieran "tipo popup, con imágenes", mirando
	 * el Copero, que las resuelve con fotos de banco. Acá son dibujos, y es a
	 * propósito por dos razones. Una es la regla del proyecto: identidad visual
	 * propia, nada copiado. La otra es que una foto de archivo de un vestuario
	 * cualquiera no dice nada de esta decisión —es relleno bonito—, y una escena
	 * elegida por lo que la opción mueve sí: mirándola ya sabés si esto va por el
	 * arco, por el técnico o por la plata, antes de leer una palabra.
	 *
	 * Van en duotono con los colores del club, igual que la tapa del diario, así
	 * que un mismo momento se ve distinto en Boca que en el Leipzig y cambia solo
	 * cuando lo transfieren. Ver `Ilustracion.svelte`, que hace lo mismo para la
	 * portada.
	 */
	let {
		escena,
		clubId,
		apagada = false
	}: {
		escena: Escena;
		clubId: string;
		/** La opción que no se eligió: se dibuja igual pero sin energía. */
		apagada?: boolean;
	} = $props();

	const c = $derived(escudoDe(clubId));
	const id = $derived(`esc-${escena}-${clubId}`);

	const SOMBRA = '#12161c';
	const SOMBRA_SUAVE = 'rgba(18,22,28,.5)';
	const CLARO = 'rgba(255,255,255,.45)';
</script>

<!--
	`slice` y no `meet`: la escena llena su caja y se recorta.

	Con `meet` el dibujo se achica hasta entrar entero y deja aire a los
	costados, que en una tarjeta angosta se ve como una figurita pegada en el
	medio. Recortada por arriba y por abajo sigue reconociéndose de qué es, y la
	tarjeta queda pareja con la de al lado.
-->
<svg
	class="escena"
	class:apagada
	viewBox="0 0 160 96"
	preserveAspectRatio="xMidYMid slice"
	role="img"
	aria-label="Escena de la opción"
>
	<defs>
		<linearGradient id={`fondo-${id}`} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color={c.principal} />
			<stop offset="1" stop-color={c.secundario} stop-opacity="0.7" />
		</linearGradient>
		<clipPath id={`corte-${id}`}>
			<rect x="0" y="0" width="160" height="96" rx="3" />
		</clipPath>
		<radialGradient id={`vineta-${id}`} cx="0.5" cy="0.45" r="0.75">
			<stop offset="0.55" stop-color="#000" stop-opacity="0" />
			<stop offset="1" stop-color="#000" stop-opacity="0.42" />
		</radialGradient>
	</defs>

	<g clip-path="url(#corte-{id})">
		<rect x="0" y="0" width="160" height="96" fill="url(#fondo-{id})" />

		{#if escena === 'remate'}
			<!-- El arco, el arquero estirado y la pelota yendo. -->
			<rect x="96" y="14" width="60" height="60" fill={SOMBRA_SUAVE} />
			{#each [104, 116, 128, 140, 152] as x (x)}
				<line x1={x} y1="14" x2={x} y2="74" stroke={CLARO} stroke-width="0.7" />
			{/each}
			{#each [24, 36, 48, 60, 72] as y (y)}
				<line x1="96" y1={y} x2="156" y2={y} stroke={CLARO} stroke-width="0.7" />
			{/each}
			<!-- El arquero volando. -->
			<g fill={SOMBRA}>
				<circle cx="112" cy="40" r="6" />
				<path d="M118 38 L142 32 L144 40 L120 46 Z" />
				<path d="M118 44 L138 56 L133 62 L114 50 Z" />
			</g>
			<!-- El que patea, y la pelota en camino. -->
			<g fill={SOMBRA}>
				<circle cx="30" cy="30" r="7" />
				<path d="M22 66 L22 46 Q22 39 30 39 Q38 39 38 46 L38 66 Z" />
				<path d="M38 60 L54 72 L48 78 L32 66 Z" />
			</g>
			<circle cx="72" cy="60" r="5" fill="#fff" stroke={SOMBRA} stroke-width="1.3" />
			<path d="M60 66 Q66 62 70 60" fill="none" stroke={CLARO} stroke-width="1.4" />
			<line x1="0" y1="78" x2="160" y2="78" stroke={CLARO} stroke-width="1.3" />
		{:else if escena === 'pase'}
			<!-- Dos, y la pelota entre los dos. La asistencia. -->
			<line x1="0" y1="78" x2="160" y2="78" stroke={CLARO} stroke-width="1.3" />
			<g fill={SOMBRA}>
				<circle cx="34" cy="30" r="7" />
				<path d="M26 70 L26 46 Q26 39 34 39 Q42 39 42 46 L42 70 Z" />
			</g>
			<g fill={SOMBRA_SUAVE}>
				<circle cx="126" cy="28" r="7" />
				<path d="M118 70 L118 44 Q118 37 126 37 Q134 37 134 44 L134 70 Z" />
			</g>
			<path
				d="M50 56 Q80 34 112 52"
				fill="none"
				stroke={CLARO}
				stroke-width="1.6"
				stroke-dasharray="3 3"
			/>
			<circle cx="112" cy="52" r="5" fill="#fff" stroke={SOMBRA} stroke-width="1.3" />
		{:else if escena === 'duelo'}
			<!-- Hombro con hombro por la misma pelota. -->
			<line x1="0" y1="80" x2="160" y2="80" stroke={CLARO} stroke-width="1.3" />
			<g fill={SOMBRA}>
				<circle cx="58" cy="26" r="8" />
				<path d="M46 72 L46 44 Q46 36 58 36 Q70 36 70 44 L70 72 Z" />
				<path d="M68 46 L86 52 L84 59 L66 53 Z" />
			</g>
			<g fill={SOMBRA_SUAVE}>
				<circle cx="98" cy="26" r="8" />
				<path d="M86 72 L86 44 Q86 36 98 36 Q110 36 110 44 L110 72 Z" />
				<path d="M88 46 L70 52 L72 59 L90 53 Z" />
			</g>
			<circle cx="78" cy="70" r="6" fill="#fff" stroke={SOMBRA} stroke-width="1.4" />
			<!-- Las rayitas del choque: se están yendo al piso los dos. -->
			<path
				d="M74 18 L70 10 M84 18 L88 10 M79 14 L79 6"
				stroke={CLARO}
				stroke-width="1.4"
				stroke-linecap="round"
			/>
		{:else if escena === 'gambeta'}
			<!-- Se la lleva y el otro queda mirando. -->
			<line x1="0" y1="80" x2="160" y2="80" stroke={CLARO} stroke-width="1.3" />
			<g fill={SOMBRA_SUAVE}>
				<circle cx="106" cy="28" r="8" />
				<path d="M94 74 L94 46 Q94 38 106 38 Q118 38 118 46 L118 74 Z" />
			</g>
			<!-- El camino esquivado: por eso se lee como gambeta y no como carrera. -->
			<path
				d="M34 74 Q66 74 78 50 Q88 30 128 34"
				fill="none"
				stroke={CLARO}
				stroke-width="1.5"
				stroke-dasharray="3.5 3"
			/>
			<g fill={SOMBRA}>
				<circle cx="40" cy="30" r="8" />
				<path d="M28 74 L28 48 Q28 40 40 40 Q52 40 52 48 L52 74 Z" />
				<path d="M50 60 L64 68 L60 74 L46 66 Z" />
			</g>
			<circle cx="70" cy="72" r="6" fill="#fff" stroke={SOMBRA} stroke-width="1.4" />
		{:else if escena === 'esfuerzo'}
			<!-- Corriendo hasta que duele: la escalera y el que sube. -->
			<line x1="0" y1="82" x2="160" y2="82" stroke={CLARO} stroke-width="1.3" />
			{#each [0, 1, 2, 3] as i (i)}
				<rect
					x={18 + i * 26}
					y={70 - i * 12}
					width="26"
					height={12 + i * 12}
					fill="rgba(255,255,255,.09)"
					stroke={CLARO}
					stroke-width="0.7"
				/>
			{/each}
			<g fill={SOMBRA}>
				<circle cx="96" cy="24" r="7" />
				<path d="M88 50 L90 34 Q92 31 98 32 Q104 34 102 42 L100 52 Z" />
				<path d="M100 50 L112 58 L107 64 L94 56 Z" />
				<path d="M90 52 L84 66 L77 63 L83 48 Z" />
				<path d="M92 34 L76 30 L78 24 L94 28 Z" />
			</g>
			<!-- Las gotas: es esfuerzo, no una pose. -->
			{#each [[110, 18], [118, 28], [106, 34]] as [x, y] (x)}
				<circle cx={x} cy={y} r="1.6" fill={CLARO} />
			{/each}
		{:else if escena === 'tecnico'}
			<!-- La pizarra y el que la explica. -->
			<rect
				x="66"
				y="14"
				width="84"
				height="56"
				rx="2"
				fill="rgba(255,255,255,.12)"
				stroke={CLARO}
				stroke-width="1.2"
			/>
			<ellipse cx="108" cy="42" rx="26" ry="18" fill="none" stroke={CLARO} stroke-width="1.2" />
			<path
				d="M78 60 L96 46 L114 54 L136 30"
				fill="none"
				stroke={CLARO}
				stroke-width="1.4"
				stroke-linecap="round"
			/>
			{#each [[96, 46], [114, 54], [136, 30]] as [x, y] (x)}
				<circle cx={x} cy={y} r="2.4" fill={CLARO} />
			{/each}
			<g fill={SOMBRA}>
				<circle cx="32" cy="28" r="8" />
				<path d="M18 82 L18 48 Q18 40 32 40 Q46 40 46 48 L46 82 Z" />
				<path d="M44 46 L66 38 L68 45 L46 53 Z" />
				<!-- La gorra: es el técnico, no un jugador más. -->
				<path d="M23 22 Q32 15 41 22 L44 24 L20 24 Z" />
			</g>
		{:else if escena === 'tribuna'}
			<!-- La popular. Cabezas, banderas y humo. -->
			{#each [10, 26, 42, 58, 74, 90, 106, 122, 138, 154] as x (x)}
				{#each [26, 42, 58] as y (y)}
					<circle cx={x + (y === 42 ? 8 : 0)} cy={y} r="6" fill="rgba(255,255,255,.16)" />
				{/each}
			{/each}
			<rect x="0" y="70" width="160" height="26" fill={SOMBRA_SUAVE} />
			<path d="M0 70 L160 70" stroke={CLARO} stroke-width="1.4" />
			<!-- Un par de banderas colgadas del alambrado. -->
			<rect x="18" y="72" width="34" height="16" rx="1.5" fill="rgba(255,255,255,.22)" />
			<rect x="102" y="72" width="42" height="16" rx="1.5" fill="rgba(255,255,255,.22)" />
			<circle cx="80" cy="14" r="10" fill="rgba(255,255,255,.1)" />
		{:else if escena === 'prensa'}
			<!-- El micrófono y los flashes. -->
			<g fill={SOMBRA}>
				<circle cx="52" cy="30" r="9" />
				<path d="M34 84 L34 50 Q34 41 52 41 Q70 41 70 50 L70 84 Z" />
			</g>
			<g fill={SOMBRA}>
				<rect x="92" y="34" width="14" height="24" rx="7" />
				<rect x="97" y="58" width="4" height="16" />
				<rect x="88" y="74" width="22" height="5" rx="2" />
			</g>
			<rect x="90" y="38" width="18" height="9" rx="1.5" fill="rgba(255,255,255,.3)" />
			{#each [[126, 20], [140, 34], [122, 46], [144, 58]] as [x, y] (x)}
				<path
					d="M{x} {y - 5} L{x + 2} {y - 1} L{x + 6} {y} L{x + 2} {y + 2} L{x} {y + 6} L{x - 2} {y +
						2} L{x - 6} {y} L{x - 2} {y - 1} Z"
					fill="rgba(255,255,255,.55)"
				/>
			{/each}
		{:else if escena === 'vestuario'}
			<!-- Los percheros, las camisetas colgadas y el banco. -->
			<rect x="0" y="14" width="160" height="4" fill={SOMBRA} opacity=".7" />
			{#each [24, 60, 96, 132] as x (x)}
				<g>
					<line x1={x} y1="18" x2={x} y2="26" stroke={SOMBRA} stroke-width="2" />
					<path
						d="M{x - 14} 30 L{x - 8} 26 L{x + 8} 26 L{x + 14} 30 L{x + 10} 36 L{x + 9} 62 L{x -
							9} 62 L{x - 10} 36 Z"
						fill="rgba(255,255,255,.2)"
						stroke={CLARO}
						stroke-width="0.8"
					/>
				</g>
			{/each}
			<rect x="8" y="72" width="144" height="7" rx="2" fill={SOMBRA} />
			<rect x="16" y="79" width="6" height="17" fill={SOMBRA} opacity=".85" />
			<rect x="138" y="79" width="6" height="17" fill={SOMBRA} opacity=".85" />
		{:else if escena === 'plata'}
			<!-- El sobre y los billetes. Sin símbolos de ninguna moneda de nadie. -->
			<g fill={SOMBRA}>
				<rect x="40" y="34" width="80" height="46" rx="3" />
				<path d="M40 37 L80 60 L120 37 L120 34 L40 34 Z" fill={SOMBRA_SUAVE} />
			</g>
			{#each [0, 1, 2] as i (i)}
				<rect
					x={50 + i * 6}
					y={20 - i * 5}
					width="60"
					height="24"
					rx="2"
					fill="rgba(255,255,255,.24)"
					stroke={CLARO}
					stroke-width="0.8"
				/>
			{/each}
			<circle cx="80" cy="22" r="6" fill="none" stroke={CLARO} stroke-width="1.2" />
		{:else if escena === 'mesa'}
			<!-- Dos de un lado de la mesa y uno del otro. La reunión. -->
			<rect x="18" y="56" width="124" height="6" rx="2" fill={SOMBRA} />
			<rect x="30" y="62" width="6" height="24" fill={SOMBRA} opacity=".8" />
			<rect x="124" y="62" width="6" height="24" fill={SOMBRA} opacity=".8" />
			<g fill={SOMBRA}>
				<circle cx="40" cy="26" r="8" />
				<path d="M26 56 L26 42 Q26 35 40 35 Q54 35 54 42 L54 56 Z" />
			</g>
			<g fill={SOMBRA_SUAVE}>
				<circle cx="120" cy="26" r="8" />
				<path d="M106 56 L106 42 Q106 35 120 35 Q134 35 134 42 L134 56 Z" />
			</g>
			<!-- El papel en el medio: de eso se habla. -->
			<rect x="66" y="48" width="28" height="9" rx="1" fill="rgba(255,255,255,.35)" />
			<line x1="70" y1="51" x2="90" y2="51" stroke={SOMBRA} stroke-width="0.8" />
			<line x1="70" y1="54" x2="84" y2="54" stroke={SOMBRA} stroke-width="0.8" />
		{:else if escena === 'libreta'}
			<!-- La libreta del que va a ver pibes a una cancha de tierra. -->
			<rect
				x="34"
				y="16"
				width="92"
				height="66"
				rx="3"
				fill="rgba(255,255,255,.22)"
				stroke={CLARO}
				stroke-width="1"
			/>
			<line x1="52" y1="16" x2="52" y2="82" stroke={CLARO} stroke-width="1" />
			{#each [30, 42, 54, 66] as y (y)}
				<line x1="60" y1={y} x2={y === 66 ? 92 : 112} y2={y} stroke={SOMBRA} stroke-width="1.4" />
			{/each}
			{#each [26, 38, 50, 62] as y (y)}
				<circle cx="43" cy={y} r="2" fill={SOMBRA} opacity=".7" />
			{/each}
			<circle cx="112" cy="70" r="7" fill="none" stroke={SOMBRA} stroke-width="1.6" />
			<path d="M117 75 L126 84" stroke={SOMBRA} stroke-width="2.4" stroke-linecap="round" />
		{:else}
			<!-- La cancha, vacía y esperando. -->
			<rect x="0" y="0" width="160" height="96" fill="rgba(255,255,255,.05)" />
			<circle cx="80" cy="48" r="22" fill="none" stroke={CLARO} stroke-width="1.6" />
			<circle cx="80" cy="48" r="2.5" fill={CLARO} />
			<line x1="80" y1="0" x2="80" y2="96" stroke={CLARO} stroke-width="1.6" />
			<rect x="0" y="26" width="20" height="44" fill="none" stroke={CLARO} stroke-width="1.6" />
			<rect x="140" y="26" width="20" height="44" fill="none" stroke={CLARO} stroke-width="1.6" />
			{#each [0, 20, 40, 60, 80, 100, 120, 140] as x (x)}
				<rect {x} y="0" width="10" height="96" fill="rgba(255,255,255,.035)" />
			{/each}
		{/if}

		<rect x="0" y="0" width="160" height="96" fill="url(#vineta-{id})" />
	</g>
</svg>

<style>
	.escena {
		display: block;
		width: 100%;
		/* La caja la pone quien la usa; ésta es la forma por defecto. */
		aspect-ratio: 5 / 3;
		border-radius: 8px;
	}
	/* La que no se eligió: sigue ahí, pero ya no es la que importa. */
	.escena.apagada {
		filter: grayscale(0.8);
		opacity: 0.45;
	}
</style>
