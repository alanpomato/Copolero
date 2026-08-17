<script lang="ts">
	/**
	 * La ruleta de la ocasión.
	 *
	 * Muestra contra qué estás apostando: el verde es lo que sale bien y el rojo
	 * lo que sale mal, y los dos pedazos son del tamaño de la probabilidad de
	 * verdad. Es el mismo número que ya estaba escrito, pero un 38% dibujado se
	 * entiende sin leerlo, y elegir entre dos porciones es otra cosa que elegir
	 * entre dos porcentajes.
	 *
	 * Y gira. Durante mucho tiempo no giró, y no era un olvido: en Copolero la
	 * fase se resuelve cuando cierran los dos, así que al elegir el resultado
	 * todavía no existía y animar algo hubiera sido inventarlo.
	 *
	 * Resulta que sí existía. La ocasión se resuelve con los atributos, la forma
	 * y la semilla, y las tres ya están escritas cuando el futbolista elige: no
	 * mira nada del representante ni nada de lo que pasa después. Faltaba
	 * animarse a mirarlo antes de tiempo, y sobre todo, que fuera irrevocable
	 * —de eso se encarga el servidor, que escribe la elección antes de contestar
	 * qué pasó—.
	 *
	 * Así que la aguja arranca quieta arriba mientras se elige, y cuando el
	 * servidor contesta pega cinco vueltas y frena adentro del pedazo que le
	 * tocó. La que decide dónde frena es la respuesta, no la animación.
	 */
	let {
		probabilidad,
		etiqueta = '',
		tamano = 132,
		/**
		 * Qué pasó, cuando ya pasó. Mientras sea `null` la rueda está quieta
		 * mostrando la apuesta.
		 *
		 * Es un booleano suelto y no un objeto a propósito: siendo `{ salio }`, el
		 * padre creaba uno nuevo en cada render y el efecto de abajo se volvía a
		 * correr, cancelando sus propios `setTimeout`.
		 */
		salio = null,
		/** Mientras el servidor contesta. */
		tirando = false,
		/** Si viene ya resuelta de antes —recargó la página—, no hay que girar. */
		yaEstaba = false
	}: {
		probabilidad: number;
		etiqueta?: string;
		tamano?: number;
		salio?: boolean | null;
		tirando?: boolean;
		yaEstaba?: boolean;
	} = $props();

	const p = $derived(Math.max(0, Math.min(100, probabilidad)));

	// Geometría del anillo. El truco es dibujar un solo círculo y usar el trazo
	// discontinuo como si fuera la porción: no hay que calcular arcos a mano y
	// se anima solo.
	const RADIO = 42;
	const VUELTA = 2 * Math.PI * RADIO;
	const sale = $derived((p / 100) * VUELTA);

	const tono = $derived(p >= 70 ? 'alta' : p >= 40 ? 'media' : 'baja');

	/** Cuántas vueltas pega antes de frenar. */
	const VUELTAS = 5;
	/** Cuánto dura el giro. Lo mismo que dura en la CSS de abajo. */
	const DURA = 2600;

	let angulo = $state(0);
	let frenada = $state(false);
	let animando = $state(false);

	/**
	 * Dónde frena la aguja.
	 *
	 * El pedazo verde va de 0° a `p * 3.6°` contando desde arriba y hacia la
	 * derecha; el rojo es el resto. Se frena adentro del que corresponde, con un
	 * margen para no quedar justo en el borde: una aguja partida al medio de la
	 * línea deja dudando, y acá no hay nada que dudar.
	 */
	function dondeFrena(salio: boolean): number {
		const verde = p * 3.6;
		const desde = salio ? 0 : verde;
		const hasta = salio ? verde : 360;
		const ancho = hasta - desde;
		const margen = Math.min(ancho * 0.18, 10);
		return desde + margen + Math.random() * (ancho - margen * 2);
	}

	/**
	 * Que gire una sola vez.
	 *
	 * Es una variable común y no un `$state` a propósito. Siendo estado, el
	 * efecto que la escribe también la lee, así que se vuelve a correr solo, y al
	 * correrse de nuevo cancela su propio `setTimeout`: la rueda giraba pero
	 * nunca llegaba a frenar y el veredicto no aparecía nunca. Acá no hace falta
	 * que sea reactiva —nada se dibuja a partir de ella—, así que no lo es.
	 */
	let girado: string | null = null;

	$effect(() => {
		if (salio === null) return;
		const firma = `${salio}`;
		if (girado === firma) return;
		girado = firma;

		if (yaEstaba) {
			// Ya la había tirado en otra visita. Se muestra frenada donde
			// corresponde, sin la vuelta: la sorpresa ya pasó.
			angulo = dondeFrena(salio);
			frenada = true;
			return;
		}

		animando = true;
		frenada = false;
		angulo = VUELTAS * 360 + dondeFrena(salio);
		setTimeout(() => {
			animando = false;
			frenada = true;
		}, DURA);
	});

	const canto = $derived(frenada && salio !== null ? (salio ? 'entro' : 'no') : '');
