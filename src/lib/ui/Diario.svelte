<script lang="ts">
	import { NOMBRE_FASE, type Fase } from '$lib/engine/tipos';

	/**
	 * El diario de la carrera, agrupado por temporada.
	 *
	 * Después de veinte temporadas el diario tenía setenta mil píxeles de alto y
	 * era ilegible: para ver lo de este año había que scrollear toda la carrera.
	 * Ahora la temporada en curso viene abierta y las anteriores plegadas, con un
	 * resumen de cuántas cosas pasaron. La historia sigue estando entera, pero se
	 * entra a buscarla en vez de tropezarse con ella.
	 */
	type Entrada = { tipo: string; texto: string; temporada: number; fase: number };

	let { entradas }: { entradas: Entrada[] } = $props();

	/** Un signo por tipo de entrada, para poder barrer la lista con la vista. */
	const SIGNO: Record<string, string> = {
		gol: '⚽',
		asistencia: '↗',
		ocasion: '◆',
		lesion: '✚',
		titulo: '★',
		tecnico: '▣',
		prensa: '❝',
		pase: '⇄',
		mercado: '⇄',
		ingresos: '$',
		inversion: '◈',
		rasgo: '✦',
		sueno: '✧',
		sueno_cumplido: '✧',
		contrato: '✎',
		entrenamiento: '↑',
		objetivo: '➤',
		progreso: '⤒',
		seleccion: '⚑',
		gestion: '☎',
		nota: '✉',
		retiro: '■',
		evento: '!',
		representacion: '✍',
		avance_forzado: '»',
		temporada_jugada: '▸',
		temporada_cerrada: '▸',
		fase_cerrada: '·',
		jugador_entro: '·'
	};

	/** Las entradas de trámite: se guardan, pero no valen una línea propia. */
	const CALLADAS = new Set(['fase_cerrada']);

	const temporadas = $derived.by(() => {
		const porTemporada = new Map<number, Entrada[]>();
		for (const e of entradas) {
			if (CALLADAS.has(e.tipo)) continue;
			const lista = porTemporada.get(e.temporada) ?? [];
			lista.push(e);
			porTemporada.set(e.temporada, lista);
		}
		return [...porTemporada.entries()]
			.map(([temporada, lista]) => ({ temporada, entradas: [...lista].reverse() }))
			.sort((a, b) => b.temporada - a.temporada);
	});

	const ultima = $derived(temporadas[0]?.temporada ?? 0);

	/**
	 * Cuántas líneas se ven de la temporada abierta antes de plegar el resto.
	 *
	 * Una temporada entera son veinte y pico de líneas, casi dos mil píxeles al
	 * pie de una pantalla que ya era larguísima. Las últimas seis alcanzan para
	 * contar qué pasó desde la vez anterior, que es a lo que se baja hasta acá; el
	 * archivo completo sigue estando a un toque.
	 */
	const A_LA_VISTA = 6;
</script>

{#if temporadas.length > 0}
	<h2>Diario</h2>
	{#each temporadas as t (t.temporada)}
		{@const cortar = t.temporada === ultima && t.entradas.length > A_LA_VISTA + 2}
		<details class="temporada" open={t.temporada === ultima}>
			<summary>
				<span class="titulo">Temporada {t.temporada}</span>
				<span class="cuantas">{t.entradas.length}</span>
			</summary>
			<ul class="diario">
				{#each cortar ? t.entradas.slice(0, A_LA_VISTA) : t.entradas as entrada, i (i)}
					<li>
						<span class="signo">{SIGNO[entrada.tipo] ?? '·'}</span>
						<span>
							<span class="momento">{NOMBRE_FASE[entrada.fase as Fase]}</span>
							{entrada.texto}
						</span>
					</li>
				{/each}
			</ul>
			{#if cortar}
				<details class="resto">
					<summary>Ver las otras {t.entradas.length - A_LA_VISTA} de la temporada</summary>
					<ul class="diario">
						{#each t.entradas.slice(A_LA_VISTA) as entrada, i (i)}
							<li>
								<span class="signo">{SIGNO[entrada.tipo] ?? '·'}</span>
								<span>
									<span class="momento">{NOMBRE_FASE[entrada.fase as Fase]}</span>
									{entrada.texto}
								</span>
							</li>
						{/each}
					</ul>
				</details>
			{/if}
		</details>
	{/each}
{/if}

<style>
	.temporada {
		background: var(--tarjeta);
		border: 1px solid var(--borde);
		border-radius: var(--radio);
		margin-bottom: 0.6rem;
		overflow: hidden;
	}
	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.8rem 1.1rem;
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary .titulo {
		font-weight: 700;
		font-size: 0.95rem;
	}
	summary .cuantas {
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		color: var(--tenue);
		border: 1px solid var(--borde);
		border-radius: 999px;
		padding: 0.05rem 0.5rem;
	}
	/* El resto de la temporada abierta, plegado. */
	.resto > summary {
		padding: 0.55rem 1.1rem 0.9rem;
		font-size: 0.8rem;
		color: var(--tenue);
	}
	.resto > summary:hover {
		color: var(--texto);
	}
	.resto .diario {
		padding-top: 0;
	}

	.diario {
		list-style: none;
		margin: 0;
		padding: 0 1.1rem 0.6rem;
	}
	.diario li {
		display: grid;
		grid-template-columns: 1.3rem 1fr;
		gap: 0.5rem;
		padding: 0.55rem 0;
		border-top: 1px solid var(--borde);
		font-size: 0.92rem;
	}
	.signo {
		color: var(--tenue);
		text-align: center;
		line-height: 1.5;
	}
	.momento {
		display: block;
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--tenue);
	}
</style>
