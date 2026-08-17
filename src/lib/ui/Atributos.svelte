<script lang="ts">
	import { ATRIBUTOS, NOMBRE_ATRIBUTO, atributosQueUsa } from '$lib/engine/puestos';
	import type { Atributos, Posicion } from '$lib/engine/tipos';

	/**
	 * Los ocho atributos, con barra.
	 *
	 * Hasta acá el futbolista solo veía su media, que es un promedio y no dice
	 * nada de qué sabe hacer. Ver los ocho es lo que convierte la pretemporada en
	 * una decisión: se elige qué entrenar mirando qué falta.
	 *
	 * Se pueden marcar algunos para destacarlos: es lo que hace la pantalla de
	 * pretemporada con los que el plan elegido va a subir.
	 *
	 * Con `posicion` se muestran solo los que ese puesto usa. Un arquero tenía
	 * "Definición 59" y un central "Regate 41": números que no hacen nada en su
	 * carrera compitiendo por la atención con los cinco que sí deciden todo.
	 */
	let {
		atributos,
		destacados = [],
		posicion = null
	}: {
		atributos: Atributos;
		destacados?: (keyof Atributos)[];
		posicion?: Posicion | null;
	} = $props();

	const cuales = $derived(posicion ? atributosQueUsa(posicion) : ATRIBUTOS);

	function tono(valor: number): string {
		if (valor >= 70) return 'bien';
		if (valor >= 45) return 'medio';
		return 'mal';
	}
</script>

<div class="lista">
	{#each cuales as atributo (atributo)}
		{@const valor = atributos[atributo]}
		<div class="rasgo" class:destacado={destacados.includes(atributo)}>
			<span class="nombre">{NOMBRE_ATRIBUTO[atributo]}</span>
			<span class="barra">
				<span class="relleno {tono(valor)}" style="width:{valor}%"></span>
			</span>
			<span class="valor">{valor}</span>
		</div>
	{/each}
</div>

<style>
	.lista {
		display: grid;
		gap: 0.4rem;
	}
	.rasgo {
		display: grid;
		grid-template-columns: 5.5rem 1fr 1.8rem;
		align-items: center;
		gap: 0.6rem;
		padding: 0.15rem 0.35rem;
		border-radius: 6px;
	}
	.rasgo.destacado {
		background: rgba(74, 222, 128, 0.12);
	}
	.nombre {
		font-size: 0.82rem;
		color: var(--tenue);
	}
	.rasgo.destacado .nombre {
		color: var(--acento);
		font-weight: 600;
	}
	.barra {
		display: block;
		height: 6px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
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
	.valor {
		font-size: 0.85rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
</style>
