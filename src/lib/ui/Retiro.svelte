<script lang="ts">
	import type { Retiro } from '$lib/engine/retiro';
	import type { Estado, Rol } from '$lib/engine/tipos';
	import { club } from '../../../content/mundo';
	import Bandera from './Bandera.svelte';
	import Camiseta from './Camiseta.svelte';
	import Escudo from './Escudo.svelte';
	import Trayectoria from './Trayectoria.svelte';

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

<!--
	La ficha final.

	La última camiseta que usó y los números de toda la carrera juntos. Es lo que
	uno le muestra a otro cuando le cuenta cómo le fue: no el puntaje, los goles.
-->
<div class="ficha">
	<Camiseta
		clubId={retiro.carrera.clubIdFinal}
		numero={estado.futbolista.numero}
		nombre={estado.futbolista.nombre}
		alto={160}
	/>
	<div class="quien">
		<h2>
			<Bandera nacionalidad={estado.futbolista.nacionalidad} alto={14} />
			{estado.futbolista.nombre}
		</h2>
		<p class="sutil" style="margin:.2rem 0 .8rem">
			{retiro.carrera.temporadas} temporadas · se retiró a los {retiro.carrera.edad} en {club(
				retiro.carrera.clubIdFinal
			).nombre}
		</p>
		<div class="numeros">
			{#each [['Partidos', retiro.carrera.partidos], ['Goles', retiro.carrera.goles], ['Asistencias', retiro.carrera.asistencias], ['Títulos', retiro.carrera.titulos], ['Clubes', retiro.carrera.clubes], ['Media máx.', retiro.carrera.mediaMaxima]] as [etiqueta, valor] (etiqueta)}
				<span class="numero">
					<b>{valor}</b>
					<i>{etiqueta}</i>
				</span>
			{/each}
		</div>
	</div>
</div>

{#if retiro.rasgo || retiro.seleccion}
	<div class="tarjeta" data-tema="cancha">
		<h3>Lo que fue</h3>
		{#if retiro.rasgo}
			<p style="margin:0 0 .5rem">
				<span class="chip listo">{retiro.rasgo.nombre}</span>
				<span class="sutil">{retiro.rasgo.siempre}</span>
			</p>
		{/if}
		{#if retiro.seleccion}
			<p style="margin:0">
				{#if retiro.seleccion.campeon}
					<strong>Campeón del mundo.</strong>
				{/if}
				{retiro.seleccion.partidos} partidos con la selección{#if retiro.seleccion.goles > 0}, {retiro
						.seleccion.goles} goles{/if}{#if retiro.seleccion.mundiales > 0}, {retiro.seleccion
						.mundiales}
					{retiro.seleccion.mundiales === 1 ? 'Mundial' : 'Mundiales'} jugados{/if}.
			</p>
		{:else}
			<p class="sutil" style="margin:0">Nunca lo llamaron de la selección.</p>
		{/if}
	</div>
{/if}

<!-- La carrera entera dibujada: veinte temporadas en un solo gráfico. -->
<Trayectoria historial={estado.historial ?? []} />

{#if retiro.duelo}
	{@const d = retiro.duelo}
	<div class="tarjeta" data-tema="historia">
		<h3>El de tu camada</h3>
		<div class="duelo">
			<span class="lado">
				<b>{d.golesYAsistencias}</b>
				<i>{estado.futbolista.nombre.split(' ').slice(-1)[0]}</i>
			</span>
			<span class="contra">G+A</span>
			<span class="lado">
				<b>{d.suyos}</b>
				<i>{d.nombre.split(' ').slice(-1)[0]}</i>
			</span>
		</div>
		<p class="marcadorFinal">
			<Escudo clubId={d.clubId} tamano={22} />
			<span>Temporadas ganadas</span>
			<b class:arriba={d.ganadasPorVos > d.ganadasPorEl}>
				{d.ganadasPorVos}–{d.ganadasPorEl}
			</b>
		</p>
		<p style="margin:.7rem 0 0">{d.texto}</p>
	</div>
{/if}

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
	.ficha {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: var(--tarjeta);
		border: 1px solid var(--borde);
		border-radius: var(--radio);
		padding: 1rem;
		margin: 0 0 1rem;
	}
	.ficha .quien {
		flex: 1;
		min-width: 0;
	}
	.ficha h2 {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
		border: none;
		padding: 0;
		font-size: 1.1rem;
	}
	.numeros {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.35rem;
	}
	.numeros .numero {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: var(--tarjeta-alta);
		border-radius: 7px;
		padding: 0.3rem 0.15rem;
	}
	.numeros b {
		font-size: 1rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}
	.numeros i {
		font-style: normal;
		font-size: 0.52rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--tenue);
		margin-top: 0.15rem;
	}

	.duelo {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.2rem;
		padding: 0.4rem 0 0.8rem;
	}
	.duelo .lado {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 0;
	}
	.duelo .lado b {
		font-size: 2rem;
		font-weight: 800;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.duelo .lado i {
		font-style: normal;
		font-size: 0.72rem;
		color: var(--tenue);
		margin-top: 0.2rem;
	}
	.duelo .contra {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--tenue);
	}
	.marcadorFinal {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		padding-top: 0.75rem;
		border-top: 1px solid var(--borde);
		font-size: 0.85rem;
		color: var(--tenue);
	}
	.marcadorFinal span {
		flex: 1;
	}
	.marcadorFinal b {
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
		color: var(--tenue);
	}
	.marcadorFinal b.arriba {
		color: var(--acento);
	}

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
