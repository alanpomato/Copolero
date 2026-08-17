<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
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
	import Paso from '$lib/ui/Paso.svelte';
	import Mundial from '$lib/ui/Mundial.svelte';
	import Portada from '$lib/ui/Portada.svelte';
	import Trayectoria from '$lib/ui/Trayectoria.svelte';
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
	 * Mientras esperamos al otro, refrescamos solos cada 5 segundos. Con esto
	 * alcanza para que se sienta en vivo cuando los dos están conectados al mismo
	 * tiempo, sin meter websockets.
	 */
	$effect(() => {
		if (!esperandoAlOtro && vista.elOtro) return;
		const intervalo = setInterval(() => void invalidateAll(), 5000);
		return () => clearInterval(intervalo);
	});

	const MENSAJE_SINCRONIZACION: Record<string, string> = {
		WAITING_FOR_BOTH: 'Falta que decidan los dos',
		WAITING_FOR_PLAYER: 'Falta el futbolista',
		WAITING_FOR_AGENT: 'Falta el representante',
		BOTH_READY: 'Resolviendo',
		SEASON_COMPLETE: 'Temporada terminada',
		CAREER_OVER: 'Carrera terminada'
	};

	function plata(usd: number): string {
		return `USD ${usd.toLocaleString('es-AR')}`;
	}
</script>

<svelte:head>
	<title>{futbolista.nombre} — Copolero</title>
</svelte:head>

{#if !vista.elOtro}
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
{:else}
	<Cabecera {estado} rol={vista.rol} />

	<p class="sutil" style="margin:-.5rem 0 1.25rem">
		{estado.anio} · Sos <strong>{vista.rol}</strong> y {vista.elOtro.nombre} es {vista.elOtro.rol}.
	</p>

	{#if vista.opciones.retiro}
		<Retiro retiro={vista.opciones.retiro} {estado} rol={vista.rol} />
	{/if}

	{#if !vista.opciones.retiro}
		{#if vista.opciones.alerta}
			<Alerta alerta={vista.opciones.alerta} />
		{/if}

		{#if vista.opciones.portada}
			<Portada portada={vista.opciones.portada} />
		{/if}

		<!--
			Arriba de todo lo demás: es lo que contesta "¿por qué estoy abriendo
			esto otra vez?". Los números del año vienen después.
		-->
		{#if vista.opciones.miSueno}
			<Sueno mio={vista.opciones.miSueno} delOtro={vista.opciones.elSuenoDelOtro} />
		{/if}

		<Confianza {estado} rol={vista.rol} />

		<Mundial opciones={vista.opciones} {estado} />

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
						<AtributosLista atributos={futbolista.atributos} />
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
				</div>
			</div>

			<TarjetaJugador {estado} opciones={vista.opciones} />

			<Paso
				titulo="Tu cliente, en detalle"
				dato="{estado.contratoRepresentacion.pctSalario}% del sueldo · {estado
					.contratoRepresentacion.pctTransferencia}% del pase"
			>
				<div class="cifras">
					<div class="cifra">
						<span class="valor" style="font-size:1.1rem">{plata(futbolista.valorMercadoUsd)}</span>
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
					<AtributosLista atributos={futbolista.atributos} />
				</div>
			</Paso>
		{/if}

		<!--
			La carrera entera reemplaza a la tarjeta de "la última temporada": muestra
			los mismos números del año que cerró en el panel de abajo, y además dónde
			queda ese año dentro de todo lo demás.
		-->
		<Trayectoria historial={vista.opciones.historial ?? []} />

		{#if vista.sincronizacion !== 'CAREER_OVER'}
			<h2>{NOMBRE_FASE[estado.fase]}</h2>

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
				<form method="POST" action="?/cerrarFase" use:enhance>
					<Decisiones opciones={vista.opciones} {estado} rol={vista.rol} />

					<Paso
						titulo="Dejarle una nota a {vista.elOtro.nombre}"
						nota="Queda privada hasta que los dos cierren la fase. Después la ven los dos."
					>
						<label style="margin:0">
							<textarea name="nota" maxlength="280" placeholder="Lo que quieras dejarle dicho…"
							></textarea>
						</label>
					</Paso>

					<button type="submit">Cerrar mi parte de la fase</button>

					<button
						type="submit"
						name="sinEsperar"
						value="si"
						class="secundario"
						style="margin-top:.6rem"
					>
						Avanzar sin esperar a {vista.elOtro.nombre}
					</button>
					<p class="sutil" style="margin:.5rem 0 0; text-align:center">
						Cierra también por {vista.elOtro.nombre}, con lo que el juego toma por defecto. Queda
						anotado en el diario.
					</p>
				</form>
			{/if}
		{/if}
	{/if}

	<Diario entradas={vista.diario} />
{/if}

<style>
	.conCamiseta {
		display: flex;
		align-items: center;
		gap: 1.1rem;
	}
	.alLado {
		min-width: 0;
		flex: 1;
	}
</style>
