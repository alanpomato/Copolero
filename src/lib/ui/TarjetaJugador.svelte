<script lang="ts">
	import { media } from '$lib/engine/estado';
	import { idolatriaDe } from '$lib/engine/idolatria';
	import { NOMBRE_ATRIBUTO, puesto as puestoPorId } from '$lib/engine/puestos';
	import type { OpcionesDeFase } from '$lib/engine/pantalla';
	import type { Atributos, Estado } from '$lib/engine/tipos';
	import { contexto } from '../../../content/mundo';
	import Bandera from './Bandera.svelte';
	import Escudo from './Escudo.svelte';

	/**
	 * La ficha del jugador, de un vistazo.
	 *
	 * Todo lo que define al futbolista en una sola grilla de casilleros: la media
	 * grande a la izquierda, lo que lleva hecho, lo que sabe hacer, lo que vale, y
	 * cuánto lo quiere la gente. La idea es que no haya que leer: se barre con la
	 * vista y se entiende.
	 *
	 * Los cinco atributos que se muestran son los que su puesto usa, no los ocho:
	 * a un 9 la marca no le importa, y ocho números iguales no se miran. El que
	 * subió desde la última vez lleva una flecha, que es lo único que hace visible
	 * el progreso de una temporada a otra.
	 */
	let {
		estado,
		opciones
	}: {
		estado: Estado;
		opciones: OpcionesDeFase;
	} = $props();

	const f = $derived(estado.futbolista);
	const puesto = $derived(puestoPorId(f.puesto));
	const suMedia = $derived(media(f.atributos, f.posicion));
	const donde = $derived(contexto(f.contrato.clubId));
	const idolatria = $derived(idolatriaDe(estado));
	const subieron = $derived(new Set(estado.atributosQueSubieron ?? []));

	/** Los cinco atributos que el puesto usa, del que más pesa al que menos. */
	const CINCO: Record<string, (keyof Atributos)[]> = {
		arquero: ['potencia', 'defensa', 'resistencia', 'liderazgo', 'pase'],
		defensor: ['defensa', 'potencia', 'resistencia', 'velocidad', 'liderazgo'],
		mediocampista: ['pase', 'regate', 'resistencia', 'definicion', 'liderazgo'],
		delantero: ['definicion', 'velocidad', 'regate', 'potencia', 'liderazgo']
	};
	const suyos = $derived(CINCO[f.posicion] ?? CINCO.delantero);

	function plata(usd: number): string {
		if (usd >= 1_000_000) return `US$ ${(usd / 1_000_000).toFixed(1).replace('.', ',')}M`;
		if (usd >= 1_000) return `US$ ${Math.round(usd / 1_000)}K`;
		return `US$ ${usd}`;
	}
</script>

