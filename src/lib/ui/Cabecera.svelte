<script lang="ts">
	import { media } from '$lib/engine/estado';
	import { puesto as puestoPorId } from '$lib/engine/puestos';
	import { NOMBRE_FASE, type Estado, type Rol } from '$lib/engine/tipos';
	import { contexto } from '../../../content/mundo';
	import Bandera from './Bandera.svelte';
	import Escudo from './Escudo.svelte';

	/**
	 * La tarjeta del jugador, pegada arriba.
	 *
	 * Se queda fija mientras se scrollea. En El Ídolo pasaba que bajabas a elegir
	 * y dejabas de ver a tu jugador, y terminabas decidiendo a ciegas: subir a
	 * mirar la media, bajar a elegir, volver a subir. Acá los números que hacen
	 * falta para decidir están siempre a la vista.
	 *
	 * Por eso es angosta: dos líneas en el celular. Una cabecera fija que ocupa
	 * media pantalla es peor que no tenerla.
	 */
	let { estado, rol }: { estado: Estado; rol: Rol } = $props();

	const f = $derived(estado.futbolista);
	const puesto = $derived(puestoPorId(f.puesto));
	const suMedia = $derived(media(f.atributos, f.posicion));
	const donde = $derived(contexto(f.contrato.clubId));

	/** Los cuatro números que uno mira antes de decidir cualquier cosa. */
	const cifras = $derived(
		rol === 'futbolista'
			? [
					{ etiqueta: 'Media', valor: suMedia, tono: tonoDe(suMedia) },
					{ etiqueta: 'Forma', valor: f.forma, tono: tonoDe(f.forma) },
					{ etiqueta: 'Moral', valor: f.moral, tono: tonoDe(f.moral) },
					{ etiqueta: 'Desgaste', valor: f.desgaste, tono: tonoDe(100 - f.desgaste) }
				]
			: [
					{ etiqueta: 'Media', valor: suMedia, tono: tonoDe(suMedia) },
					{ etiqueta: 'Prestigio', valor: estado.representante.prestigio, tono: '' },
					{ etiqueta: 'Confianza', valor: estado.confianza, tono: tonoDe(estado.confianza) },
					{ etiqueta: 'Desgaste', valor: f.desgaste, tono: tonoDe(100 - f.desgaste) }
				]
	);

	function tonoDe(valor: number): string {
		if (valor >= 70) return 'bien';
		if (valor >= 40) return 'medio';
		return 'mal';
	}
</script>

<div class="cabecera">
	<div class="fila">
		<Escudo clubId={f.contrato.clubId} tamano={38} />
		<div class="quien">
			<span class="nombre">
				<Bandera nacionalidad={f.nacionalidad} alto={12} />
				{f.nombre}
				<span class="dorsal">{f.numero}</span>
			</span>
			<span class="donde">
				{puesto.nombre} · {f.edad} años · {donde.club.nombre}
			</span>
		</div>
		<span class="fase">
			{#if estado.carreraTerminada}
				<span class="temporada">{estado.temporada - 1}</span>
				<span class="nombrefase">temporadas</span>
			{:else}
				<span class="temporada">T{estado.temporada}</span>
				<span class="nombrefase">{NOMBRE_FASE[estado.fase]}</span>
			{/if}
		</span>
	</div>

	<div class="cifras">
		{#each cifras as c (c.etiqueta)}
			<span class="cifra">
				<span class="etiqueta">{c.etiqueta}</span>
				<span class="valor {c.tono}">{c.valor}</span>
			</span>
		{/each}
	</div>
</div>

<style>
	.cabecera {
		position: sticky;
		top: 0;
		z-index: 20;
		margin: -1.5rem -1rem 1.25rem;
		padding: 0.7rem 1rem 0.6rem;
		background: rgba(13, 17, 23, 0.94);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--borde);
	}
	.fila {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.quien {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}
	.nombre {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-weight: 800;
		font-size: 1rem;
		line-height: 1.2;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.dorsal {
		font-size: 0.72rem;
		font-weight: 800;
		color: var(--tenue);
		border: 1px solid var(--borde);
		border-radius: 5px;
		padding: 0 0.3rem;
		flex: none;
	}
	.donde {
		font-size: 0.74rem;
		color: var(--tenue);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.fase {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		flex: none;
		line-height: 1.15;
	}
	.temporada {
		font-weight: 800;
		font-size: 0.95rem;
	}
	.nombrefase {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--tenue);
	}

	.cifras {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.4rem;
		margin-top: 0.55rem;
	}
	.cifra {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: var(--tarjeta);
		border-radius: 7px;
		padding: 0.25rem 0.2rem;
	}
	.cifra .etiqueta {
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--tenue);
	}
	.cifra .valor {
		font-size: 1.05rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
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
</style>
