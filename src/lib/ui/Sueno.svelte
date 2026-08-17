<script lang="ts">
	import type { Progreso } from '$lib/engine/suenos';

	/**
	 * Para qué estás jugando.
	 *
	 * Es la tarjeta que más veces se va a ver en toda la partida: aparece en las
	 * tres fases de las quince temporadas. Por eso está armada alrededor de una
	 * sola frase —"faltan 23 goles"— y no de una tabla: lo que hace volver es una
	 * cuenta a medio terminar, y una cuenta a medio terminar se lee de un vistazo
	 * o no se lee.
	 *
	 * Abajo, chiquito, va el del otro. No es información de más: en el mercado los
	 * dos tienen que elegir el mismo club, y saber que al otro le faltan dos
	 * temporadas para su número explica por qué está empujando para ese lado.
	 */
	let {
		mio,
		delOtro = null
	}: { mio: Progreso; delOtro?: (Progreso & { deQuien: string }) | null } = $props();

	// Las marcas del camino. Con la barra sola, el 40% y el 45% se ven iguales;
	// con los cuartos marcados se ve que se cruzó uno.
	const CORTES = [25, 50, 75];
</script>

<div class="tarjeta sueno" class:cumplido={mio.cumplido} data-tema="cancha">
	<div class="arriba">
		<span class="rotulo">Tu sueño</span>
		{#if mio.cumplido}<span class="chip listo">Cumplido</span>{/if}
	</div>

	<h3 class="nombre">{mio.nombre}</h3>

	<div class="barra" role="img" aria-label={`${mio.pct}%: ${mio.lleva}`}>
		<div class="relleno" style="width:{mio.pct}%"></div>
		{#each CORTES as corte (corte)}
			<span class="corte" class:pasado={mio.pct >= corte} style="left:{corte}%"></span>
		{/each}
	</div>

	<div class="cuenta">
		<strong class="falta">{mio.falta}</strong>
		<span class="lleva">{mio.lleva}</span>
	</div>

	<p class="comoVa">{mio.comoVa}</p>

	{#if delOtro}
		<div class="otro">
			<span class="quien">{delOtro.deQuien} va por</span>
			<span class="suNombre">{delOtro.nombre}</span>
			<span class="suBarra"><span class="suRelleno" style="width:{delOtro.pct}%"></span></span>
			<span class="suPct">{delOtro.cumplido ? '✔' : `${delOtro.pct}%`}</span>
		</div>
	{/if}
</div>

<style>
	.arriba {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.rotulo {
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--tenue);
	}
	.nombre {
		margin: 0.25rem 0 0.75rem;
		font-size: 1.25rem;
	}

	.barra {
		position: relative;
		height: 12px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}
	.relleno {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, var(--acento), #a3e635);
		transition: width 0.5s ease-out;
	}
	.corte {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		margin-left: -1px;
		background: var(--tarjeta);
		opacity: 0.75;
	}
	.corte.pasado {
		opacity: 0.35;
	}

	.cuenta {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 0.6rem;
	}
	.falta {
		font-size: 1.05rem;
		font-variant-numeric: tabular-nums;
	}
	.lleva {
		font-size: 0.8rem;
		color: var(--tenue);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.comoVa {
		margin: 0.5rem 0 0;
		font-size: 0.86rem;
		color: var(--tenue);
		line-height: 1.4;
	}

	.sueno.cumplido .relleno {
		background: linear-gradient(90deg, #fbbf24, #fde68a);
	}
	.sueno.cumplido .nombre {
		color: #fbbf24;
	}

	/* El del otro: una línea, y que se note que es de otro. */
	.otro {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.35rem 0.5rem;
		margin-top: 0.9rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--borde);
		font-size: 0.78rem;
		color: var(--tenue);
	}
	.quien {
		flex: none;
	}
	/* Sin recortar. "El goleador ..." no dice nada; el punto de mostrar el sueño
	   del otro es saber para dónde tira, y para eso hay que poder leerlo. */
	.suNombre {
		font-weight: 700;
		color: var(--texto);
	}
	.suBarra {
		flex: 1;
		min-width: 32px;
		height: 5px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}
	.suRelleno {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: var(--tenue);
	}
	.suPct {
		flex: none;
		font-variant-numeric: tabular-nums;
		font-weight: 700;
	}
</style>
