<script lang="ts">
	import type { Vista } from '$lib/server/partidas';

	/**
	 * Los avisos, abajo a la derecha.
	 *
	 * Nacen de dos pedidos de Alan que resultaron ser el mismo problema. Uno:
	 * "acordate de destacar esto o tirarme notificación abajo a la derecha, de lo
	 * que hace el repre". El otro: "cuando uno de los 2 terminó y el otro no, que
	 * al que falta le ponga que lo están esperando".
	 *
	 * Los dos son lo mismo visto de dos lados: en un juego asincrónico, lo que
	 * hace el otro es la única señal de que hay otro. Y hasta ahora esa señal
	 * vivía adentro del diario, mezclada entre los goles y los ingresos, en una
	 * lista que se lee de arriba abajo. "Tu representante estuvo. Fue a verte, te
	 * atendió el teléfono, te bancó" tiene el mismo peso visual que "cobraste el
	 * salario de la temporada", y no es lo mismo: una es contabilidad y la otra
	 * es la otra persona.
	 *
	 * Acá abajo, encima de todo y fuera del scroll, no se puede no verlas. Se
	 * cierran de a una y no vuelven.
	 */
	let { vista }: { vista: Vista } = $props();

	type Aviso = {
		/** Sirve para no volver a mostrar el que ya cerró. */
		id: string;
		clase: 'espera' | 'elOtro';
		rotulo: string;
		texto: string;
	};

	const nombreDelOtro = $derived(vista.elOtro?.nombre ?? 'el otro');

	/**
	 * Si le toca a él y no cerró.
	 *
	 * `WAITING_FOR_PLAYER` significa que falta el futbolista, así que sólo es un
	 * aviso *para* el futbolista: al representante decirle que están esperando al
	 * otro no le sirve de nada, ya lo sabe por su propia pantalla.
	 */
	const meEsperan = $derived(
		(vista.sincronizacion === 'WAITING_FOR_PLAYER' && vista.rol === 'futbolista') ||
			(vista.sincronizacion === 'WAITING_FOR_AGENT' && vista.rol === 'representante')
	);

	/**
	 * Lo último que hizo el otro, sacado del diario.
	 *
	 * Sólo de la temporada en curso y sólo lo que de verdad es del otro: su
	 * gestión, sus movidas en el mercado, lo que consiguió o no consiguió. Lo que
	 * pasó dentro de la cancha ya se cuenta en otro lado.
	 *
	 * `visiblePara` ya filtró del lado del servidor lo que este rol no puede ver,
	 * así que acá no hay nada que esconder: lo que llegó, llegó.
	 */
	const DEL_OTRO = new Set(['gestion', 'representacion', 'mercado', 'contrato', 'techo']);

	const loQueHizo = $derived.by(() => {
		const deEsteAnio = vista.diario.filter(
			(e) => e.temporada === vista.estado.temporada && DEL_OTRO.has(e.tipo)
		);
		// Las dos últimas y nada más. Un aviso que trae ocho líneas es el diario
		// otra vez, sólo que tapando la pantalla.
		return deEsteAnio.slice(-2);
	});

	const avisos = $derived.by<Aviso[]>(() => {
		const cuales: Aviso[] = [];

		if (meEsperan) {
			cuales.push({
				id: `espera-${vista.estado.temporada}-${vista.estado.fase}`,
				clase: 'espera',
				rotulo: `${nombreDelOtro} ya cerró`,
				texto: 'Te están esperando para que la fase siga.'
			});
		}

		for (const linea of loQueHizo) {
			cuales.push({
				// El texto entra en el id a propósito: si el otro hace dos cosas
				// parecidas el mismo año, son dos avisos distintos y cerrar uno no
				// tiene por qué tapar el otro.
				id: `otro-${vista.estado.temporada}-${linea.fase}-${linea.texto.slice(0, 40)}`,
				clase: 'elOtro',
				rotulo: `Lo que hizo ${nombreDelOtro}`,
				texto: linea.texto
			});
		}

		return cuales;
	});

	/**
	 * Los que ya cerró.
	 *
	 * Un `SvelteSet` y no un `Set` común: hace falta que escribirlo vuelva a
	 * dibujar, y con un `Set` normal Svelte no se entera de que cambió.
	 */
	let cerrados = $state(new Set<string>());
	const visibles = $derived(avisos.filter((a) => !cerrados.has(a.id)));

	function cerrar(id: string) {
		cerrados = new Set([...cerrados, id]);
	}
</script>

{#if visibles.length > 0}
	<aside class="avisos" aria-live="polite">
		{#each visibles as aviso (aviso.id)}
			<article class="aviso {aviso.clase}">
				<div class="cuerpo">
					<b>{aviso.rotulo}</b>
					<p>{aviso.texto}</p>
				</div>
				<button type="button" onclick={() => cerrar(aviso.id)} aria-label="Cerrar el aviso"
					>✕</button
				>
			</article>
		{/each}
	</aside>
{/if}

<style>
	/*
	 * Abajo a la derecha y fuera del scroll, como pidió Alan.
	 *
	 * En el celular ocupan el ancho menos un margen: una tarjeta de 320 píxeles
	 * pegada a la derecha en una pantalla de 390 deja una franja de nada a la
	 * izquierda que se lee como un error de maquetado.
	 */
	.avisos {
		position: fixed;
		right: 0.8rem;
		bottom: 0.8rem;
		left: 0.8rem;
		z-index: 60;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		pointer-events: none;
	}
	@media (min-width: 40rem) {
		.avisos {
			left: auto;
			width: 22rem;
		}
	}

	.aviso {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		padding: 0.7rem 0.75rem 0.7rem 0.85rem;
		border: 1px solid var(--borde);
		border-left: 3px solid var(--acento);
		border-radius: 12px;
		background: var(--tarjeta-alta);
		box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
		/* El contenedor no recibe clics para no tapar la página; las tarjetas sí. */
		pointer-events: auto;
	}
	/* Que te estén esperando es urgente; lo que hizo el otro es una novedad. */
	.aviso.espera {
		border-left-color: var(--espera);
	}

	.cuerpo {
		flex: 1;
		min-width: 0;
	}
	.cuerpo b {
		display: block;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--acento);
	}
	.aviso.espera .cuerpo b {
		color: var(--espera);
	}
	.cuerpo p {
		margin: 0.2rem 0 0;
		font-size: 0.86rem;
		line-height: 1.4;
	}

	button {
		flex: none;
		width: 1.6rem;
		height: 1.6rem;
		padding: 0;
		border-radius: 50%;
		border: 1px solid var(--borde);
		background: var(--tarjeta);
		color: var(--tenue);
		font-size: 0.72rem;
		line-height: 1;
		cursor: pointer;
	}
	button:hover {
		color: var(--texto);
	}
</style>
