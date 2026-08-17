<script lang="ts">
	import { club } from '../../../content/mundo';
	import Escudo from './Escudo.svelte';

	/**
	 * Lo que pasó en el mundo mientras se jugaba la temporada.
	 *
	 * Harry Kane se retira, Vinícius pasa del Madrid al City, Simeone deja el
	 * Atlético. Todo esto ya se calculaba y se escribía en el diario, pero como
	 * cuatro líneas grises al pie de la pantalla más larga del juego: nadie las
	 * leía nunca. El mundo se movía sin que se notara, que es lo mismo que no
	 * moverse.
	 *
	 * Acá llegan como llega una novedad: al frente, una sola vez, con los escudos
	 * de los dos clubes. Es lo que hace que el mundo se sienta un lugar y no una
	 * tabla.
	 *
	 * Es un `<dialog>` nativo. Sin JavaScript no se abre, y está bien: las mismas
	 * novedades siguen estando en el diario, que es donde vive el archivo. Lo que
	 * se pierde sin JS es el énfasis, no la información.
	 */
	type Novedad = {
		tipo: string;
		nombre: string;
		desde: string | null;
		hacia: string | null;
		texto: string;
	};

	let {
		novedades,
		/** Para acordarse de que ya se vieron las de esta temporada. */
		clave
	}: { novedades: Novedad[]; clave: string } = $props();

	let dialogo = $state<HTMLDialogElement | null>(null);

	/**
	 * Se abre una sola vez por temporada y por navegador.
	 *
	 * La marca va en `localStorage` y no en el estado de la partida a propósito:
	 * es de quien está mirando, no de la partida. Los dos jugadores tienen que
	 * poder verlas cada uno cuando entra, y el que entra tres veces el mismo día
	 * no tiene por qué verlas tres veces.
	 */
	const yaLasVi = () => {
		try {
			return localStorage.getItem(`copolero-novedades-${clave}`) === 'si';
		} catch {
			return true;
		}
	};
	const anotarQueLasVi = () => {
		try {
			localStorage.setItem(`copolero-novedades-${clave}`, 'si');
		} catch {
			// Modo incógnito con el almacenamiento bloqueado: se muestran de nuevo,
			// que es mejor que romper la pantalla.
		}
	};

	$effect(() => {
		if (!dialogo || novedades.length === 0 || yaLasVi()) return;
		dialogo.showModal();
	});

	function cerrar() {
		anotarQueLasVi();
		dialogo?.close();
	}

	function abrir() {
		dialogo?.showModal();
	}
</script>

{#if novedades.length > 0}
	<!-- La forma de volver a verlas, para el que las cerró de apuro. -->
	<button type="button" class="reabrir" onclick={abrir}>
		<span class="punto"></span>
		Novedades del mundo
		<span class="cuantas">{novedades.length}</span>
	</button>

	<dialog
		bind:this={dialogo}
		onclose={anotarQueLasVi}
		onclick={(e) => e.target === dialogo && cerrar()}
	>
		<div class="caja">
			<header>
				<span class="rotulo">Mientras tanto, en el mundo</span>
				<h2>Se movió el mercado</h2>
			</header>

			<ul>
				{#each novedades as n (n.nombre + n.tipo)}
					<li class:retiro={n.tipo === 'retiro'}>
						<span class="escudos">
							{#if n.desde}<Escudo clubId={n.desde} tamano={30} />{/if}
							{#if n.tipo !== 'retiro' && n.hacia}
								<span class="flecha" aria-hidden="true">→</span>
								<Escudo clubId={n.hacia} tamano={30} />
							{/if}
						</span>
						<span class="quien">
							<b>{n.nombre}</b>
							<i>
								{#if n.tipo === 'retiro'}
									{n.desde ? `Se retira en ${club(n.desde).nombre}` : 'Se retira'}
								{:else if n.desde && n.hacia}
									{club(n.desde).nombre} → {club(n.hacia).nombre}
								{:else}
									{n.texto}
								{/if}
							</i>
						</span>
					</li>
				{/each}
			</ul>

			<button type="button" onclick={cerrar}>Seguir</button>
		</div>
	</dialog>
{/if}

<style>
	/* El botón para volver a abrirlas: chico, arriba, con un punto que llama. */
	.reabrir {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: auto;
		margin: 0 0 1rem;
		padding: 0.55rem 0.9rem;
		background: var(--tarjeta-alta);
		border: 1px solid var(--borde);
		border-radius: 999px;
		color: var(--texto);
		font-size: 0.84rem;
		font-weight: 600;
	}
	.reabrir:hover {
		filter: none;
		border-color: var(--mercado);
	}
	.punto {
		width: 7px;
		height: 7px;
		border-radius: 999px;
		background: var(--mercado);
		flex: none;
	}
	.cuantas {
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		color: var(--tenue);
		border: 1px solid var(--borde);
		border-radius: 999px;
		padding: 0 0.45rem;
	}

	dialog {
		border: 0;
		padding: 0;
		background: transparent;
		max-width: 30rem;
		width: calc(100% - 2rem);
	}
	dialog::backdrop {
		background: rgba(5, 8, 12, 0.72);
		backdrop-filter: blur(3px);
	}

	.caja {
		background: var(--tarjeta);
		border: 1px solid var(--borde);
		border-left: 3px solid var(--mercado);
		border-radius: var(--radio);
		padding: 1.2rem 1.3rem 1.3rem;
		color: var(--texto);
	}
	header {
		margin-bottom: 1rem;
	}
	.rotulo {
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--mercado);
	}
	.caja h2 {
		display: block;
		margin: 0.2rem 0 0;
		font-size: 1.35rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		text-transform: none;
		color: var(--texto);
	}
	.caja h2::after {
		content: none;
	}

	ul {
		list-style: none;
		margin: 0 0 1.2rem;
		padding: 0;
		display: grid;
		gap: 0.7rem;
	}
	li {
		display: flex;
		align-items: center;
		gap: 0.8rem;
	}
	.escudos {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex: none;
	}
	.flecha {
		color: var(--mercado);
		font-weight: 800;
	}
	.quien {
		min-width: 0;
	}
	.quien b {
		display: block;
		font-size: 0.95rem;
		line-height: 1.2;
	}
	.quien i {
		font-style: normal;
		font-size: 0.8rem;
		color: var(--tenue);
	}
	li.retiro .quien i {
		color: var(--espera);
	}
</style>
