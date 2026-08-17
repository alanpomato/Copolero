import { error, fail } from '@sveltejs/kit';
import { obtenerDb } from '$lib/server/db';
import {
	enviarDecision,
	ErrorDePartida,
	tirarOcasion,
	tocarJugador,
	vistaPara
} from '$lib/server/partidas';
import type { Decision } from '$lib/engine/tipos';
import type { Actions, PageServerLoad } from './$types';

/** Un campo del formulario, recortado, o `undefined` si no vino. */
function campo(datos: FormData, nombre: string): string | undefined {
	const valor = datos.get(nombre);
	if (typeof valor !== 'string') return undefined;
	const limpio = valor.trim().slice(0, 60);
	return limpio.length > 0 ? limpio : undefined;
}

export const load: PageServerLoad = ({ params, cookies }) => {
	const vista = vistaPara(obtenerDb(), params.token);
	if (!vista) error(404, 'Ese link no corresponde a ninguna partida.');

	tocarJugador(obtenerDb(), params.token);

	// Si entró por el link en vez de por la cookie, la dejamos al día para que
	// pueda volver sin tener que buscar el mensaje.
	cookies.set('copolero_token', params.token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365
	});

	return { vista };
};

export const actions: Actions = {
	/**
	 * Tirar la rueda de un momento del año.
	 *
	 * Devuelve qué pasó para que la ruleta pueda girar hasta ahí. La elección
	 * queda escrita antes de responder, así que el número que se ve es el número
	 * que va a contar: recargar la página no lo cambia y volver a mandar el
	 * formulario con otra opción tampoco.
	 */
	tirar: async ({ params, request }) => {
		const datos = await request.formData();
		const indice = Number(datos.get('indice'));
		const opcion = campo(datos, 'opcion');

		if (!Number.isInteger(indice) || indice < 0 || !opcion) {
			return fail(400, { problema: 'Falta decir qué hacés.' });
		}

		try {
			return { tirada: tirarOcasion(obtenerDb(), params.token, indice, opcion) };
		} catch (e) {
			const mensaje = e instanceof ErrorDePartida ? e.message : 'No se pudo tirar la rueda.';
			return fail(400, { problema: mensaje });
		}
	},

	cerrarFase: async ({ params, request }) => {
		const datos = await request.formData();
		const nota = String(datos.get('nota') ?? '')
			.trim()
			.slice(0, 280);

		const vista = vistaPara(obtenerDb(), params.token);
		if (!vista) error(404, 'Ese link no corresponde a ninguna partida.');

		// Lo que manda cada rol se recorta a lo que ese rol puede decidir: el
		// futbolista no puede mandar una gestión ni el representante un plan de
		// entrenamiento, por más que edite el formulario.
		const decision: Decision = { rol: vista.rol, nota };
		if (vista.rol === 'futbolista') {
			decision.entrenamiento = campo(datos, 'entrenamiento');
			decision.intensidad = campo(datos, 'intensidad');
			decision.objetivo = campo(datos, 'objetivo');
			// Solo la primera pretemporada, y solo si el servidor lo ofreció.
			if (vista.opciones.rasgos) decision.rasgo = campo(datos, 'rasgo');
			// Una elección por ocasión, en el mismo orden en que se mostraron.
			// Pedir salir del club. Solo si el servidor lo ofreció: no se puede
			// pedir dos veces el mismo año ni con el contrato vencido.
			if (vista.opciones.salida) decision.pedirSalida = campo(datos, 'pedirSalida');

			const cuantas = vista.opciones.ocasiones?.length ?? 0;
			if (cuantas > 0) {
				decision.ocasiones = Array.from(
					{ length: cuantas },
					(_, i) => campo(datos, `ocasion-${i}`) ?? ''
				);
			}
		} else {
			decision.gestion = campo(datos, 'gestion');
		}
		if (vista.estado.fase === 3) {
			decision.destino = campo(datos, 'destino');
		}
		// Las dos mesas las juegan los dos: la de ellos y la del club.
		if (vista.opciones.tratos) {
			decision.trato = campo(datos, 'trato');
		}
		// Cada uno gasta lo suyo, y el servidor solo acepta lo que ese rol puede
		// comprar: el catálogo está partido por rol y `comprar` lo verifica.
		if (vista.opciones.inversiones) {
			// Varias en el mismo año: el límite es la plata, no el calendario. El
			// motor cobra una por una y para cuando no alcanza.
			const marcadas = datos
				.getAll('inversiones')
				.filter((v): v is string => typeof v === 'string')
				.map((v) => v.trim().slice(0, 60))
				.filter((v) => v.length > 0)
				.slice(0, 12);
			if (marcadas.length > 0) decision.inversiones = marcadas;
		}
		// Para qué juega cada uno: lo eligen los dos, cada uno el suyo, y solo la
		// primera pretemporada. El motor verifica que ese id sea uno de los que le
		// corresponden a ese rol.
		if (vista.opciones.suenos) {
			decision.sueno = campo(datos, 'sueno');
		}
		if (vista.opciones.renovacion?.oferta) {
			decision.renovacion = campo(datos, 'renovacion');
		}

		// "Avanzar sin esperar": cierra también por el otro con lo que el motor
		// toma por defecto. Está para poder probar una carrera entera de a uno, y
		// para que una partida no quede muerta si el otro desaparece.
		const sinEsperar = datos.get('sinEsperar') === 'si';

		try {
			const resultado = enviarDecision(obtenerDb(), params.token, decision, {
				tambienPorElOtro: sinEsperar
			});
			return { faseCerrada: resultado.faseCerrada };
		} catch (e) {
			const mensaje = e instanceof ErrorDePartida ? e.message : 'No se pudo cerrar la fase.';
			return fail(400, { problema: mensaje });
		}
	}
};
