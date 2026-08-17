<script lang="ts">
	import { contexto } from '../../../content/mundo';
	import { QUEDARSE } from '$lib/engine/pases';
	import type { OpcionesDeFase } from '$lib/engine/pantalla';
	import type { Estado, Rol } from '$lib/engine/tipos';
	import Escudo from './Escudo.svelte';
	import Reloj from './Reloj.svelte';

	/**
	 * El mercado, que tiene dos tiempos y cada uno es de uno.
	 *
	 * Primero el representante: le llegan seis clubes y deja pasar hasta tres.
	 * De cada uno ve la chance de que la operación prospere —un reloj, para
	 * poder compararlos de un vistazo— y ésa es toda su decisión del año.
	 *
	 * Después el futbolista, que hasta ahí esperó sin poder tocar nada. Ve lo
	 * que sobrevivió y elige uno. De su lado no hay probabilidades: ya no se
	 * apuesta nada, se elige. Escudo, sueldo, pase y años.
	 *
	 * Y en el medio, el que espera ve que está esperando. Es la pantalla más
	 * incómoda del juego y es a propósito: es la que hace que el trabajo del
	 * otro se sienta. Ver `cartas.ts`.
	 */
	let {
		opciones,
		estado,
		rol,
		filtradas = $bindable([]),
		destino = $bindable(QUEDARSE)
	}: {
		opciones: OpcionesDeFase;
		estado: Estado;
		rol: Rol;
		/** Representante: las que deja pasar. */
		filtradas?: string[];
		/** Futbolista: a dónde va. */
		destino?: string;
	} = $props();

	const mercado = $derived(opciones.mercado);
	const clubActual = $derived(contexto(estado.futbolista.contrato.clubId).club.nombre);
	const cuantasPuede = $derived(opciones.cuantasDejaPasar ?? 3);
	const leQuedan = $derived(cuantasPuede - filtradas.length);

	function plata(usd: number): string {
		return `USD ${usd.toLocaleString('es-AR')}`;
	}

	function comoJuega(brecha: number): string {
		if (brecha >= 10) return 'Sos la figura';
		if (brecha >= 2) return 'Titular';
		if (brecha >= -5) return 'Peleás el puesto';
		return 'Te sentás en el banco';
	}

	/**
	 * Marcar y desmarcar, con el tope adentro.
	 *
	 * El tope se controla acá y no con `disabled` en los casilleros: un casillero
	 * deshabilitado no se puede desmarcar tampoco, así que al llegar a tres se
	 * congelaba la elección entera y había que recargar para cambiar una.
	 */
	function tocar(clubId: string) {
		if (filtradas.includes(clubId)) {
			filtradas = filtradas.filter((c) => c !== clubId);
		} else if (filtradas.length < cuantasPuede) {
			filtradas = [...filtradas, clubId];
		}
	}
</script>

