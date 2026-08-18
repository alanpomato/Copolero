<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import {
		comoEstaLaAgenda,
		disponibilidadDe,
		loQueDejaLaCarteraAlAnio
	} from '$lib/engine/cartera';
	import { media } from '$lib/engine/estado';
	import { NOMBRE_FASE } from '$lib/engine/tipos';
	import { puesto as puestoPorId } from '$lib/engine/puestos';
	import AtributosLista from '$lib/ui/Atributos.svelte';
	import Cabecera from '$lib/ui/Cabecera.svelte';
	import ClubLinea from '$lib/ui/ClubLinea.svelte';
	import Decisiones from '$lib/ui/Decisiones.svelte';
	import Camiseta from '$lib/ui/Camiseta.svelte';
	import TarjetaJugador from '$lib/ui/TarjetaJugador.svelte';
	import Confianza from '$lib/ui/Confianza.svelte';
	import Alerta from '$lib/ui/Alerta.svelte';
	import Sueno from '$lib/ui/Sueno.svelte';
	import Bolsillo from '$lib/ui/Bolsillo.svelte';
	import LoQueTengo from '$lib/ui/LoQueTengo.svelte';
	import Novedades from '$lib/ui/Novedades.svelte';
	import Paso from '$lib/ui/Paso.svelte';
	import Mundial from '$lib/ui/Mundial.svelte';
	import Portada from '$lib/ui/Portada.svelte';
	import Trayectoria from '$lib/ui/Trayectoria.svelte';
	import Mapa from '$lib/ui/Mapa.svelte';
	import Avisos from '$lib/ui/Avisos.svelte';
	import Diario from '$lib/ui/Diario.svelte';
	import Retiro from '$lib/ui/Retiro.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const vista = $derived(data.vista);
	const estado = $derived(vista.estado);
	const futbolista = $derived(estado.futbolista);
	const puesto = $derived(puestoPorId(futbolista.puesto));
	const representante = $derived(estado.representante);

	const esperandoAlOtro = $derived(
		vista.yaCerre && vista.sincronizacion !== 'BOTH_READY' && vista.sincronizacion !== 'CAREER_OVER'
	);

	const linkDeInvitacion = $derived(
		page.url.origin ? `${page.url.origin}/unirse/${vista.codigo}` : `/unirse/${vista.codigo}`
	);

	/**
	 * La pantalla se refresca sola mientras la partida está viva.
	 *
	 * Antes se refrescaba solamente cuando uno ya había cerrado y esperaba al
	 * otro, y eso dejaba un agujero: si el otro usa "avanzar sin esperar", la
	 * fase avanza sin que vos hayas tocado nada y tu pantalla se queda mostrando
	 * la anterior para siempre. Alan lo vio así —el futbolista todavía eligiendo
	 * en una mesa que el representante ya tenía firmada en su diario— y no era la
	 * barrera fallando: era una pantalla vieja que nadie avisaba que era vieja.
	 *
	 * Mientras esperás al otro se mira seguido, porque ahí cada segundo cuenta.
	 * Mientras estás decidiendo se mira de vez en cuando: alcanza para no quedar
	 * clavado y no interrumpe a nadie a mitad de una elección.
	 */
	$effect(() => {
		if (vista.opciones.retiro) return;
		const cada = esperandoAlOtro || !vista.elOtro ? 5000 : 20000;
		const intervalo = setInterval(() => void invalidateAll(), cada);
		return () => clearInterval(intervalo);
	});

	/*
	 * Y si el servidor rechazó lo que mandamos porque la pantalla ya era vieja,
	 * la traemos al día en el acto en vez de esperar al próximo refresco: el que
	 * acaba de apretar un botón está mirando, y veinte segundos de una pantalla
	 * que el propio juego acaba de declarar vencida son veinte segundos de más.
	 *
	 * `ultimoAviso` es un `let` común y no `$state` a propósito: si fuera
	 * reactivo, escribirlo acá adentro volvería a disparar el efecto.
	 */
	let ultimoAviso: unknown = null;
	$effect(() => {
		if (!form?.pantallaVieja || form === ultimoAviso) return;
		ultimoAviso = form;
		void invalidateAll();
	});

	const MENSAJE_SINCRONIZACION: Record<string, string> = {
		WAITING_FOR_BOTH: 'Falta que decidan los dos',
		WAITING_FOR_PLAYER: 'Falta el futbolista',
		WAITING_FOR_AGENT: 'Falta el representante',
		BOTH_READY: 'Resolviendo',
		SEASON_COMPLETE: 'Temporada terminada',
		CAREER_OVER: 'Carrera terminada'
	};

	/**
	 * Cuántos momentos le quedan por jugar.
	 *
	 * Se cuenta contra lo que el servidor ya escribió —las tiradas— y no contra
	 * lo que la pantalla cree: una tirada es irreversible y vive en la base, así
	 * que es el único número que no puede mentir.
	 */
	const faltanMomentos = $derived(
		Math.max(
			0,
			(vista.opciones.ocasiones ?? vista.opciones.momentos ?? []).length - vista.tiradas.length
		)
	);

	function plata(usd: number): string {
		return `USD ${usd.toLocaleString('es-AR')}`;
	}
