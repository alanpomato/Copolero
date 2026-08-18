<script lang="ts">
	import { contexto } from '../../../content/mundo';
	import { LO_QUE_CUESTA_CON_EL_DT, LO_QUE_CUESTA_CON_LA_HINCHADA, PIDE } from '$lib/engine/salida';
	import type { OpcionesDeFase } from '$lib/engine/pantalla';
	import { NOMBRE_RAREZA, type EnLaVidriera } from '$lib/engine/inversiones';
	import type { Estado } from '$lib/engine/tipos';
	import Opcion from './Opcion.svelte';

	/**
	 * Lo que no es del año: la vidriera y pedir salir.
	 *
	 * La columna del medio cuenta la temporada en orden —la pretemporada, los
	 * momentos, el mercado— y estas dos cosas estaban ahí adentro sin
	 * pertenecer. Comprar un fisio no es un momento de marzo, y pedir salir del
	 * club es algo que se hace una vez en una carrera, si se hace: puestas en la
	 * fila cronológica, cada temporada la pantalla arrancaba preguntando si te
	 * querías ir.
	 *
	 * Acá al costado, junto a la ficha y a la plata, están donde uno las va a
	 * buscar: son cosas del bolsillo y del contrato, no del calendario.
	 *
	 * Los inputs llevan `form="fase"`, que es lo que permite que estén fuera del
	 * `<form>` y se envíen con él igual. Es HTML de toda la vida y evita tener
	 * que envolver media pantalla en un formulario para mover dos cajas.
	 */
	let {
		opciones,
		estado
	}: {
		opciones: OpcionesDeFase;
		estado: Estado;
	} = $props();

	let compras = $state<string[]>([]);
	let salida = $state('');
	let vidriera = $state<HTMLDialogElement | null>(null);

	const clubActual = $derived(contexto(estado.futbolista.contrato.clubId).club.nombre);

	function plata(usd: number): string {
		return `USD ${usd.toLocaleString('es-AR')}`;
	}

	/**
	 * De lo más barato a lo más caro.
	 *
	 * Por precio y no por si alcanza: lo segundo cambiaría el orden cada vez que
	 * se marca un casillero, y una lista que se reacomoda sola mientras la estás
	 * mirando es peor que una mal ordenada. Por precio, lo que se puede pagar
	 * queda arriba igual, y se queda quieto.
	 */
	function porPrecio(cuales: EnLaVidriera[]): EnLaVidriera[] {
		return [...cuales].sort((a, b) => a.precioUsd - b.precioUsd);
	}

	/**
	 * Lo marcado, buscado por su pedido y no por su id.
	 *
	 * Un mismo artículo puede tener hasta tres renglones en la vidriera —
	 * comprarlo suelto, renovarlo, atarlo para siempre— y cada uno cuesta
	 * distinto, así que buscar por id sumaría el precio equivocado.
	 */
	function loMarcado(pedido: string) {
		return opciones.inversiones?.puedeComprar.find((i) => i.pedido === pedido);
	}

	const loQueGasta = $derived(
		compras.reduce((suma, pedido) => suma + (loMarcado(pedido)?.precioUsd ?? 0), 0)
	);
	const loQueSumaPorAnio = $derived(
		compras.reduce((suma, pedido) => suma + (loMarcado(pedido)?.porTemporadaUsd ?? 0), 0)
	);
	const queCompra = $derived(
		compras.length === 0
			? ''
			: compras.length === 1
				? (loMarcado(compras[0])?.nombre ?? '')
				: `${compras.length} cosas · ${plata(loQueGasta)}`
	);
</script>

