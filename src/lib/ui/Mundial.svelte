<script lang="ts">
	import type { OpcionesDeFase } from '$lib/engine/pantalla';
	import type { Estado } from '$lib/engine/tipos';
	import Bandera from './Bandera.svelte';

	/**
	 * El Mundial que viene.
	 *
	 * Es lo único del juego que no se puede apurar: llega cada cuatro años y
	 * mientras tanto lo único que se puede hacer es estar mejor cuando llegue.
	 * Por eso está siempre a la vista desde la primera temporada, con la cuenta
	 * regresiva y qué tan lejos está de que lo llamen.
	 *
	 * Ver "faltan 3 temporadas" y "estás al 12%" en la misma tarjeta es lo que
	 * convierte una decisión de pretemporada en una decisión con destino.
	 */
	let { opciones, estado }: { opciones: OpcionesDeFase; estado: Estado } = $props();

	const m = $derived(opciones.mundial);
	const sel = $derived(estado.seleccion);

	const tono = $derived(!m ? '' : m.chance >= 60 ? 'bien' : m.chance >= 25 ? 'medio' : 'mal');

	const RESULTADO: Record<string, string> = {
		campeon: 'Campeón',
		final: 'Subcampeón',
		semifinal: 'Semifinal',
		cuartos: 'Cuartos',
		'fase-de-grupos': 'Fase de grupos',
		'no-fue': '—'
	};
</script>

{#if m}
	<div class="tarjeta" class:campeon={m.campeon} data-tema="mercado">
		<h3>
			{#if m.faltan === 0}Mundial {m.anio}{:else}Camino al Mundial {m.anio}{/if}
		</h3>

		<div class="fila">
			<span class="cuenta">
				{#if m.faltan === 0}
					<span class="ahora">ES ESTE AÑO</span>
				{:else}
					<span class="numero">{m.faltan}</span>
					<span class="unidad">{m.faltan === 1 ? 'temporada' : 'temporadas'}</span>
				{/if}
			</span>

			<span class="chance">
				<span class="etiqueta">
					<Bandera nacionalidad={estado.futbolista.nacionalidad} alto={11} />
					Que te llamen
				</span>
				<span class="barra">
					<span class="relleno {tono}" style="width:{Math.max(2, m.chance)}%"></span>
				</span>
				<span class="pct {tono}">{m.chance}%</span>
			</span>
		</div>

		<p class="sutil" style="margin:.75rem 0 0">{m.queFalta}</p>

		{#if sel.debuto}
			<div class="historial">
				<span class="dato">
					<b>{sel.partidos}</b> partidos con la selección
				</span>
				{#if sel.goles > 0}<span class="dato"><b>{sel.goles}</b> goles</span>{/if}
			</div>
			{#if sel.mundiales.length > 0}
				<ul class="mundiales">
					{#each sel.mundiales as mundial (mundial.anio)}
						<li class:ganado={mundial.resultado === 'campeon'}>
							<span class="anio">{mundial.anio}</span>
							<span>{RESULTADO[mundial.resultado]}</span>
							{#if mundial.goles > 0}<span class="goles">{mundial.goles} ⚽</span>{/if}
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</div>
{/if}

<style>
	.campeon {
		border-color: rgba(224, 184, 58, 0.5);
		background: linear-gradient(180deg, rgba(224, 184, 58, 0.12), rgba(224, 184, 58, 0.03));
	}
	.fila {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.cuenta {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: none;
		min-width: 4.5rem;
	}
	.numero {
		font-size: 2.4rem;
		font-weight: 800;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.unidad {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--tenue);
	}
	.ahora {
		font-size: 0.86rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		color: var(--plata);
		text-align: center;
	}
	.chance {
		flex: 1;
		min-width: 0;
	}
	.chance .etiqueta {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.78rem;
		color: var(--tenue);
		margin-bottom: 0.35rem;
	}
	.barra {
		display: block;
		height: 7px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.09);
		overflow: hidden;
	}
	.relleno {
		display: block;
		height: 100%;
		border-radius: 999px;
	}
	.relleno.bien {
		background: var(--acento);
	}
	.relleno.medio {
		background: var(--espera);
	}
	.relleno.mal {
		background: var(--malo);
	}
	.pct {
		display: block;
		margin-top: 0.3rem;
		font-size: 0.82rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.pct.bien {
		color: var(--acento);
	}
	.pct.medio {
		color: var(--espera);
	}
	.pct.mal {
		color: var(--malo);
	}
	.historial {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 0.75rem;
		margin-top: 0.85rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--borde);
		font-size: 0.82rem;
		color: var(--tenue);
	}
	.historial b {
		color: var(--texto);
		font-variant-numeric: tabular-nums;
	}
	.mundiales {
		list-style: none;
		margin: 0.6rem 0 0;
		padding: 0;
		display: grid;
		gap: 0.3rem;
	}
	.mundiales li {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		font-size: 0.85rem;
	}
	.mundiales .anio {
		font-variant-numeric: tabular-nums;
		font-weight: 700;
		color: var(--tenue);
	}
	.mundiales li.ganado {
		color: var(--plata);
		font-weight: 700;
	}
	.mundiales .goles {
		color: var(--tenue);
		font-size: 0.78rem;
	}
</style>
