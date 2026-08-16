<script lang="ts">
	import type { Retiro } from '$lib/engine/retiro';
	import type { Estado, Rol } from '$lib/engine/tipos';

	/**
	 * La pantalla del final.
	 *
	 * Los dos ven lo mismo, con su puntaje adelante y el del otro abajo. Es a
	 * propósito: el juego termina con los dos mirando el mismo resultado, y ahí
	 * se ve si las decisiones de uno le sirvieron al otro.
	 */
	let { retiro, estado, rol }: { retiro: Retiro; estado: Estado; rol: Rol } = $props();

	const mio = $derived(rol === 'futbolista' ? retiro.futbolista : retiro.representante);
	const suyo = $derived(rol === 'futbolista' ? retiro.representante : retiro.futbolista);
	const nombreMio = $derived(
		rol === 'futbolista' ? estado.futbolista.nombre : estado.representante.nombre
	);
	const nombreSuyo = $derived(
		rol === 'futbolista' ? estado.representante.nombre : estado.futbolista.nombre
	);
</script>

<div class="final">
	<span class="chapa">Fin de la carrera</span>
	<p class="epitafio">{retiro.epitafio}</p>
</div>

<div class="tarjeta puntaje">
	<h3>{nombreMio}</h3>
	<span class="numerote">{mio.total.toLocaleString('es-AR')}</span>
	<span class="rango">{mio.rango.titulo}</span>
	<p class="sutil" style="margin:.4rem 0 0">{mio.rango.texto}</p>
</div>

<div class="tarjeta">
	<h3>De dónde salió</h3>
	<ul class="desglose">
		{#each mio.desglose as d (d.concepto)}
			<li>
				<span>{d.concepto}</span>
				<b class:resta={d.puntos < 0}>
					{d.puntos > 0 ? '+' : ''}{d.puntos.toLocaleString('es-AR')}
				</b>
			</li>
		{/each}
		{#if mio.multiplicador > 1}
			<li class="multiplicador">
				<span>Por haberse quedado</span>
				<b>×{mio.multiplicador.toFixed(2)}</b>
			</li>
		{/if}
	</ul>
</div>

{#if retiro.idolatria.length > 0}
	<div class="tarjeta">
		<h3>Ídolo</h3>
		<div class="clubes">
			{#each retiro.idolatria as i (i.nombre)}
				<div class="club">
					<span class="nombreclub">{i.nombre}</span>
					<span class="anos">{i.temporadas} temporadas</span>
				</div>
			{/each}
		</div>
	</div>
{/if}

<div class="tarjeta">
	<h3>{nombreSuyo}</h3>
	<div class="otro">
		<span class="numerito">{suyo.total.toLocaleString('es-AR')}</span>
		<div>
			<strong>{suyo.rango.titulo}</strong>
			<p class="sutil" style="margin:.15rem 0 0">{suyo.rango.texto}</p>
		</div>
	</div>
</div>

<p class="sutil" style="margin-top:1.5rem">
	<a href="/">Armar otra carrera</a>
</p>

<style>
	.final {
		text-align: center;
		padding: 1.5rem 0 0.5rem;
	}
	.chapa {
		display: inline-block;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--tenue);
		border: 1px solid var(--borde);
		border-radius: 999px;
		padding: 0.25rem 0.8rem;
	}
	.epitafio {
		font-size: 1.15rem;
		line-height: 1.45;
		margin: 1rem 0 1.5rem;
	}
	.puntaje {
		text-align: center;
	}
	.numerote {
		display: block;
		font-size: clamp(3rem, 16vw, 4.5rem);
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.04em;
		color: var(--acento);
		font-variant-numeric: tabular-nums;
	}
	.rango {
		display: block;
		font-size: 1.05rem;
		font-weight: 700;
		margin-top: 0.4rem;
	}
	.desglose {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.desglose li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.4rem 0;
		border-bottom: 1px solid var(--borde);
		font-size: 0.92rem;
	}
	.desglose li:last-child {
		border-bottom: 0;
	}
	.desglose b {
		font-variant-numeric: tabular-nums;
		color: var(--acento);
		flex: none;
	}
	.desglose b.resta {
		color: var(--malo);
	}
	.multiplicador b {
		color: var(--espera);
	}
	.clubes {
		display: grid;
		gap: 0.5rem;
	}
	.club {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}
	.nombreclub {
		font-weight: 700;
		flex: 1;
	}
	.anos {
		font-size: 0.82rem;
		color: var(--tenue);
	}
	.otro {
		display: flex;
		align-items: center;
		gap: 0.9rem;
	}
	.numerito {
		font-size: 1.9rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: var(--tenue);
		flex: none;
	}
</style>
