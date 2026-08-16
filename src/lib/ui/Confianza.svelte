<script lang="ts">
	import type { Estado, Rol } from '$lib/engine/tipos';

	/**
	 * La confianza, que es la variable que une a los dos.
	 *
	 * Estaba perdida como un número más entre veinte números iguales, y es la
	 * única que atraviesa toda la partida: sube cuando el representante elige
	 * estar, baja sola cinco puntos por temporada, y se rompe cuando no se ponen
	 * de acuerdo en un pase o en la mesa. Si el juego tiene un centro, es ésta.
	 *
	 * Por eso va destacada y con nombre: un 43 no dice nada, "se está enfriando"
	 * sí.
	 */
	let { estado, rol }: { estado: Estado; rol: Rol } = $props();

	const valor = $derived(estado.confianza);

	const estados = [
		{ desde: 85, nombre: 'Se bancan a muerte', tono: 'bien' },
		{ desde: 65, nombre: 'Están bien', tono: 'bien' },
		{ desde: 45, nombre: 'Se está enfriando', tono: 'medio' },
		{ desde: 25, nombre: 'Hay ruido', tono: 'mal' },
		{ desde: 0, nombre: 'Está rota', tono: 'mal' }
	];

	const como = $derived(estados.find((e) => valor >= e.desde) ?? estados[estados.length - 1]);

	/** Qué le pasa a cada uno si esto se sigue cayendo. */
	const consecuencia = $derived(
		valor >= 65
			? rol === 'futbolista'
				? 'Le vas a creer cuando te diga que te conviene un pase.'
				: 'Te va a escuchar cuando le lleves una oferta.'
			: valor >= 45
				? 'Se enfría cinco puntos por temporada si nadie la trabaja.'
				: rol === 'futbolista'
					? 'A esta altura, firmarle un contrato largo es atarte a alguien en quien no confiás.'
					: 'Con esto no vas a poder pedir un buen contrato, y al final te resta puntaje.'
	);
</script>

<div class="tarjeta destacada" data-tema="relacion">
	<h3>La relación</h3>
	<div class="fila">
		<span class="valor {como.tono}">{valor}</span>
		<div class="texto">
			<strong>{como.nombre}</strong>
			<span class="barra">
				<span class="relleno {como.tono}" style="width:{valor}%"></span>
			</span>
		</div>
	</div>
	<p class="sutil" style="margin:.7rem 0 0">{consecuencia}</p>
</div>

<style>
	.fila {
		display: flex;
		align-items: center;
		gap: 0.9rem;
	}
	.valor {
		font-size: 2.6rem;
		font-weight: 800;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		flex: none;
	}
	.texto {
		flex: 1;
		min-width: 0;
	}
	.texto strong {
		display: block;
		font-size: 1rem;
		margin-bottom: 0.4rem;
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
	.valor.bien {
		color: var(--acento);
	}
	.valor.medio {
		color: var(--espera);
	}
	.valor.mal {
		color: var(--malo);
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
</style>
