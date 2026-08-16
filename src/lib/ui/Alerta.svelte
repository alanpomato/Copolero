<script lang="ts">
	import type { Alerta } from '$lib/engine/alertas';

	/**
	 * El aviso de que algo está yendo mal.
	 *
	 * Va arriba de todo y no se parece a ninguna otra tarjeta: fondo con color,
	 * borde grueso y la salida separada del problema. Es lo único de la pantalla
	 * que le dice al jugador qué hacer, y por eso tiene que verse antes que los
	 * números que lo explican.
	 */
	let { alerta }: { alerta: Alerta } = $props();
</script>

<div class="alerta" class:roja={alerta.gravedad === 'roja'}>
	<div class="cabeza">
		<span class="signo">{alerta.gravedad === 'roja' ? '!' : '?'}</span>
		<h3>{alerta.titulo}</h3>
	</div>
	<p class="que">{alerta.texto}</p>
	<p class="salida"><b>Qué hacer:</b> {alerta.salida}</p>
</div>

<style>
	.alerta {
		--tono: var(--espera);
		border: 1px solid color-mix(in srgb, var(--tono) 45%, transparent);
		border-left: 4px solid var(--tono);
		background: color-mix(in srgb, var(--tono) 10%, var(--tarjeta));
		border-radius: var(--radio);
		padding: 0.9rem 1rem;
		margin: 0 0 1rem;
	}
	.alerta.roja {
		--tono: var(--malo);
	}

	.cabeza {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		margin-bottom: 0.5rem;
	}
	.signo {
		flex: none;
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--tono);
		color: #0d1117;
		font-weight: 800;
		font-size: 0.9rem;
		line-height: 1;
	}
	.cabeza h3 {
		margin: 0;
		border: none;
		padding: 0;
		font-size: 0.98rem;
		color: var(--tono);
		text-transform: none;
		letter-spacing: 0;
	}

	.que {
		margin: 0 0 0.6rem;
		font-size: 0.9rem;
		line-height: 1.45;
		color: var(--texto);
	}
	.salida {
		margin: 0;
		padding-top: 0.6rem;
		border-top: 1px solid var(--borde);
		font-size: 0.88rem;
		line-height: 1.45;
		color: var(--tenue);
	}
	.salida b {
		color: var(--texto);
	}
</style>
