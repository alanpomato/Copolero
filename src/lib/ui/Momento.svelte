<script lang="ts">
	import type { Minijuego as Juego, Ocasion } from '$lib/engine/ocasiones';
	import type { MomentoDelRepresentante } from '$lib/engine/momentos';
	import type { Tirada } from '$lib/engine/pantalla';
	import { chipsDe, escenasDe } from './efectos';
	import Escena from './Escena.svelte';
	import Escudo from './Escudo.svelte';
	import Minijuego from './Minijuego.svelte';

	/**
	 * Un momento del año, a pantalla completa.
	 *
	 * Era una tarjeta más en una columna de tarjetas, y ése era el problema:
	 * la decisión más importante del año se leía igual que el resto del
	 * formulario. Alan lo dijo mirando el Copero —"esto es lo más importante,
	 * las decisiones del jugador y del repre en el camino del año"— y tenía
	 * razón: si es lo que más pesa, tiene que ocupar toda la pantalla y no
	 * compartirla con nada.
	 *
	 * Tres cosas cambian respecto de la tarjeta:
	 *
	 *  - Las opciones van una al lado de la otra, no una arriba de la otra.
	 *    Elegir es comparar, y comparar en vertical obliga a scrollear entre las
	 *    dos cosas que estás tratando de mirar juntas.
	 *  - Cada una lleva su escena dibujada. Ver `Escena.svelte`.
	 *  - Y lleva los números a la vista: qué ganás si sale y qué perdés si no,
	 *    con su probabilidad, en vez de dos párrafos de prosa. Ver `efectos.ts`.
	 *
	 * Y arriba queda la cinta con la media y lo que define al jugador, porque
	 * Alan marcó eso aparte: un popup que tapa la tarjeta te deja decidiendo sin
	 * lo que necesitás para decidir.
	 */
	let {
		momento,
		indice,
		total,
		campo,
		clubId,
		cinta,
		carisma = 0,
		tirada,
		tirando = false,
		contado = false,
		problema = '',
		elegida = $bindable(),
		onTirar,
		onSeguir,
		onCerrar
	}: {
		momento: Ocasion | MomentoDelRepresentante;
		indice: number;
		total: number;
		/** El prefijo del campo del formulario: `ocasion` o `momento`. */
		campo: string;
		/** De qué club son los colores de las escenas. */
		clubId: string;
		/** Lo que no se puede perder de vista mientras se decide. */
		cinta: {
			numero: string;
			pie: string;
			clubId?: string;
			datos: { rotulo: string; valor: string }[];
		};
		/** Solo el representante: cuánto lo salva caer bien. */
		carisma?: number;
		tirada?: Tirada;
		tirando?: boolean;
		/** La rueda ya frenó y se puede contar qué pasó. */
		contado?: boolean;
		problema?: string;
		elegida?: string;
		onTirar: (juego: Juego) => void;
		onSeguir: () => void;
		onCerrar: () => void;
	} = $props();

	const opcion = $derived(
		momento.opciones.find((o) => o.id === (tirada?.opcionId ?? elegida)) ?? momento.opciones[0]
	);

	/*
	 * Las estampas se reparten entre todas las opciones juntas, no una por una:
	 * si cada una se llevara la que mejor la describe, en un momento donde las
	 * tres son tiros al arco las tres tendrían el mismo dibujo. Ver `efectos.ts`.
	 */
	const escenas = $derived(escenasDe(momento.opciones, momento.juego));

	/** Cómo se llama jugársela en cada minijuego. */
	const VERBO: Record<string, string> = {
		ruleta: 'Jugártela',
		arco: 'Patear',
		dado: 'Tirar',
		quiz: 'Decírselo'
	};
	const MIENTRAS: Record<string, string> = {
		ruleta: 'Girando…',
		arco: 'Va la pelota…',
		dado: 'Tirando…',
		quiz: 'Te está mirando…'
	};

	/**
	 * El popup se abre con `showModal` y no con el atributo `open`.
	 *
	 * Es la diferencia entre un cuadro dibujado arriba de la página y un cuadro
	 * que *es* la página mientras está: con `showModal` el navegador se encarga
	 * del fondo, del foco y de que Escape no cierre nada por accidente. Lo
	 * segundo importa acá más que en ningún otro lado, porque atrás hay un
	 * formulario a medio llenar.
	 */
	let caja = $state<HTMLDialogElement | null>(null);
	$effect(() => {
		if (caja && !caja.open) caja.showModal();
	});

	/** Cerrar es volver a la pantalla de la fase, no cancelar la decisión. */
	function cerrar() {
		caja?.close();
		onCerrar();
	}