{#if mercado}
	<section class="mercado" data-paso={mercado.paso}>
		<!-- ---------- El representante filtra ---------- -->
		{#if opciones.cartas}
			<header class="cabeza">
				<span class="rotulo">Tu trabajo del año</span>
				<h3>Qué llamados devolvés</h3>
				<p>
					Llegaron <b>{opciones.cartas.length} clubes</b> preguntando por
					{estado.futbolista.nombre}. Podés mover
					<b>{cuantasPuede}</b>. El reloj dice qué chance hay de que esa operación prospere: sale de
					cruzar lo que pesa el club contra lo que valen ustedes dos juntos
					{#if opciones.loQueValenJuntos}(hoy, <b>{opciones.loQueValenJuntos}</b>){/if}.
				</p>
				<p class="aviso">
					Las que prosperen son las únicas que él va a poder elegir. Las que no, no existieron.
				</p>
			</header>

			<div class="cartas">
				{#each opciones.cartas as carta (carta.clubId)}
					{@const c = contexto(carta.clubId)}
					{@const elegida = filtradas.includes(carta.clubId)}
					{@const lleno = !elegida && leQuedan <= 0}
					<label class="carta" class:elegida class:lleno>
						<input
							type="checkbox"
							name="filtradas"
							value={carta.clubId}
							checked={elegida}
							onchange={() => tocar(carta.clubId)}
						/>
						<span class="quien">
							<Escudo clubId={carta.clubId} tamano={34} />
							<span class="nombre">
								<b>{c.club.nombre}</b>
								<i>{c.liga.nombre} · {c.pais.nombre}</i>
							</span>
						</span>

						<Reloj probabilidad={carta.probabilidad} tamano={78} apagado={lleno} />

						<span class="numeros">
							<span><b>{plata(carta.salarioMensual)}</b> por mes</span>
							<span>{carta.temporadas} temporadas</span>
							{#if carta.montoUsd > 0}
								<span>Pase: {plata(carta.montoUsd)}</span>
							{:else}
								<span>Llega libre, sin pase</span>
							{/if}
							<span class="mio">Tu comisión: {plata(carta.comisionUsd)}</span>
							<span>{comoJuega(carta.brecha)}</span>
						</span>

						<span class="marca">{elegida ? 'La movés' : lleno ? '—' : 'Moverla'}</span>
					</label>
				{/each}
			</div>

			<p class="cuenta" class:completo={leQuedan === 0}>
				{#if filtradas.length === 0}
					No elegiste ninguna todavía. Si cerrás así, no le llega nada.
				{:else if leQuedan > 0}
					Movés {filtradas.length} de {cuantasPuede}. Te {leQuedan === 1 ? 'queda' : 'quedan'}
					{leQuedan}.
				{:else}
					Las {cuantasPuede} elegidas. Ahora se juega cada una por su cuenta.
				{/if}
			</p>

			<!-- Sin JavaScript, los casilleros de arriba viajan igual: son `name`
			     de verdad y no un espejo. Esto es solo para que el orden sea el
			     que se marcó, que es el que se muestra. -->

			<!-- ---------- El futbolista espera ---------- -->
		{:else if !mercado.meToca && mercado.paso === 'filtro'}
			<header class="cabeza esperando">
				<span class="rotulo">Mercado</span>
				<h3>Tu representante está atendiendo el teléfono</h3>
				<p>
					Hay clubes preguntando por vos y él está decidiendo a cuáles les devuelve el llamado. No
					vas a poder elegir entre todos: vas a elegir entre los que él consiga.
				</p>
				<p class="aviso">Cuando termine, te llega acá. La pantalla se actualiza sola.</p>
			</header>

			<!-- ---------- El futbolista elige ---------- -->
		{:else if opciones.ofertas}
			<header class="cabeza">
				<span class="rotulo">Mercado</span>
				<h3>Dónde seguís</h3>
				<p>
					{#if opciones.ofertas.length === 0}
						Tu representante se movió y no cerró ninguna. Este año no hay a dónde ir.
					{:else}
						Tu representante te consiguió
						<b>{opciones.ofertas.length} {opciones.ofertas.length === 1 ? 'oferta' : 'ofertas'}</b>.
						Elegís vos, y elegís solo.
					{/if}
					Hoy valés <b>{plata(opciones.valorDeMercadoUsd ?? 0)}</b>.
				</p>
			</header>

			<div class="destinos">
				<label class="destino" class:elegido={destino === QUEDARSE}>
					<input type="radio" name="destino" value={QUEDARSE} bind:group={destino} />
					<span class="quien">
						<Escudo clubId={estado.futbolista.contrato.clubId} tamano={34} />
						<span class="nombre">
							<b>Quedarte</b>
							<i>
								Seguís en {clubActual}, por {estado.futbolista.contrato.temporadasRestantes}
								{estado.futbolista.contrato.temporadasRestantes === 1 ? 'temporada' : 'temporadas'} más.
							</i>
						</span>
					</span>
				</label>

				{#each opciones.ofertas as oferta (oferta.clubId)}
					{@const c = contexto(oferta.clubId)}
					<label class="destino" class:elegido={destino === oferta.clubId}>
						<input type="radio" name="destino" value={oferta.clubId} bind:group={destino} />
						<span class="quien">
							<Escudo clubId={oferta.clubId} tamano={34} />
							<span class="nombre">
								<b>{c.club.nombre}</b>
								<i>{c.liga.nombre} · {c.pais.nombre}</i>
							</span>
						</span>
						<span class="numeros">
							<span><b>{plata(oferta.salarioMensual)}</b> por mes</span>
							<span>{oferta.temporadas} temporadas</span>
							{#if oferta.montoUsd > 0}
								<span>Pase: {plata(oferta.montoUsd)}</span>
							{:else}
								<span>Llegás libre, sin pase</span>
							{/if}
							{#if oferta.primaUsd > 0}
								<span class="mio">Prima al firmar: {plata(oferta.primaUsd)}</span>
							{/if}
							<span class="mio">{comoJuega(oferta.brecha)}</span>
							{#if oferta.tecnico}<span>Te dirige {oferta.tecnico}</span>{/if}
						</span>
					</label>
				{/each}
			</div>
		{/if}
	</section>
{/if}

<style>
	.mercado {
		margin: 0 0 1.1rem;
		background: var(--tarjeta);
		border: 1px solid var(--borde);
		border-left: 3px solid var(--espera);
		border-radius: var(--radio);
		overflow: hidden;
		container-type: inline-size;
	}

	.cabeza {
		padding: 1rem 1.1rem 0.9rem;
		border-bottom: 1px solid var(--borde);
		background: var(--tarjeta-alta);
	}
	.rotulo {
		display: block;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--espera);
	}
	h3 {
		margin: 0.2rem 0 0.4rem;
		font-size: 1.15rem;
		line-height: 1.2;
		text-transform: none;
		color: var(--texto);
		border: none;
		padding: 0;
	}
	.cabeza p {
		margin: 0;
		font-size: 0.88rem;
		line-height: 1.45;
		color: var(--tenue);
	}
	.aviso {
		margin-top: 0.5rem !important;
		font-size: 0.8rem !important;
		color: var(--espera) !important;
	}

	/* La espera. Es la única pantalla del juego donde no hay nada que tocar. */
	.cabeza.esperando {
		border-bottom: none;
		border-left: 0;
	}

	/* ---------- Las cartas del representante ---------- */
	.cartas,
	.destinos {
		display: grid;
		gap: 0.6rem;
		padding: 0.9rem 1rem 0.4rem;
	}
	@container (min-width: 34rem) {
		.cartas {
			grid-template-columns: 1fr 1fr;
		}
	}

	.carta,
	.destino {
		position: relative;
		display: grid;
		gap: 0.5rem 0.8rem;
		align-items: center;
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--borde);
		border-radius: 12px;
		background: var(--tarjeta-alta);
		cursor: pointer;
	}
	.carta {
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas: 'quien reloj' 'numeros reloj' 'marca reloj';
	}
	.carta .quien {
		grid-area: quien;
	}
	.carta .numeros {
		grid-area: numeros;
	}
	.carta .marca {
		grid-area: marca;
	}
	.carta :global(svg.reloj) {
		grid-area: reloj;
	}

	.carta.elegida,
	.destino.elegido {
		border-color: var(--acento);
		background: rgba(74, 222, 128, 0.08);
	}
	/* Ya movió las tres: ésta se puede mirar, pero no sumar. */
	.carta.lleno {
		opacity: 0.5;
	}

	.carta input,
	.destino input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		opacity: 0;
		cursor: inherit;
	}
	.carta:has(input:focus-visible),
	.destino:has(input:focus-visible) {
		outline: 2px solid var(--acento);
		outline-offset: 2px;
	}

	.quien {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
	}
	.nombre {
		min-width: 0;
		line-height: 1.25;
	}
	.nombre b {
		display: block;
		font-size: 0.98rem;
	}
	.nombre i {
		font-style: normal;
		font-size: 0.76rem;
		color: var(--tenue);
	}

	.numeros {
		display: flex;
		flex-wrap: wrap;
		gap: 0.2rem 0.7rem;
		font-size: 0.8rem;
		color: var(--tenue);
	}
	.numeros b {
		color: var(--texto);
	}
	.numeros .mio {
		color: var(--acento);
	}

	.marca {
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--tenue);
	}
	.carta.elegida .marca {
		color: var(--acento);
	}

	.cuenta {
		margin: 0;
		padding: 0.6rem 1rem 1rem;
		font-size: 0.82rem;
		color: var(--tenue);
	}
	.cuenta.completo {
		color: var(--acento);
		font-weight: 700;
	}
</style>
