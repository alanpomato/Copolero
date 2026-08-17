<script lang="ts">
	import { enhance } from '$app/forms';
	import { EDAD_INICIAL_POR_DEFECTO } from '$lib/engine/estado';
	import {
		ATRIBUTOS,
		NOMBRE_ATRIBUTO,
		PIES,
		PUESTOS,
		PUESTO_POR_DEFECTO,
		PUNTOS_A_REPARTIR,
		TOPE_POR_ATRIBUTO,
		puesto as puestoPorId
	} from '$lib/engine/puestos';
	import type { Atributos } from '$lib/engine/tipos';
	import Bandera from '$lib/ui/Bandera.svelte';
	import ClubLinea from '$lib/ui/ClubLinea.svelte';
	import { CLUB_POR_DEFECTO, mundoPorPais, nacionalidades } from '$lib/ui/opciones';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	/**
	 * Armar un jugador de una.
	 *
	 * La pantalla de creación tiene ocho decisiones y ninguna se puede tomar bien
	 * sin haber jugado antes. El botón las resuelve todas de un toque, y después
	 * se cambia lo que uno quiera: es la diferencia entre empezar a jugar en diez
	 * segundos o abandonar en el formulario.
	 *
	 * Acá `Math.random` está bien: es la pantalla, no el motor. Lo que el motor
	 * decide sale siempre de la semilla de la partida.
	 */
	function alAzar() {
		const unoDe = <T,>(lista: readonly T[]): T => lista[Math.floor(Math.random() * lista.length)];

		nacionalidad = unoDe(paises);
		const pais = unoDe(mundo);
		paisElegido = pais.id;
		const liga = unoDe(pais.ligas);
		ligaElegida = liga.id;
		clubElegido = unoDe(liga.clubes).id;

		const p = unoDe(PUESTOS);
		puestoElegido = p.id;
		numeroTocado = false;
		numero = p.numero;
		pie = unoDe(PIES).id;
	}

	const mundo = mundoPorPais();
	const paises = nacionalidades();

	// Tres pasos en vez de un desplegable con 268 clubes: país, división y club.
	// Es como se piensa, y en el celular es la diferencia entre elegir y buscar.
	let paisElegido = $state('ar');
	const ligasDelPais = $derived(mundo.find((p) => p.id === paisElegido)?.ligas ?? []);

	let ligaElegida = $state('ar-2');
	const laLiga = $derived(
		ligasDelPais.find((l) => l.id === ligaElegida) ?? ligasDelPais[ligasDelPais.length - 1]
	);

	// Cambiar de país cambia la división, y cambiar de división cambia el club:
	// si no, quedaría elegido algo que ya no está en la lista.
	$effect(() => {
		if (!ligasDelPais.some((l) => l.id === ligaElegida)) {
			ligaElegida = ligasDelPais[ligasDelPais.length - 1]?.id ?? '';
		}
	});
	$effect(() => {
		if (laLiga && !laLiga.clubes.some((c) => c.id === clubElegido)) {
			clubElegido = laLiga.clubes[0]?.id ?? '';
		}
	});

	const LINEAS: { etiqueta: string; posicion: string }[] = [
		{ etiqueta: 'Arco', posicion: 'arquero' },
		{ etiqueta: 'Defensa', posicion: 'defensor' },
		{ etiqueta: 'Mediocampo', posicion: 'mediocampista' },
		{ etiqueta: 'Ataque', posicion: 'delantero' }
	];

	// El escudo de abajo del select cambia con lo que se elige: se ve adónde va
	// a arrancar la carrera antes de crear nada.
	let clubElegido = $state(CLUB_POR_DEFECTO);

	let nacionalidad = $state('Argentina');
	let puestoElegido = $state(PUESTO_POR_DEFECTO);
	let pie = $state('derecho');
	let numero = $state(puestoPorId(PUESTO_POR_DEFECTO).numero);
	let numeroTocado = $state(false);

	const elPuesto = $derived(puestoPorId(puestoElegido));

	// Cambiar de puesto trae su número clásico, salvo que ya lo hayan elegido a
	// mano: el que quiere el 10 de lateral tiene derecho a llevárselo.
	$effect(() => {
		const sugerido = puestoPorId(puestoElegido).numero;
		if (!numeroTocado) numero = sugerido;
	});

	// --- El reparto de puntos ------------------------------------------------
	let reparto = $state<Record<string, number>>(Object.fromEntries(ATRIBUTOS.map((a) => [a, 0])));

	const gastados = $derived(Object.values(reparto).reduce((a, b) => a + b, 0));
	const quedan = $derived(PUNTOS_A_REPARTIR - gastados);

	function mover(atributo: keyof Atributos, delta: number) {
		const ahora = reparto[atributo] ?? 0;
		const nuevo = ahora + delta;
		if (nuevo < 0 || nuevo > TOPE_POR_ATRIBUTO) return;
		if (delta > 0 && quedan <= 0) return;
		reparto = { ...reparto, [atributo]: nuevo };
	}

	/** Los atributos que el puesto ya empuja solo, para no repartir al pedo. */
	const propiosDelPuesto = $derived(Object.keys(elPuesto.sesgo));