</script>

<dialog
	bind:this={caja}
	class="momento"
	oncancel={(e) => {
		e.preventDefault();
		cerrar();
	}}
>
	<!--
		La cinta. No es decoración: es lo que hace falta tener a mano para elegir,
		y sin ella el popup sería una decisión a ciegas sobre un jugador que no
		estás viendo.
	-->
	<header class="cinta">
		<span class="media">
			<b>{cinta.numero}</b>
			<i>{cinta.pie}</i>
		</span>
		{#if cinta.clubId}
			<Escudo clubId={cinta.clubId} tamano={26} />
		{/if}
		<ul class="datos">
			{#each cinta.datos as dato (dato.rotulo)}
				<li>
					<i>{dato.rotulo}</i>
					<b>{dato.valor}</b>
				</li>
			{/each}
		</ul>
		<button type="button" class="cerrar" onclick={cerrar} aria-label="Cerrar">✕</button>
	</header>

	<div class="hoja">
		<p class="cual">
			Momento {indice + 1} de {total}
			{#if tirada}<span class="ya">·&nbsp;ya jugado</span>{/if}
		</p>
		<h2>{momento.titulo}</h2>
		<p class="contexto">{momento.contexto}</p>

		<!--
			Las opciones, lado a lado. En el celular la grilla cae a una columna
			sola: dos tarjetas de 160 píxeles de ancho no se comparan, se
			entrecierran.
		-->
		<div class="opciones" style="--cuantas:{momento.opciones.length}">
			{#each momento.opciones as o, i (o.id)}
				{@const gana = chipsDe(o.premio)}
				{@const pierde = chipsDe(o.castigo)}
				{@const esta = (tirada?.opcionId ?? elegida) === o.id}
				<label class="opcion" class:activa={esta} class:descartada={!!tirada && !esta}>
					<input
						type="radio"
						name={`${campo}-${indice}`}
						value={o.id}
						bind:group={elegida}
						disabled={!!tirada || tirando}
					/>
					<Escena escena={escenas[i]} {clubId} apagada={!!tirada && !esta} />
					<span class="nombre">{o.etiqueta}</span>
					<span class="detalle">{o.detalle}</span>

					<!--
						Lo que se apuesta y contra qué. Los números son los que el motor ya
						venía aplicando: lo único nuevo es que están a la vista.
					-->
					<span class="cuentas">
						{#if gana.length > 0}
							<span class="fila">
								<span class="pct sube">{o.probabilidad}%</span>
								<span class="chips">
									{#each gana as chip (chip.texto)}
										<span class="chip {chip.tono}">{chip.texto}</span>
									{/each}
								</span>
							</span>
						{/if}
						{#if pierde.length > 0}
							<span class="fila">
								<span class="pct baja">{100 - o.probabilidad}%</span>
								<span class="chips">
									{#each pierde as chip (chip.texto)}
										<span class="chip {chip.tono}">{chip.texto}</span>
									{/each}
								</span>
							</span>
						{:else if gana.length > 0 && o.probabilidad < 100}
							<!--
								La opción que puede fallar sin costo. Se dice, porque no decirlo
								la hace parecer gratis: fallar tiene precio en las otras dos y
								acá no, y ésa es media razón para elegirla. Cuando la opción sale
								siempre no hay renglón: un "0% · nada cambia" es ruido.
							-->
							<span class="fila">
								<span class="pct nada">{100 - o.probabilidad}%</span>
								<span class="chips"><span class="chip neutro">Nada cambia</span></span>
							</span>
						{/if}
					</span>
				</label>
			{/each}
		</div>

		<!-- Lo que se está por jugar, dibujado. -->
		<div class="mesa">
			<div class="juego">
				<Minijuego
					juego={momento.juego}
					probabilidad={opcion.probabilidad}
					etiqueta={opcion.etiqueta}
					salio={tirada ? tirada.salio : null}
					{tirando}
					yaEstaba={!!tirada && contado}
					{carisma}
				/>
			</div>

			<div class="abajo">
				{#if tirada && contado}
					{#if tirada.texto}
						<p class="loQuePaso" class:mal={!tirada.salio}>{tirada.texto}</p>
					{/if}
					{#if indice < total - 1}
						<button type="button" class="seguir" onclick={onSeguir}>¿Y qué pasó después?</button>
					{:else}
						<button type="button" class="seguir" onclick={cerrar}>Cerrar el año</button>
					{/if}
				{:else if tirada}
					<p class="loQuePaso esperando">…</p>
				{:else}
					<p class="siSale">{opcion.siSale}</p>
					<button
						type="button"
						class="tirarla"
						disabled={tirando}
						onclick={() => onTirar(momento.juego)}
					>
						{tirando
							? (MIENTRAS[momento.juego] ?? 'Girando…')
							: `${VERBO[momento.juego] ?? 'Jugártela'} · ${opcion.probabilidad}%`}
					</button>
					<p class="aviso">Una sola vez. Lo que salga, salió.</p>
				{/if}

				{#if problema && !tirando}
					<p class="problema">{problema}</p>
				{/if}
			</div>
		</div>
	</div>
</dialog>

<style>
	.momento {
		width: min(58rem, 100vw - 1rem);
		max-height: calc(100dvh - 1rem);
		margin: auto;
		padding: 0;
		border: 1px solid var(--borde);
		border-radius: var(--radio);
		background: var(--tarjeta);
		color: var(--texto);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		/* La pantalla se acomoda a su propio ancho, no al de la ventana. */
		container-type: inline-size;
	}
	.momento::backdrop {
		background: rgba(4, 6, 10, 0.82);
		backdrop-filter: blur(3px);
	}

	/* ---------- La cinta de arriba ---------- */
	.cinta {
		flex: none;
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.6rem 0.8rem;
		border-bottom: 1px solid var(--borde);
		background: var(--tarjeta-alta);
	}
	.media {
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1;
		flex: none;
	}
	.media b {
		font-size: 1.5rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: var(--acento);
	}
	.media i {
		font-style: normal;
		font-size: 0.6rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--tenue);
		margin-top: 0.15rem;
	}
	.datos {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 0.9rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.datos li {
		display: flex;
		flex-direction: column;
		line-height: 1.15;
	}
	.datos i {
		font-style: normal;
		font-size: 0.6rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--tenue);
	}
	.datos b {
		font-size: 0.85rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.cerrar {
		flex: none;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border-radius: 50%;
		border: 1px solid var(--borde);
		background: var(--tarjeta);
		color: var(--tenue);
		font-size: 0.9rem;
		line-height: 1;
		cursor: pointer;
	}
	.cerrar:hover {
		color: var(--texto);
		border-color: var(--tenue);
	}

	/* ---------- El cuerpo ---------- */
	.hoja {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 1rem 1rem 1.2rem;
	}
	.cual {
		margin: 0;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.11em;
		text-transform: uppercase;
		color: var(--tenue);
	}
	.ya {
		color: var(--acento);
	}
	/*
	 * El título es un título, no un rótulo de sección.
	 *
	 * Los `h2` del juego van en mayúsculas y en verde porque marcan dónde
	 * empieza cada parte de la pantalla. Acá adentro no hay nada más de lo que
	 * separarse: es lo único que hay, y en versalita verde se leía como una
	 * etiqueta y no como lo que le está pasando al jugador. Es la misma queja
	 * que hizo Alan mirando el arranque de la partida: "todo mismo formato".
	 */
	h2 {
		margin: 0.2rem 0 0.4rem;
		font-size: 1.5rem;
		line-height: 1.12;
		font-weight: 800;
		letter-spacing: -0.01em;
		text-transform: none;
		color: var(--texto);
		border: none;
		padding: 0;
	}
	.contexto {
		margin: 0 0 1rem;
		color: var(--tenue);
		line-height: 1.45;
	}

	/* ---------- Las opciones ---------- */
	.opciones {
		display: grid;
		gap: 0.7rem;
		margin-bottom: 1rem;
	}
	@container (min-width: 32rem) {
		.opciones {
			grid-template-columns: repeat(var(--cuantas), minmax(0, 1fr));
		}
	}
	.opcion {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.6rem;
		border: 1px solid var(--borde);
		border-radius: 12px;
		background: var(--tarjeta-alta);
		cursor: pointer;
	}
	.opcion.activa {
		border-color: var(--acento);
		background: rgba(74, 222, 128, 0.08);
	}
	/* Ya se tiró: la que salió queda firme, la otra se apaga. */
	.opcion.descartada {
		opacity: 0.4;
		cursor: default;
	}
	.opcion input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		opacity: 0;
		cursor: inherit;
	}
	.opcion:has(input:focus-visible) {
		outline: 2px solid var(--acento);
		outline-offset: 2px;
	}
	/*
	 * En el celular la escena es una franja, no un cuadro.
	 *
	 * Con la proporción de siempre, en una columna de 400 píxeles cada estampa
	 * se vuelve de 240 de alto y tres opciones son tres pantallas de scroll:
	 * justo lo contrario de poder compararlas. Achatada se sigue reconociendo
	 * —la escena se recorta, no se encoge— y las tres entran juntas.
	 */
	.opcion :global(svg.escena) {
		aspect-ratio: 16 / 6;
	}
	@container (min-width: 32rem) {
		.opcion :global(svg.escena) {
			aspect-ratio: 5 / 3;
		}
	}
	.nombre {
		font-weight: 800;
		line-height: 1.2;
	}
	.detalle {
		font-size: 0.82rem;
		color: var(--tenue);
		line-height: 1.35;
	}

	.cuentas {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		margin-top: auto;
		padding-top: 0.35rem;
	}
	.fila {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
	}
	.pct {
		flex: none;
		width: 2.6rem;
		font-size: 0.82rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
	.pct.sube {
		color: var(--acento);
	}
	.pct.baja {
		color: var(--malo);
	}
	.pct.nada {
		color: var(--tenue);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
	.chip {
		font-size: 0.72rem;
		font-weight: 700;
		border-radius: 999px;
		padding: 0.12rem 0.5rem;
		line-height: 1.4;
	}
	.chip.sube {
		color: var(--acento);
		background: rgba(74, 222, 128, 0.13);
	}
	.chip.baja {
		color: var(--malo);
		background: rgba(248, 113, 113, 0.13);
	}
	.chip.neutro {
		color: var(--tenue);
		background: rgba(255, 255, 255, 0.06);
	}

	/* ---------- La mesa: el minijuego y el botón ---------- */
	.mesa {
		display: grid;
		gap: 0.8rem;
		align-items: center;
		border-top: 1px solid var(--borde);
		padding-top: 1rem;
	}
	@container (min-width: 32rem) {
		.mesa {
			grid-template-columns: minmax(0, 12rem) minmax(0, 1fr);
		}
	}
	.juego {
		display: flex;
		justify-content: center;
	}
	.abajo {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.siSale {
		margin: 0;
		font-size: 0.85rem;
		color: var(--tenue);
		line-height: 1.4;
	}
	.tirarla,
	.seguir {
		width: 100%;
		font-size: 1rem;
		font-weight: 800;
		padding: 0.75rem 1rem;
	}
	.seguir {
		background: transparent;
		color: var(--acento);
		border: 1px solid var(--acento);
	}
	.aviso {
		margin: 0;
		font-size: 0.72rem;
		color: var(--tenue);
		text-align: center;
	}
	.loQuePaso {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		line-height: 1.4;
		color: var(--acento);
	}
	.loQuePaso.mal {
		color: var(--malo);
	}
	.loQuePaso.esperando {
		color: var(--tenue);
		letter-spacing: 0.3em;
	}
	.problema {
		margin: 0;
		font-size: 0.82rem;
		color: var(--malo);
	}
</style>
