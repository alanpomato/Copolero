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

	{#if vista.sincronizacion === 'CAREER_OVER'}
		<div class="tarjeta">
			<h3>Fin</h3>
			<p style="margin:0">
				{futbolista.nombre} se retiró a los {futbolista.edad} años. La pantalla de retiro con los dos
				puntajes llega en el hito M5.
			</p>
		</div>
	{/if}

	{#if vista.rol === 'futbolista'}
		<div class="tarjeta">
			<h3>Lo que sabés hacer</h3>
			<p class="sutil" style="margin:-.35rem 0 .85rem">
				{puesto.nombre} · pie {futbolista.pie} · media {media(
					futbolista.atributos,
					futbolista.posicion
				)}
			</p>
			<AtributosLista atributos={futbolista.atributos} />
		</div>

		<div class="tarjeta">
			<h3>Cómo te ven</h3>
			<div class="cifras">
				<div class="cifra">
					<span class="valor">{futbolista.fama}</span>
					<span class="etiqueta">Fama</span>
				</div>
				<div class="cifra">
					<span class="valor">{futbolista.hinchada}</span>
					<span class="etiqueta">Hinchada</span>
				</div>
				<div class="cifra">
					<span class="valor">{futbolista.dt}</span>
					<span class="etiqueta">El técnico</span>
				</div>
				<div class="cifra">
					<span class="valor">{futbolista.prensa}</span>
					<span class="etiqueta">Prensa</span>
				</div>
			</div>
		</div>

		<div class="tarjeta">
			<h3>Tu contrato</h3>
			<div style="margin-bottom:.85rem">
				<ClubLinea clubId={futbolista.contrato.clubId} tamano={40} />
			</div>
			<div class="cifras">
				<div class="cifra">
					<span class="valor" style="font-size:1.1rem"
						>{plata(futbolista.contrato.salarioMensual)}</span
					>
					<span class="etiqueta">Por mes</span>
				</div>
				<div class="cifra">
					<span class="valor">{futbolista.contrato.temporadasRestantes}</span>
					<span class="etiqueta">Temporadas</span>
				</div>
				<div class="cifra">
					<span class="valor" style="font-size:1.1rem">{plata(futbolista.dineroUsd)}</span>
					<span class="etiqueta">Ahorrado</span>
				</div>
			</div>
		</div>
	{:else}
		<div class="tarjeta">
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

		<div class="tarjeta">
			<h3>Tu cliente</h3>
			<div style="margin-bottom:.85rem">
				<ClubLinea clubId={futbolista.contrato.clubId} tamano={38} />
			</div>
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
					<span class="valor">{estado.contratoRepresentacion.pctSalario}%</span>
					<span class="etiqueta">Tu parte</span>
				</div>
				<div class="cifra">
					<span class="valor">{estado.contratoRepresentacion.pctTransferencia}%</span>
					<span class="etiqueta">Del pase</span>
				</div>
			</div>
			<div style="margin-top:.9rem">
				<AtributosLista atributos={futbolista.atributos} />
			</div>
		</div>
	{/if}

	{#if estado.ultimaTemporada}
		{@const t = estado.ultimaTemporada}
		<div class="tarjeta">
			<h3>La temporada {t.temporada}</h3>
			<div class="cifras">
				<div class="cifra">
					<span class="valor">{t.nota.toFixed(1)}</span>
					<span class="etiqueta">Nota</span>
				</div>
				<div class="cifra">
					<span class="valor">{t.partidos}</span>
					<span class="etiqueta">Partidos</span>
				</div>
				<div class="cifra">
					<span class="valor">{t.goles}</span>
					<span class="etiqueta">Goles</span>
				</div>
				<div class="cifra">
					<span class="valor">{t.asistencias}</span>
					<span class="etiqueta">Asistencias</span>
				</div>
				<div class="cifra">
					<span class="valor">{t.puesto}º</span>
					<span class="etiqueta">de {t.equipos}</span>
				</div>
			</div>
			{#if t.campeon}
				<p style="margin:.8rem 0 0"><span class="chip listo">Campeón</span></p>
			{:else if t.lesionado}
				<p style="margin:.8rem 0 0"><span class="chip espera">Se lesionó</span></p>
			{/if}
		</div>
	{/if}

	{#if vista.rol === 'futbolista'}
		<div class="tarjeta">
			<h3>La relación</h3>
			<div class="cifras">
				<div class="cifra">
					<span class="valor">{estado.confianza}</span>
					<span class="etiqueta">Confianza</span>
				</div>
			</div>
		</div>
	{/if}

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
			</div>
		{:else}
			<form method="POST" action="?/cerrarFase" use:enhance>
				<Decisiones opciones={vista.opciones} {estado} rol={vista.rol} />

				<div class="tarjeta">
					<label style="margin:0">
						<span class="titulo">Nota para el otro (opcional)</span>
						<textarea name="nota" maxlength="280" placeholder="Lo que quieras dejarle dicho…"
						></textarea>
					</label>
					<p class="sutil" style="margin:0">
						Queda privada hasta que los dos cierren la fase. Después la ven los dos.
					</p>
				</div>

				<button type="submit">Cerrar mi parte de la fase</button>
			</form>
		{/if}
	{/if}

	{#if vista.diario.length > 0}
		<h2>Diario</h2>
		<div class="tarjeta">
			<ul class="diario">
				{#each [...vista.diario].reverse() as entrada, i (i)}
					<li>
						<span class="momento">
							T{entrada.temporada} · {NOMBRE_FASE[entrada.fase as 1 | 2 | 3]}
						</span>
						{entrada.texto}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
{/if}