<div class="ficha">
	<header class="arriba">
		<span class="media">
			<span class="numero">{suMedia}</span>
			<span class="pie">Media</span>
		</span>

		<div class="quien">
			<h3>
				<Bandera nacionalidad={f.nacionalidad} alto={13} />
				<span class="nombre">{f.nombre}</span>
				<span class="dorsal">· la {f.numero}</span>
			</h3>
			<p class="linea">{donde.club.nombre} · {estado.anio} · {f.edad} años</p>
			<p class="linea liga">{donde.liga.nombre} · fama {f.fama}</p>
		</div>

		<Escudo clubId={f.contrato.clubId} tamano={46} />
	</header>

	<div class="tiles cuatro">
		{#each [['Goles', f.goles], ['Asistencias', f.asistencias], ['Partidos', f.partidos], ['Títulos', f.titulos]] as [etiqueta, valor] (etiqueta)}
			<span class="tile" class:destacado={etiqueta === 'Goles' && (valor as number) > 0}>
				<b>{valor}</b>
				<i>{etiqueta}</i>
			</span>
		{/each}
	</div>

	<div class="tiles cinco">
		{#each suyos as a (a)}
			<span class="tile atributo" class:subio={subieron.has(a)}>
				<b
					>{f.atributos[a]}{#if subieron.has(a)}<em>▲</em>{/if}</b
				>
				<i>{NOMBRE_ATRIBUTO[a]}</i>
			</span>
		{/each}
	</div>

	<div class="tiles tres">
		<span class="tile azul">
			<b>{plata(f.valorMercadoUsd)}</b>
			<i>Valor</i>
		</span>
		<span class="tile oro">
			<b>{plata(f.dineroUsd)}</b>
			<i>Ganado</i>
		</span>
		<span class="tile">
			<b>{plata(f.contrato.salarioMensual)}</b>
			<i>Por mes</i>
		</span>
	</div>

	<div class="idolatria">
		<div class="cabezaIdolatria">
			<span class="titulo">Idolatría</span>
			<span class="escalon">
				{idolatria.escalon.nombre} · {idolatria.valor}/100
			</span>
		</div>
		<div class="barra">
			<span class="relleno" style="width:{Math.max(1, idolatria.valor)}%"></span>
			{#each idolatria.cortes as corte (corte)}
				<span class="corte" style="left:{corte}%" class:pasado={idolatria.valor >= corte}></span>
			{/each}
		</div>
		<p class="sutil" style="margin:.4rem 0 0">
			{#if idolatria.siguiente}
				{idolatria.faltan} para <b>{idolatria.siguiente.nombre.toLowerCase()}</b>. {idolatria
					.escalon.texto}
			{:else}
				{idolatria.escalon.texto}
			{/if}
		</p>
	</div>

	{#if opciones.mundial}
		<p class="seleccion">
			<Bandera nacionalidad={f.nacionalidad} alto={11} />
			<span>Selección:</span>
			<b class:sin={opciones.mundial.chance < 10}>
				{#if opciones.mundial.chance <= 0}
					sin chance
				{:else}
					{opciones.mundial.chance}% de que te llamen
				{/if}
			</b>
		</p>
	{/if}

	{#if opciones.rasgoElegido}
		<p class="rasgo">
			<span class="marca">{opciones.rasgoElegido.nombre}</span>
			<span class="sutil">{opciones.rasgoElegido.siempre}</span>
		</p>
	{/if}

	{#if opciones.situacion}
		<p class="situacion">
			<span class="chip {opciones.situacion.tono === 'bien' ? 'listo' : 'espera'}">
				{opciones.situacion.texto}
			</span>
			<span class="sutil">{puesto.nombre} · pie {f.pie}</span>
		</p>
	{/if}
</div>

<style>
	.ficha {
		background: var(--tarjeta);
		border: 1px solid var(--borde);
		border-radius: var(--radio);
		padding: 0.9rem;
		margin: 0 0 1rem;
		position: relative;
		overflow: hidden;
	}
	/* La franja de arriba, con el color de la cancha. */
	.ficha::before {
		content: '';
		position: absolute;
		inset: 0 0 auto;
		height: 3px;
		background: linear-gradient(90deg, var(--cancha), transparent);
	}

	.arriba {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		margin-bottom: 0.75rem;
	}
	.media {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: none;
		line-height: 1;
	}
	.media .numero {
		font-size: 2.6rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.04em;
	}
	.media .pie {
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--tenue);
		margin-top: 0.15rem;
	}

	.quien {
		flex: 1;
		min-width: 0;
	}
	.quien h3 {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin: 0;
		border: none;
		padding: 0;
		font-size: 1.05rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0;
		color: var(--texto);
		min-width: 0;
	}
	.nombre {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.dorsal {
		flex: none;
		color: var(--cancha);
	}
	.linea {
		margin: 0.15rem 0 0;
		font-size: 0.76rem;
		color: var(--tenue);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.linea.liga {
		color: var(--acento);
	}

	.tiles {
		display: grid;
		gap: 0.35rem;
		margin-bottom: 0.35rem;
	}
	.cuatro {
		grid-template-columns: repeat(4, 1fr);
	}
	.cinco {
		grid-template-columns: repeat(5, 1fr);
	}
	.tres {
		grid-template-columns: repeat(3, 1fr);
	}

	.tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.1rem;
		background: var(--tarjeta-alta);
		border: 1px solid var(--borde);
		border-radius: 8px;
		padding: 0.4rem 0.15rem 0.3rem;
		min-width: 0;
	}
	.tile b {
		font-size: 1.05rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		white-space: nowrap;
	}
	.tile i {
		font-style: normal;
		font-size: 0.54rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--tenue);
		text-align: center;
		line-height: 1.15;
	}
	.tile.destacado {
		border-color: rgba(74, 222, 128, 0.45);
	}
	.tile.destacado b {
		color: var(--acento);
	}
	.tile.atributo b {
		font-size: 1rem;
	}
	.tile.subio {
		border-color: rgba(224, 184, 58, 0.5);
	}
	.tile.subio b {
		color: var(--plata);
	}
	.tile.subio em {
		font-style: normal;
		font-size: 0.6rem;
		margin-left: 0.1rem;
		vertical-align: 0.15em;
	}
	.tile.azul b {
		color: var(--relacion);
		font-size: 0.95rem;
	}
	.tile.oro b {
		color: var(--plata);
		font-size: 0.95rem;
	}
	.tres .tile b {
		font-size: 0.92rem;
	}

	.idolatria {
		margin-top: 0.8rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--borde);
	}
	.cabezaIdolatria {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.4rem;
	}
	.cabezaIdolatria .titulo {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--tenue);
	}
	.cabezaIdolatria .escalon {
		font-size: 0.8rem;
		font-weight: 700;
	}
	.barra {
		position: relative;
		height: 9px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}
	.relleno {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, var(--cancha), var(--plata));
	}
	.corte {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--fondo);
		opacity: 0.8;
	}
	.corte.pasado {
		opacity: 0.35;
	}

	.seleccion {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin: 0.8rem 0 0;
		font-size: 0.82rem;
		color: var(--tenue);
	}
	.seleccion b {
		color: var(--acento);
	}
	.seleccion b.sin {
		color: var(--tenue);
	}

	.rasgo {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.4rem 0.55rem;
		margin: 0.7rem 0 0;
		font-size: 0.8rem;
	}
	.rasgo .marca {
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		font-size: 0.72rem;
		color: var(--plata);
		border: 1px solid rgba(224, 184, 58, 0.45);
		border-radius: 999px;
		padding: 0.15rem 0.55rem;
	}

	.situacion {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 0.7rem 0 0;
	}
</style>