</script>

<div
	class="ruleta"
	class:tirando
	class:animando
	class:frenada
	style="width:{tamano}px"
	data-canto={canto}
>
	<svg viewBox="0 0 100 100" role="img" aria-label={`${p}% de que salga`}>
		<!-- El fondo, que es todo lo que puede salir mal. -->
		<circle
			cx="50"
			cy="50"
			r={RADIO}
			fill="none"
			stroke="var(--malo)"
			stroke-width="14"
			opacity=".55"
		/>

		<!-- Y encima, la porción que sale bien. -->
		<circle
			class="parte"
			cx="50"
			cy="50"
			r={RADIO}
			fill="none"
			stroke-width="14"
			stroke-dasharray="{sale} {VUELTA}"
			transform="rotate(-90 50 50)"
		/>

		<circle cx="50" cy="50" r="30" fill="var(--tarjeta)" />

		{#if frenada && salio !== null}
			<text
				x="50"
				y="53"
				text-anchor="middle"
				class="veredicto {salio ? 'bien' : 'mal'}"
				font-size="15"
				font-weight="800"
			>
				{salio ? 'SALIÓ' : 'NO'}
			</text>
		{:else}
			<text
				x="50"
				y="49"
				text-anchor="middle"
				class="numero {tono}"
				font-size="21"
				font-weight="800"
			>
				{p}%
			</text>
			<text x="50" y="63" text-anchor="middle" class="pie" font-size="7.5">
				{tirando ? 'girando' : 'que salga'}
			</text>
		{/if}

		<!--
			La aguja. Gira ella y no la rueda, a propósito: si girara la rueda, el
			pedazo verde se movería y no se entendería contra qué se está jugando.
			Lo que se mueve es lo que decide.
		-->
		<g class="aguja" style="--angulo:{angulo}deg">
			<!--
				Apunta hacia adentro, como apunta el fiel de una ruleta: la punta cae
				sobre el anillo y el cuerpo queda por fuera. Así, cuando frena, no hay
				que interpretar nada —lo que la punta toca es lo que salió—.
			-->
			<polygon points="50,17 42,1 58,1" />
			<circle cx="50" cy="3.5" r="3.2" />
		</g>
	</svg>

	{#if etiqueta}
		<p class="etiqueta">{etiqueta}</p>
	{/if}
</div>

<style>
	.ruleta {
		margin: 0 auto;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
		filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
	}
	.parte {
		stroke: var(--acento);
		/* Se acomoda cuando cambia la apuesta, que es cuando cambia el dibujo. */
		transition: stroke-dasharray 0.35s ease-out;
	}

	/* La aguja. La curva arranca rápido y frena de a poco, como frena una rueda. */
	.aguja {
		fill: var(--texto);
		/* Un borde del color del fondo: sin esto la aguja se pierde adentro del
		   anillo justo cuando hay que mirarla. */
		stroke: var(--fondo);
		stroke-width: 1.6;
		stroke-linejoin: round;
		transform: rotate(var(--angulo));
		transform-origin: 50px 50px;
		transition: transform 2.6s cubic-bezier(0.12, 0.72, 0.12, 1);
	}
	.ruleta[data-canto='entro'] .aguja {
		fill: var(--acento);
	}
	.ruleta[data-canto='no'] .aguja {
		fill: var(--malo);
	}

	/* Mientras el servidor contesta: un latido, para que se note que pasa algo. */
	.tirando svg {
		animation: latir 0.9s ease-in-out infinite;
	}
	@keyframes latir {
		50% {
			filter: drop-shadow(0 4px 18px rgba(52, 211, 153, 0.35));
		}
	}

	/* Al frenar, el anillo pega un golpe. Dura poco y se siente. */
	.frenada svg {
		animation: golpe 0.45s ease-out;
	}
	@keyframes golpe {
		30% {
			transform: scale(1.06);
		}
	}

	.numero {
		fill: var(--texto);
	}
	.numero.alta {
		fill: var(--acento);
	}
	.numero.media {
		fill: var(--espera);
	}
	.numero.baja {
		fill: var(--malo);
	}
	.veredicto {
		letter-spacing: 0.04em;
	}
	.veredicto.bien {
		fill: var(--acento);
	}
	.veredicto.mal {
		fill: var(--malo);
	}
	.pie {
		fill: var(--tenue);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.etiqueta {
		margin: 0.4rem 0 0;
		text-align: center;
		font-size: 0.78rem;
		font-weight: 700;
		line-height: 1.2;
	}

	/* El que pidió que no se muevan las cosas, que no se le muevan. */
	@media (prefers-reduced-motion: reduce) {
		.aguja {
			transition: none;
		}
		.tirando svg,
		.frenada svg {
			animation: none;
		}
	}
</style>
