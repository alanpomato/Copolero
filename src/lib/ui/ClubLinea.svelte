<script lang="ts">
	import { contexto } from '../../../content/mundo';
	import Bandera from './Bandera.svelte';
	import Escudo from './Escudo.svelte';

	/** Escudo + club + liga, la línea que identifica dónde está jugando. */
	let { clubId, tamano = 34 }: { clubId: string; tamano?: number } = $props();

	const info = $derived(contexto(clubId));
</script>

<div class="club">
	<Escudo {clubId} {tamano} />
	<div class="texto">
		<span class="nombre">{info.club.nombre}</span>
		<span class="liga">
			<Bandera pais={info.pais.id} alto={11} />
			{info.liga.nombre}
		</span>
	</div>
</div>

<style>
	.club {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
	}
	.texto {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}
	.nombre {
		font-weight: 700;
		line-height: 1.15;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.liga {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.78rem;
		color: var(--tenue, #8a8f98);
		white-space: nowrap;
	}
</style>