{#if opciones.inversiones}
	{@const inv = opciones.inversiones}
	<!--
		La vidriera se abre en una ventana, no empujando la página.

		Plegada como estaba, abrirla sumaba mil quinientos píxeles a una columna
		que ya es larga, y para comparar el tercer artículo con el primero había
		que scrollear con la lista abierta. Es una decisión que se toma mirando
		todo junto y después se cierra: eso es una ventana, no un acordeón.
	-->
	<button type="button" class="abrirla" onclick={() => vidriera?.showModal()}>
		<span class="que">
			<b>Comprar para la temporada</b>
			<i>{queCompra || `Tenés ${plata(inv.plataUsd)}`}</i>
		</span>
		<span class="como">{compras.length > 0 ? 'Cambiar' : 'Ver'}</span>
	</button>

	<dialog
		bind:this={vidriera}
		onclick={(e) => e.target === vidriera && vidriera?.close()}
		class="tienda"
	>
		<div class="caja">
			<header>
				<span class="rotulo">En qué gastás lo tuyo</span>
				<h2>Comprar para la temporada</h2>
				<p class="sutil" style="margin:.4rem 0 0">
					Podés comprar más de una cosa el mismo año: el límite es la plata. Lo que es para siempre
					se paga todos los años, y si un año no te alcanza, lo perdés.
				</p>
			</header>

			<div class="cifras" style="margin-bottom:.9rem">
				<div class="cifra">
					<span class="valor" style="font-size:1.1rem">{plata(inv.plataUsd - loQueGasta)}</span>
					<span class="etiqueta">{compras.length > 0 ? 'Te queda' : 'Tenés'}</span>
				</div>
				{#if inv.gastoAnualUsd > 0 || loQueSumaPorAnio > 0}
					<div class="cifra">
						<span class="valor" style="font-size:1.1rem"
							>{plata(inv.gastoAnualUsd + loQueSumaPorAnio)}</span
						>
						<span class="etiqueta">Se te va por año</span>
					</div>
				{/if}
			</div>
			{#if inv.tiene.length > 0}
				<ul class="tenes" style="margin-bottom:1rem">
					{#each inv.tiene as i (i.id)}
						<li data-rareza={i.rareza}>
							<b>{i.nombre}</b> — {i.efecto}
							{#if i.quedan}
								<span class="restan">
									{i.quedan}
									{i.quedan === 1 ? 'temporada' : 'temporadas'}
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			{#if inv.puedeComprar.length > 0}
				<!--
				Sin "no gastar nada": con casilleros, no marcar ninguno ya es eso. La
				opción existía porque antes eran radios y hacía falta una para poder
				no elegir.
			-->
				<!--
					Tres grupos y no dos: renovar lo que ya tenés es una decisión
					distinta de comprar algo nuevo, y atarlo para siempre es una tercera.
					El staff y los consumibles atados van juntos porque se pagan igual.

					Y en este orden, que no es el que tenían. "Para siempre" iba primero
					y son diez tarjetas caras: en la primera pretemporada, con la plata
					en cero, se abría la vidriera y había que pasar diez veces "no te
					alcanza" antes de llegar a algo comprable. Alan lo reportó como que
					los consumibles habían desaparecido, y desde donde él miraba eso era
					exactamente lo que pasaba. Primero lo que se puede pagar hoy.
				-->
				{#each [{ titulo: 'Renovar lo que ya tenés', cuales: inv.puedeComprar.filter((i) => i.modo === 'renovar') }, { titulo: 'Por unas temporadas · se paga una vez', cuales: porPrecio(inv.puedeComprar.filter((i) => i.modo === 'comprar' && i.dura && i.porTemporadaUsd === 0)) }, { titulo: 'Para siempre · se paga todos los años', cuales: porPrecio(inv.puedeComprar.filter((i) => i.modo !== 'renovar' && i.porTemporadaUsd > 0)) }] as grupo (grupo.titulo)}
					{#if grupo.cuales.length > 0}
						<p class="subtitulo">{grupo.titulo}</p>
						<div class="listaDeCompras">
							{#each grupo.cuales as i (i.pedido)}
								{@const marcada = compras.includes(i.pedido)}
								{@const alcanza = marcada || inv.plataUsd - loQueGasta >= i.precioUsd}
								{@const quedan = i.quedan ?? 0}
								<Opcion
									multiple
									grupo="inversiones"
									form="fase"
									valor={i.pedido}
									titulo={i.modo === 'fijar' ? (i.fijo?.nombre ?? i.nombre) : i.nombre}
									detalle={i.modo === 'renovar'
										? `Te ${quedan === 1 ? 'queda' : 'quedan'} ${quedan} ${quedan === 1 ? 'temporada' : 'temporadas'}. Renovar le suma ${i.dura} más.`
										: i.modo === 'fijar'
											? (i.fijo?.detalle ?? i.detalle)
											: i.detalle}
									marca={i.modo === 'fijar' ? 'siempre' : i.dura ? `×${i.dura}` : 'siempre'}
									bind:elegidas={compras}
									deshabilitada={!alcanza}
								>
									{#snippet extra()}
										<span class="sube">
											<!-- La rareza primero: es lo que dice si esta carta se vuelve a
											     ver el año que viene o si es ahora o nunca. -->
											<span class="chip-sube rareza" data-rareza={i.rareza}>
												{NOMBRE_RAREZA[i.rareza]}
											</span>
											<span class="chip-sube gana">
												{i.modo === 'fijar' ? (i.fijo?.efecto ?? i.efecto) : i.efecto}
											</span>
											{#if i.modo === 'fijar'}
												<span class="chip-sube">No se termina nunca</span>
											{/if}
											<span class="chip-sube {alcanza ? '' : 'pierde'}">
												{plata(i.precioUsd)}{alcanza ? '' : ' · no te alcanza'}
											</span>
											{#if i.porTemporadaUsd > 0}
												<span class="chip-sube pierde">{plata(i.porTemporadaUsd)} por año</span>
											{/if}
										</span>
									{/snippet}
								</Opcion>
							{/each}
						</div>
					{/if}
				{/each}
			{/if}

			<button type="button" class="listo" onclick={() => vidriera?.close()}>
				{compras.length === 0
					? 'Cerrar sin comprar nada'
					: `Listo · ${compras.length} ${compras.length === 1 ? 'cosa' : 'cosas'} por ${plata(loQueGasta)}`}
			</button>
		</div>
	</dialog>
{/if}

{#if opciones.salida}
	<!--
		Pedir salir.

		Va acá abajo y chico, y no arriba con las decisiones del año, porque no es
		una decisión del año: es algo que se hace una vez en toda una carrera, si
		se hace. Estaba arriba de todo y ocupaba una tarjeta entera, así que cada
		temporada la pantalla arrancaba preguntándole al jugador si se quería ir
		del club —una pregunta que casi siempre se contesta que no—. Lo que se
		usa siempre va arriba; esto se usa cuando pasa algo, y cuando pasa, se
		busca.
	-->
	<details class="salida" open={salida === PIDE}>
		<summary>
			<span class="que">¿Te querés ir de {clubActual}?</span>
			<span class="como">{salida === PIDE ? 'Lo pediste' : 'Pedir salir del club'}</span>
		</summary>

		<div class="adentro">
			<p class="elAviso">{opciones.salida.aviso}</p>

			<Opcion
				grupo="pedirSalida"
				form="fase"
				valor=""
				titulo="Seguir como si nada"
				detalle="No decís nada. El club sigue contando con vos y el mercado, con lo que llegue solo."
				bind:elegido={salida}
			/>
			<Opcion
				grupo="pedirSalida"
				form="fase"
				valor={PIDE}
				titulo="Decir que te querés ir"
				detalle="Se lo decís a tu representante y al club. De ahí en adelante se sabe que estás en venta."
				bind:elegido={salida}
			>
				{#snippet extra()}
					<span class="sube">
						<span class="chip-sube gana">Más ofertas en el mercado, y más baratas</span>
						<span class="chip-sube pierde">El técnico: −{LO_QUE_CUESTA_CON_EL_DT}</span>
						<span class="chip-sube pierde">La hinchada: −{LO_QUE_CUESTA_CON_LA_HINCHADA}</span>
					</span>
				{/snippet}
			</Opcion>
		</div>
	</details>
{/if}

<style>
	/*
	 * El filo de la rareza.
	 *
	 * Por el borde y no por el fondo: con cuatro fondos distintos la vidriera se
	 * convierte en un semáforo y deja de leerse. Lo que la rareza tiene que
	 * decir es una sola cosa —si esta carta vuelve el año que viene o si es
	 * ahora o nunca— y para eso alcanza con un color al costado.
	 */
	.chip-sube.rareza {
		color: var(--filo);
		border-color: color-mix(in srgb, var(--filo) 45%, transparent);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		font-size: 0.62rem;
	}

	.tenes li[data-rareza],
	.chip-sube.rareza[data-rareza='comun'] {
		--filo: #5b6478;
	}
	[data-rareza='bronce'] {
		--filo: #b4763a;
	}
	[data-rareza='plata'] {
		--filo: #b9c2d0;
	}
	[data-rareza='dorada'] {
		--filo: #e3b23c;
	}

	.tenes li[data-rareza] {
		border-left: 3px solid var(--filo);
		padding-left: 0.55rem;
	}

	/* El botón que la abre: una línea, como el de pedir salir. */
	.abrirla {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		width: 100%;
		margin: 0 0 1rem;
		padding: 0.75rem 0.95rem;
		background: var(--tarjeta);
		border: 1px solid var(--borde);
		border-left: 3px solid var(--plata, var(--espera));
		border-radius: var(--radio);
		color: var(--texto);
		text-align: left;
		font: inherit;
	}
	.abrirla:hover {
		filter: none;
		background: var(--tarjeta-alta);
	}
	.abrirla .que b {
		display: block;
		font-size: 0.95rem;
		line-height: 1.25;
	}
	.abrirla .que i {
		font-style: normal;
		font-size: 0.8rem;
		color: var(--tenue);
	}
	.abrirla .como {
		flex: none;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--acento);
	}

	/* La ventana. Ancha, con su propio scroll, y con la plata fija arriba. */
	dialog.tienda {
		border: 0;
		padding: 0;
		background: transparent;
		width: min(44rem, calc(100% - 2rem));
		max-height: calc(100dvh - 3rem);
	}
	dialog.tienda::backdrop {
		background: rgba(5, 8, 12, 0.72);
		backdrop-filter: blur(3px);
	}
	.caja {
		background: var(--tarjeta);
		border: 1px solid var(--borde);
		border-radius: var(--radio);
		padding: 1.2rem 1.3rem 1.3rem;
		color: var(--texto);
		max-height: calc(100dvh - 3rem);
		overflow-y: auto;
	}
	.caja header {
		margin-bottom: 1rem;
	}
	.rotulo {
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--espera);
	}
	.caja h2 {
		display: block;
		margin: 0.2rem 0 0;
		font-size: 1.35rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		text-transform: none;
		color: var(--texto);
	}
	.caja h2::after {
		content: none;
	}
	.listo {
		width: 100%;
		margin-top: 1.1rem;
	}

	/* Adentro de la ventana hay ancho: las opciones van de a dos. */
	@media (min-width: 40rem) {
		.caja .listaDeCompras {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0 0.8rem;
		}
	}
	/* Al costado la caja es más angosta que en el medio, así que todo lo que
	   acá se dibuja tiene que caber en 23rem sin apretarse. */
	.subtitulo {
		margin: 1rem 0 0.5rem;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--tenue);
	}
	.tenes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.4rem;
		font-size: 0.84rem;
	}
	.tenes li {
		padding-left: 0.8rem;
		border-left: 2px solid var(--acento);
		line-height: 1.35;
	}
	.tenes b {
		color: var(--texto);
	}
	.restan {
		margin-left: 0.4rem;
		font-size: 0.72rem;
		color: var(--espera);
	}
	.cifras {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.cifra {
		flex: 1;
		min-width: 7rem;
		padding: 0.5rem 0.7rem;
		background: var(--tarjeta-alta);
		border: 1px solid var(--borde);
		border-radius: 10px;
	}
	.cifra .valor {
		display: block;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}
	.cifra .etiqueta {
		display: block;
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--tenue);
	}

	/* Pedir salir: una línea, del tamaño de lo que se usa una vez en una carrera. */
	.salida {
		margin: 0.2rem 0 0;
	}
	.salida > summary {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.6rem;
		padding: 0.6rem 0.2rem;
		list-style: none;
		cursor: pointer;
		font-size: 0.8rem;
		color: var(--tenue);
		border-top: 1px solid var(--borde);
	}
	.salida > summary::-webkit-details-marker {
		display: none;
	}
	.salida > summary:hover .como {
		color: var(--texto);
	}
	.salida .como {
		flex: none;
		font-weight: 700;
		color: var(--mercado);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.salida .adentro {
		padding: 0.2rem 0 0.4rem 0.9rem;
		border-left: 2px solid var(--mercado);
	}
	.salida .elAviso {
		margin: 0 0 0.8rem;
		font-size: 0.86rem;
		line-height: 1.45;
	}
</style>