</script>

<svelte:head>
	<title>Copolero</title>
</svelte:head>

<div class="angosta crear">
	<h1>Copolero</h1>
	<p class="bajada">
		Una carrera de futbolista para dos. Uno juega al futbolista, el otro a su representante. Por
		turnos: cada uno entra cuando puede.
	</p>

	{#if form?.problemas}
		<div class="error">
			{#each form.problemas as problema (problema)}
				<div>{problema}</div>
			{/each}
		</div>
	{/if}

	<form method="POST" action="?/crear" use:enhance>
		<div class="tarjeta" data-tema="relacion">
			<h3>Los dos</h3>
			<div class="dosNombres">
				<label>
					<span class="titulo">El futbolista se llama</span>
					<input name="nombreFutbolista" maxlength="60" required placeholder="Damián Correa" />
				</label>
				<label>
					<span class="titulo">Y su representante</span>
					<input name="nombreRepresentante" maxlength="60" required placeholder="Rubén Bravo" />
				</label>
			</div>
			<label>
				<span class="titulo">¿A cuál de los dos jugás vos?</span>
				<select name="rol" required>
					<option value="futbolista">Al futbolista</option>
					<option value="representante">Al representante</option>
				</select>
			</label>
			<p class="sutil" style="margin:0">
				El otro le queda a quien entre con el código, con el nombre que pusiste acá.
			</p>
		</div>

		<div class="tarjeta">
			<div class="cabezaConBoton">
				<h3 style="margin:0; border:none; padding:0">El futbolista</h3>
				<button type="button" class="azar" onclick={alAzar}>🎲 Al azar</button>
			</div>
			<label>
				<span class="titulo">Nacionalidad</span>
				<select name="nacionalidad" bind:value={nacionalidad}>
					{#each paises as pais (pais)}
						<option value={pais}>{pais}</option>
					{/each}
				</select>
			</label>
			<span class="titulo" style="display:block; margin-bottom:.5rem">Puesto</span>
			{#each LINEAS as linea (linea.posicion)}
				<p class="linea">{linea.etiqueta}</p>
				<div class="puestos">
					{#each PUESTOS.filter((p) => p.posicion === linea.posicion) as p (p.id)}
						<label class="puesto" class:elegido={puestoElegido === p.id}>
							<input type="radio" name="puesto" value={p.id} bind:group={puestoElegido} required />
							<span class="dorsal">{p.numero}</span>
							<span class="comoSeLlama">{p.nombre}</span>
							<span class="quees">{p.detalle}</span>
						</label>
					{/each}
				</div>
			{/each}

			<div class="fila">
				<label>
					<span class="titulo">Número</span>
					<input
						name="numero"
						type="number"
						min="1"
						max="99"
						bind:value={numero}
						oninput={() => (numeroTocado = true)}
						required
					/>
				</label>
				<label>
					<span class="titulo">Pie</span>
					<select name="pie" bind:value={pie} required>
						{#each PIES as p (p.id)}
							<option value={p.id}>{p.nombre}</option>
						{/each}
					</select>
				</label>
			</div>
			<p class="sutil" style="margin:-.7rem 0 1rem">
				{PIES.find((p) => p.id === pie)?.detalle}
				{#if elPuesto.deBanda}
					Es un puesto de banda: los zurdos rinden un poco más.
				{/if}
			</p>
			<div class="fila">
				<label>
					<span class="titulo">País</span>
					<select name="paisDelClub" bind:value={paisElegido}>
						{#each mundo as p (p.id)}
							<option value={p.id}>{p.nombre}</option>
						{/each}
					</select>
				</label>
				<label>
					<span class="titulo">División</span>
					<select name="divisionDelClub" bind:value={ligaElegida}>
						{#each ligasDelPais as l (l.id)}
							<option value={l.id}>{l.nombre}</option>
						{/each}
					</select>
				</label>
			</div>

			<label>
				<span class="titulo">Club donde arranca</span>
				<select name="clubId" bind:value={clubElegido} required>
					{#each laLiga?.clubes ?? [] as club (club.id)}
						<option value={club.id}>{club.nombre}</option>
					{/each}
				</select>
			</label>

			<div class="vistazo">
				<ClubLinea clubId={clubElegido} tamano={40} />
			</div>
			<p class="sutil" style="margin:-.4rem 0 1rem">
				Cuanto más abajo arranques, más carrera hay para hacer. El Ascenso argentino es el escalón
				más bajo del mundo.
			</p>
			<div class="reparto">
				<div class="reparto-cabecera">
					<span class="titulo" style="margin:0">Cómo es el pibe</span>
					<span class="quedan" class:vacio={quedan === 0}>
						{quedan === 0 ? 'Todo repartido' : `Quedan ${quedan}`}
					</span>
				</div>
				<p class="sutil" style="margin:.15rem 0 .9rem">
					Repartí los puntos en lo que quieras que sepa hacer. Es poco a propósito: inclina al pibe,
					no lo fabrica. Lo que define la carrera es el potencial, que nadie ve.
				</p>

				<div class="rasgos">
					{#each ATRIBUTOS as atributo (atributo)}
						<div class="rasgo">
							<span class="rasgo-nombre">
								{NOMBRE_ATRIBUTO[atributo]}
								{#if propiosDelPuesto.includes(atributo)}
									<span class="propio" title="El puesto ya te da esto">del puesto</span>
								{/if}
							</span>
							<span class="mando">
								<button
									type="button"
									class="paso"
									onclick={() => mover(atributo, -1)}
									disabled={reparto[atributo] === 0}
									aria-label={`Sacar un punto de ${NOMBRE_ATRIBUTO[atributo]}`}>−</button
								>
								<span class="puntos" class:puestos={reparto[atributo] > 0}
									>+{reparto[atributo]}</span
								>
								<button
									type="button"
									class="paso"
									onclick={() => mover(atributo, 1)}
									disabled={quedan === 0 || reparto[atributo] === TOPE_POR_ATRIBUTO}
									aria-label={`Sumar un punto a ${NOMBRE_ATRIBUTO[atributo]}`}>+</button
								>
							</span>
							<input type="hidden" name={`reparto-${atributo}`} value={reparto[atributo]} />
						</div>
					{/each}
				</div>
			</div>

			<label>
				<span class="titulo">Edad inicial</span>
				<input
					name="edadInicial"
					type="number"
					min="15"
					max="22"
					value={EDAD_INICIAL_POR_DEFECTO}
					required
				/>
			</label>
		</div>

		<button type="submit">Crear la partida</button>
	</form>

	<h2>¿Te pasaron un código?</h2>
	{#if form?.problemaCodigo}
		<div class="error">{form.problemaCodigo}</div>
	{/if}
	<form method="POST" action="?/entrar" use:enhance>
		<label>
			<span class="titulo">Código de la partida</span>
			<input
				name="codigo"
				maxlength="12"
				required
				placeholder="ABC234"
				autocapitalize="characters"
				style="text-transform: uppercase; letter-spacing: .2em;"
			/>
		</label>
		<button type="submit" class="secundario">Entrar</button>
	</form>

	<h2>El mundo</h2>
	<div class="tarjeta">
		<p class="sutil" style="margin:0 0 .85rem">
			{mundo.reduce((n, p) => n + p.ligas.reduce((m, l) => m + l.clubes.length, 0), 0)} clubes en
			{mundo.reduce((n, p) => n + p.ligas.length, 0)} ligas de {mundo.length} países, con los técnicos
			y los jugadores de verdad. Se mueven solos: cada temporada hay mercado de pases y hay quien se retira.
		</p>
		<div class="banderas">
			{#each mundo as p (p.id)}
				<Bandera pais={p.id} alto={16} />
			{/each}
		</div>
	</div>
</div>

<style>
	.cabezaConBoton {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.9rem;
	}
	.azar {
		flex: none;
		width: auto;
		margin: 0;
		padding: 0.35rem 0.75rem;
		font-size: 0.8rem;
		font-weight: 700;
		background: transparent;
		color: var(--acento);
		border: 1px solid var(--acento-oscuro);
		border-radius: 999px;
		cursor: pointer;
	}
	.azar:hover {
		background: rgba(74, 222, 128, 0.1);
	}

	/*
	 * Las tarjetas de puesto.
	 *
	 * El número grande es lo que hace que se reconozca sin leer: en una cancha
	 * nadie dice "mediocampista ofensivo", dice "el 10". Van agrupadas por línea
	 * porque son once y en una sola lista no se encuentra nada.
	 */
	.linea {
		margin: 0.9rem 0 0.4rem;
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--tenue);
	}
	/*
	 * La pantalla de creación es más ancha que las otras de una columna: tiene
	 * los once puestos y los ocho atributos, y en 34rem eso son tres pantallas y
	 * media de scroll en un monitor con novecientos píxeles de aire al costado.
	 */
	.crear {
		max-width: 48rem;
	}

	/* Los dos nombres, uno al lado del otro cuando entra. */
	.dosNombres {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 0 1rem;
	}

	.puestos {
		display: grid;
		/*
		 * Los once puestos. En el celular entran de a dos; en monitor, de a tres o
		 * cuatro según el ancho. Once tarjetas en dos columnas son seis filas de
		 * scroll para una decisión que se toma comparando: hay que poder verlas
		 * juntas.
		 */
		grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
		gap: 0.5rem;
	}
	.puesto {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		margin: 0;
		padding: 0.65rem 0.5rem 0.7rem;
		background: var(--tarjeta-alta);
		border: 1px solid var(--borde);
		border-radius: 10px;
		cursor: pointer;
		text-align: center;
		transition:
			border-color 0.12s,
			background 0.12s;
	}
	.puesto input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}
	.puesto.elegido {
		border-color: var(--plata);
		background: linear-gradient(180deg, rgba(224, 184, 58, 0.12), rgba(224, 184, 58, 0.03));
	}
	.puesto .dorsal {
		font-size: 1.9rem;
		font-weight: 800;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		color: var(--tenue);
	}
	.puesto.elegido .dorsal {
		color: var(--plata);
	}
	.puesto .comoSeLlama {
		font-size: 0.78rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		line-height: 1.15;
	}
	.puesto .quees {
		font-size: 0.68rem;
		color: var(--tenue);
		line-height: 1.25;
	}

	.vistazo {
		background: var(--tarjeta-alta);
		border-radius: 10px;
		padding: 0.7rem 0.85rem;
		margin: -0.4rem 0 0.6rem;
	}
	.banderas {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.fila {
		display: grid;
		grid-template-columns: 1fr 1.4fr;
		gap: 0.75rem;
	}
	.reparto {
		background: var(--tarjeta-alta);
		border-radius: 12px;
		padding: 0.9rem 1rem;
		margin-bottom: 1rem;
	}
	/* Los ocho atributos, de a dos cuando hay lugar. */
	.reparto .rasgos {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
		gap: 0 1.4rem;
	}
	.reparto-cabecera {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.quedan {
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: var(--acento);
	}
	.quedan.vacio {
		color: var(--tenue);
	}
	.rasgo {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.35rem 0;
	}
	.rasgo-nombre {
		font-size: 0.95rem;
	}
	.propio {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--tenue);
		border: 1px solid var(--borde);
		border-radius: 999px;
		padding: 0.05rem 0.4rem;
		margin-left: 0.3rem;
		white-space: nowrap;
	}
	.mando {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: none;
	}
	.paso {
		width: 2.1rem;
		height: 2.1rem;
		padding: 0;
		border-radius: 8px;
		background: var(--fondo);
		color: var(--texto);
		border: 1px solid var(--borde);
		font-size: 1.2rem;
		font-weight: 700;
		line-height: 1;
	}
	.paso:disabled {
		opacity: 0.35;
		background: var(--fondo);
	}
	.puntos {
		min-width: 2rem;
		text-align: center;
		font-variant-numeric: tabular-nums;
		font-weight: 800;
		color: var(--tenue);
	}
	.puntos.puestos {
		color: var(--acento);
	}
</style>