</script>

<svelte:head>
	<title>{futbolista.nombre} — Copolero</title>
</svelte:head>

{#if !vista.elOtro}
	<div class="angosta">
		<h1>Falta uno</h1>
		<p class="bajada">Pasale este código a la otra persona para que entre a la partida.</p>

		<div class="tarjeta">
			<h3>Código de la partida</h3>
			<span class="codigo">{vista.codigo}</span>
			<p class="sutil" style="margin:.5rem 0 0; word-break:break-all">
				O mandale este link: <a href={linkDeInvitacion}>{linkDeInvitacion}</a>
			</p>
		</div>

		<div class="tarjeta">
			<h3>Mientras tanto</h3>
			<p style="margin:0 0 .8rem">
				<strong>{futbolista.nombre}</strong>, {futbolista.edad} años, {puesto.nombre.toLowerCase()},
				la {futbolista.numero}. Vos jugás como <strong>{vista.rol}</strong>.
			</p>
			<ClubLinea clubId={futbolista.contrato.clubId} tamano={38} />
		</div>

		<p class="sutil">Esta pantalla se actualiza sola cuando entre.</p>
	</div>
{:else}
	<Cabecera {estado} rol={vista.rol} />

	<p class="sutil" style="margin:-.5rem 0 1.25rem">
		{estado.anio} · Sos <strong>{vista.rol}</strong> y {vista.elOtro.nombre} es {vista.elOtro.rol}.
	</p>

	{#if vista.opciones.retiro}
		<!-- El final se lee de arriba abajo, como una nota. Una sola columna. -->
		<div class="angosta">
			<Retiro retiro={vista.opciones.retiro} {estado} rol={vista.rol} />
		</div>
	{/if}

	{#if !vista.opciones.retiro}
		<!--
			Dos columnas en pantalla grande, una sola en el celular.

			El reparto no es por tamaño sino por para qué sirve cada cosa. A la
			izquierda va lo que se consulta mientras se decide —quién es, para qué
			está jugando, cómo está la relación, cuánto falta para el Mundial— y se
			queda pegado arriba, así que sigue en pantalla cuando uno baja a elegir.
			A la derecha va lo que se lee una vez y lo que se toca: la tapa del
			diario, la alerta, el formulario de la fase.

			Antes esto era una sola columna de 544 píxeles y en un monitor sobraban
			mil de aire a los costados mientras la página medía seis pantallas de
			alto. Lo que estaba mal no era el largo: era usar un tercio del ancho.
		-->
		<div class="dosColumnas">
			<aside class="alCostado">
				{#if vista.opciones.miSueno}
					<Sueno mio={vista.opciones.miSueno} delOtro={vista.opciones.elSuenoDelOtro} />
				{/if}

				<!--
					Lo que no es del año: comprar y pedir salir. Van acá y no en la
					columna del medio, que cuenta la temporada en orden. Solo mientras la
					fase esté abierta: cerrada, no hay formulario al que mandarlos.
				-->
				{#if !vista.yaCerre && vista.elOtro && !vista.opciones.retiro}
					<Bolsillo opciones={vista.opciones} {estado} />
				{/if}

				<!--
					Y lo que ya compró, en todas las fases.

					La lista vivía adentro de la vidriera, y la vidriera existe una fase
					de cada tres. Alan lo reportó jugando: "después se borran y no sabés
					qué tenés; además comprás un centro de entrenamiento y debería
					aparecer en algún lado". Comprar algo y que la compra desaparezca de
					la pantalla es comprar al vacío.
				-->
				{#if vista.opciones.loQueTengo}
					<LoQueTengo cuales={vista.opciones.loQueTengo} />
				{/if}

				{#if vista.rol === 'futbolista'}
					<TarjetaJugador {estado} opciones={vista.opciones} />

					<!--
				La ficha de arriba ya trae la media, los acumulados, los cinco atributos
				del puesto y la plata. Lo que queda acá es el detalle fino: los otros
				tres atributos, los cuatro números que se mueven solos y la letra chica
				del contrato. Es información de consulta, no de un vistazo, así que va
				plegada: antes eran setecientos píxeles repitiendo lo de arriba.
			-->
					<Paso titulo="La ficha completa" dato="{futbolista.numero} · {puesto.nombre}">
						<div class="conCamiseta">
							<Camiseta
								clubId={futbolista.contrato.clubId}
								numero={futbolista.numero}
								nombre={futbolista.nombre}
								alto={130}
							/>
							<div class="alLado">
								<AtributosLista atributos={futbolista.atributos} posicion={futbolista.posicion} />
							</div>
						</div>
						<div class="cifras" style="margin-top:.85rem">
							<div class="cifra">
								<span class="valor">{futbolista.dt}</span>
								<span class="etiqueta">El técnico</span>
							</div>
							<div class="cifra">
								<span class="valor">{futbolista.prensa}</span>
								<span class="etiqueta">Prensa</span>
							</div>
							<div class="cifra">
								<span class="valor">{futbolista.forma}</span>
								<span class="etiqueta">Forma</span>
							</div>
							<div class="cifra">
								<span class="valor">{futbolista.desgaste}</span>
								<span class="etiqueta">Desgaste</span>
							</div>
						</div>

						<div style="margin:1.1rem 0 .7rem">
							<ClubLinea clubId={futbolista.contrato.clubId} tamano={40} />
						</div>
						<div class="cifras">
							<div class="cifra">
								<span class="valor">{futbolista.contrato.temporadasRestantes}</span>
								<span class="etiqueta">Temporadas de contrato</span>
							</div>
							<div class="cifra">
								<span class="valor" style="font-size:1.1rem">{plata(futbolista.dineroUsd)}</span>
								<span class="etiqueta">Ahorrado</span>
							</div>
						</div>
					</Paso>
				{:else}
					<div class="tarjeta" data-tema="plata">
						<h3>Tu agencia</h3>
						<div class="cifras">
							<div class="cifra">
								<span class="valor">{representante.prestigio}</span>
								<span class="etiqueta">Prestigio</span>
							</div>
							<div class="cifra">
								<span class="valor" style="font-size:1.1rem">{plata(representante.dineroUsd)}</span>
								<span class="etiqueta">Caja</span>
							</div>
							<div class="cifra">
								<span class="valor">{representante.atributos.negociacion}</span>
								<span class="etiqueta">Negociación</span>
							</div>
							<div class="cifra">
								<span class="valor">{representante.atributos.scouting}</span>
								<span class="etiqueta">Scouting</span>
							</div>
							<div class="cifra">
								<span class="valor">{representante.atributos.contactos}</span>
								<span class="etiqueta">Contactos</span>
							</div>
							<div class="cifra">
								<span class="valor">{representante.representadosExtra + 1}</span>
								<span class="etiqueta">Representados</span>
							</div>
							<!--
								La otra cara de la cartera.

								Los representados extra eran un número que sólo servía para un
								sueño. Ahora dejan plata todos los años y se llevan el día, y
								esto es lo que hace que la cuenta se pueda mirar antes de
								firmar al siguiente. Ver `cartera.ts`.
							-->
							<div class="cifra">
								<span class="valor">{disponibilidadDe(estado)}</span>
								<span class="etiqueta">Disponibilidad</span>
							</div>
						</div>
						<p class="sutil" style="margin:.7rem 0 0">
							{comoEstaLaAgenda(estado)}
							{#if representante.representadosExtra > 0}
								Los otros {representante.representadosExtra} te dejan
								<b>{plata(loQueDejaLaCarteraAlAnio(estado))}</b> por temporada.
							{/if}
						</p>
					</div>

					<TarjetaJugador {estado} opciones={vista.opciones} />

					<Paso
						titulo="Tu cliente, en detalle"
						dato="{estado.contratoRepresentacion.pctSalario}% del sueldo · {estado
							.contratoRepresentacion.pctTransferencia}% del pase"
					>
						<div class="cifras">
							<div class="cifra">
								<span class="valor" style="font-size:1.1rem"
									>{plata(futbolista.valorMercadoUsd)}</span
								>
								<span class="etiqueta">Valor</span>
							</div>
							<div class="cifra">
								<span class="valor" style="font-size:1.1rem"
									>{plata(futbolista.contrato.salarioMensual)}</span
								>
								<span class="etiqueta">Su sueldo</span>
							</div>
							<div class="cifra">
								<span class="valor">{futbolista.contrato.temporadasRestantes}</span>
								<span class="etiqueta">Temporadas de contrato</span>
							</div>
						</div>
						<div style="margin-top:.9rem">
							<AtributosLista atributos={futbolista.atributos} posicion={futbolista.posicion} />
						</div>
					</Paso>
				{/if}

				<Confianza {estado} rol={vista.rol} />

				<Mundial opciones={vista.opciones} {estado} />
			</aside>

			<main class="alCentro">
				{#if vista.opciones.novedades && vista.opciones.novedades.length > 0}
					<Novedades
						novedades={vista.opciones.novedades}
						clave="{vista.codigo}-{estado.temporada}"
					/>
				{/if}

				{#if vista.opciones.alerta}
					<Alerta alerta={vista.opciones.alerta} />
				{/if}

				{#if vista.opciones.portada}
					<Portada portada={vista.opciones.portada} />
				{/if}

				{#if vista.sincronizacion !== 'CAREER_OVER'}
					<h2 class="primerTitulo">{NOMBRE_FASE[estado.fase]}</h2>

					{#if form?.problema}
						<div class="error">{form.problema}</div>
					{/if}

					{#if vista.yaCerre}
						<div class="tarjeta">
							<p style="margin:0 0 .75rem">
								<span class="chip espera">{MENSAJE_SINCRONIZACION[vista.sincronizacion]}</span>
							</p>
							<p style="margin:0">
								Ya cerraste tu parte. La fase avanza cuando {vista.elOtro.nombre} cierre la suya.
							</p>
							<p class="sutil" style="margin:.5rem 0 0">Esta pantalla se actualiza sola.</p>

							<form method="POST" action="?/cerrarFase" use:enhance style="margin-top:1rem">
								<button type="submit" name="sinEsperar" value="si" class="secundario">
									Avanzar sin esperar a {vista.elOtro.nombre}
								</button>
							</form>
						</div>
					{:else}
						<!--
							`id="fase"` no es decorativo: es lo que deja que la vidriera y
							el botón de pedir salir vivan en la columna del costado y se
							envíen con este formulario igual. Ver `Bolsillo.svelte`.
						-->
						<form id="fase" method="POST" action="?/cerrarFase" use:enhance>
							<!--
								De qué fase es lo que se está por mandar.

								Una pestaña abierta desde antes muestra la fase anterior, y sin
								esto su formulario se guardaba como decisión de la fase actual:
								la elección de la mesa entraba como si fuera del mercado y no la
								veía nadie. Con el sello, el servidor se da cuenta y avisa.
							-->
							<input type="hidden" name="deLaFase" value={estado.fase} />
							<input type="hidden" name="deLaTemporada" value={estado.temporada} />
							<Decisiones
								opciones={vista.opciones}
								{estado}
								rol={vista.rol}
								tiradas={vista.tiradas}
							/>

							<!--
								Con momentos sin jugar no se cierra nada.

								El servidor es el que manda —ver `enviarDecision`— pero avisarlo
								acá cambia lo que se siente: enterarte de que te falta algo
								*después* de apretar el botón es un error; verlo antes es una
								instrucción. Los dos botones se apagan, incluido "avanzar sin
								esperar", que era justamente por donde Alan encontró el agujero.
							-->
							{#if faltanMomentos > 0}
								<p class="faltan">
									Te {faltanMomentos === 1 ? 'falta' : 'faltan'}
									{faltanMomentos}
									{faltanMomentos === 1 ? 'momento' : 'momentos'} por jugar. Son lo que define el año.
								</p>
							{/if}

							<button type="submit" disabled={faltanMomentos > 0}>Cerrar mi parte de la fase</button
							>

							<button
								type="submit"
								name="sinEsperar"
								value="si"
								class="secundario"
								style="margin-top:.6rem"
								disabled={faltanMomentos > 0}
							>
								Avanzar sin esperar a {vista.elOtro.nombre}
							</button>
							<p class="sutil" style="margin:.5rem 0 0; text-align:center">
								Cierra también por {vista.elOtro.nombre}, con lo que el juego toma por defecto.
								Queda anotado en el diario.
							</p>
						</form>
					{/if}
				{/if}

				<!--
					La carrera dibujada y el diario van al final de la columna del medio y
					no al costado: son las dos cosas que se leen, no las que se consultan
					de reojo mientras se decide.
				-->
				<Trayectoria
					historial={vista.opciones.historial ?? []}
					seleccion={vista.opciones.seleccionCarrera ?? { partidos: 0, goles: 0, mundialesGanados: 0 }}
				/>

				<!--
					Y por dónde pasó, que el gráfico no cuenta: el gráfico dice qué tan
					bien le fue y el mapa dice dónde. Los dos plegados, porque son para
					mirar cuando uno quiere mirar para atrás y no cada vez que entra.
				-->
				<Mapa historial={vista.opciones.historial ?? []} />

				<Diario entradas={vista.diario} />
			</main>
		</div>
	{:else}
		<div class="angosta"><Diario entradas={vista.diario} /></div>
	{/if}

	<!--
		Los avisos van fuera de las dos columnas y del scroll: son de la partida,
		no de la pantalla. Ver `Avisos.svelte`.
	-->
	<Avisos {vista} />
{/if}

<style>
	/* Lo que falta para poder cerrar. Amarillo: no es un error, es un pendiente. */
	.faltan {
		margin: 0 0 0.7rem;
		padding: 0.7rem 0.85rem;
		border-radius: 12px;
		border-left: 3px solid var(--espera);
		background: rgba(251, 191, 36, 0.09);
		font-size: 0.88rem;
		line-height: 1.4;
	}

	.conCamiseta {
		display: flex;
		align-items: center;
		gap: 1.1rem;
	}
	.alLado {
		min-width: 0;
		flex: 1;
	}

	/*
	 * En el celular no hay nada que repartir: una columna, en el orden en que
	 * está escrita. El costado va primero porque el sueño y la ficha son lo que
	 * uno quiere ver al abrir.
	 */
	.dosColumnas {
		display: grid;
		gap: 1.25rem;
	}

	/* Y en pantalla grande, las dos al lado. El corte está donde entran cómodas
	   las dos columnas: menos de eso y la del medio queda angosta para leer. */
	@media (min-width: 60rem) {
		.dosColumnas {
			grid-template-columns: 23rem minmax(0, 1fr);
			gap: 1.5rem;
			align-items: start;
		}

		/*
		 * Pegada arriba: mientras se baja por el formulario, la ficha y el sueño
		 * siguen en pantalla. Es la mitad de por qué vale la pena la segunda
		 * columna —lo que se está decidiendo y para qué se decide quedan juntos—
		 * y por eso el `overflow-y` propio: si el costado es más alto que la
		 * ventana, se scrollea solo en vez de romper el pegado.
		 */
		.alCostado {
			position: sticky;
			top: 7.5rem;
			max-height: calc(100vh - 9rem);
			overflow-y: auto;
			/* Sin esto la barra de scroll del costado tapa el borde de las tarjetas. */
			padding-right: 0.35rem;
			scrollbar-width: thin;
		}

		/* El primer rótulo de la columna del medio no necesita el aire de arriba:
		   ahí no separa nada de nada, arranca la columna. */
		.alCentro :global(h2.primerTitulo) {
			margin-top: 0;
		}
	}
</style>
