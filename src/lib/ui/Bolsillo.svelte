<script lang="ts">
	import { contexto } from '../../../content/mundo';
	import { LO_QUE_CUESTA_CON_EL_DT, LO_QUE_CUESTA_CON_LA_HINCHADA, PIDE } from '$lib/engine/salida';
	import type { OpcionesDeFase } from '$lib/engine/pantalla';
	import type { Estado } from '$lib/engine/tipos';
	import Opcion from './Opcion.svelte';
	import Paso from './Paso.svelte';

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

	const clubActual = $derived(contexto(estado.futbolista.contrato.clubId).club.nombre);

	function plata(usd: number): string {
		return `USD ${usd.toLocaleString('es-AR')}`;
	}

	/** Lo que se lleva del bolsillo lo que está marcado, y lo que suma por año. */
	const loQueGasta = $derived(
		compras.reduce(
			(suma, id) =>
				suma + (opciones.inversiones?.puedeComprar.find((i) => i.id === id)?.precioUsd ?? 0),
			0
		)
	);
	const loQueSumaPorAnio = $derived(
		compras.reduce(
			(suma, id) =>
				suma + (opciones.inversiones?.puedeComprar.find((i) => i.id === id)?.porTemporadaUsd ?? 0),
			0
		)
	);
	const queCompra = $derived(
		compras.length === 0
			? ''
			: compras.length === 1
				? (opciones.inversiones?.puedeComprar.find((i) => i.id === compras[0])?.nombre ?? '')
				: `${compras.length} cosas · ${plata(loQueGasta)}`
	);
</script>

{#if opciones.inversiones}
	{@const inv = opciones.inversiones}
	<Paso
		titulo="Comprar para la temporada"
		elegido={queCompra}
		dato={compras.length === 0 ? `Tenés ${plata(inv.plataUsd)}` : ''}
		tema="plata"
		nota="Preparador, fisio, botines, la casa de la familia. Podés comprar más de una cosa el mismo año: el límite es la plata. Lo que es para siempre se paga todos los años, y si un año no te alcanza, lo perdés."
	>
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
					<li>
						<b>{i.nombre}</b> — {i.efecto}
						{#if i.dura}<span class="restan">queda{i.dura > 1 ? 'n' : ''} poco</span>{/if}
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
			{#each [{ titulo: 'Para siempre · se paga todos los años', cuales: inv.puedeComprar.filter((i) => !i.dura) }, { titulo: 'Por una o dos temporadas · se paga una vez', cuales: inv.puedeComprar.filter((i) => i.dura) }] as grupo (grupo.titulo)}
				{#if grupo.cuales.length > 0}
					<p class="subtitulo">{grupo.titulo}</p>
					{#each grupo.cuales as i (i.id)}
						{@const marcada = compras.includes(i.id)}
						{@const alcanza = marcada || inv.plataUsd - loQueGasta >= i.precioUsd}
						<Opcion
							multiple
							grupo="inversiones"
							form="fase"
							valor={i.id}
							titulo={i.nombre}
							detalle={i.detalle}
							bind:elegidas={compras}
							deshabilitada={!alcanza}
						>
							{#snippet extra()}
								<span class="sube">
									<span class="chip-sube gana">{i.efecto}</span>
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
				{/if}
			{/each}
		{/if}
	</Paso>
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
	.sube {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-top: 0.5rem;
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
