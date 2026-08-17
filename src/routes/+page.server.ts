import { fail, redirect } from '@sveltejs/kit';
import { obtenerDb } from '$lib/server/db';
import { crearPartida, ErrorDePartida } from '$lib/server/partidas';
import { EDAD_INICIAL_POR_DEFECTO } from '$lib/engine/estado';
import {
	ATRIBUTOS,
	esPieValido,
	esPuestoValido,
	repartoValido,
	type Pie
} from '$lib/engine/puestos';
import { ROLES, type Atributos, type Rol } from '$lib/engine/tipos';
import { esClubValido } from '$lib/ui/opciones';
import type { Actions } from './$types';

const EDAD_MINIMA = 15;
const EDAD_MAXIMA = 22;

function texto(datos: FormData, campo: string, largoMaximo = 60): string {
	return String(datos.get(campo) ?? '')
		.trim()
		.slice(0, largoMaximo);
}

/**
 * Los puntos que el jugador repartió a mano.
 *
 * Se vuelve a validar acá aunque el formulario ya lo controle: el que edita el
 * HTML no puede darse doce puntos en cada atributo.
 */
function repartoDelFormulario(datos: FormData): Partial<Record<keyof Atributos, number>> {
	const crudo: Partial<Record<keyof Atributos, number>> = {};
	for (const atributo of ATRIBUTOS) {
		crudo[atributo] = Number(datos.get(`reparto-${atributo}`) ?? 0);
	}
	return repartoValido(crudo).reparto;
}

export const actions: Actions = {
	crear: async ({ request, cookies }) => {
		const datos = await request.formData();

		const rol = texto(datos, 'rol') as Rol;
		const nombreFutbolista = texto(datos, 'nombreFutbolista');
		const nombreRepresentante = texto(datos, 'nombreRepresentante');
		const nacionalidad = texto(datos, 'nacionalidad', 40) || 'Argentina';
		const puesto = texto(datos, 'puesto', 40);
		const pie = texto(datos, 'pie', 20) as Pie;
		const clubId = texto(datos, 'clubId', 40);
		const edadInicial = Number(datos.get('edadInicial') ?? EDAD_INICIAL_POR_DEFECTO);
		const numero = Number(datos.get('numero') ?? 0);

		const problemas: string[] = [];
		if (!ROLES.includes(rol)) problemas.push('Elegí a cuál de los dos jugás.');
		if (!nombreFutbolista) problemas.push('Poné el nombre del futbolista.');
		if (!nombreRepresentante) problemas.push('Poné el nombre del representante.');
		if (!esPuestoValido(puesto)) problemas.push('Elegí en qué puesto juega.');
		if (!esPieValido(pie)) problemas.push('Elegí con qué pie juega.');
		if (!esClubValido(clubId)) problemas.push('Elegí el club donde arranca.');
		if (!Number.isInteger(numero) || numero < 1 || numero > 99) {
			problemas.push('El número de camiseta va del 1 al 99.');
		}
		if (!Number.isInteger(edadInicial) || edadInicial < EDAD_MINIMA || edadInicial > EDAD_MAXIMA) {
			problemas.push(`La edad inicial tiene que estar entre ${EDAD_MINIMA} y ${EDAD_MAXIMA}.`);
		}

		if (problemas.length > 0) {
			return fail(400, { problemas, valores: Object.fromEntries(datos) });
		}

		let creada;
		try {
			creada = crearPartida(
				obtenerDb(),
				{
					futbolista: {
						nombre: nombreFutbolista,
						nacionalidad,
						puesto,
						numero,
						pie,
						edadInicial,
						clubId,
						reparto: repartoDelFormulario(datos)
					},
					representante: { nombre: nombreRepresentante }
				},
				rol,
				// Quien crea la partida se llama, en la partida, como el personaje que
				// eligió jugar. Antes se pedía el nombre de la persona por separado y
				// eran tres nombres para dos personajes: uno de los tres no se usaba
				// nunca —el del representante, si elegías jugar al futbolista, quedaba
				// en "Sin representante" hasta que entrara el otro— y los otros dos se
				// repetían en pantalla.
				rol === 'futbolista' ? nombreFutbolista : nombreRepresentante
			);
		} catch (error) {
			const mensaje =
				error instanceof ErrorDePartida ? error.message : 'No se pudo crear la partida.';
			return fail(500, { problemas: [mensaje], valores: Object.fromEntries(datos) });
		}

		// La cookie es solo una comodidad para volver: la identidad de verdad es
		// el token de la URL.
		cookies.set('copolero_token', creada.token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365
		});

		redirect(303, `/j/${creada.token}`);
	},

	entrar: async ({ request }) => {
		const datos = await request.formData();
		const codigo = texto(datos, 'codigo', 12).toUpperCase();
		if (!codigo) return fail(400, { problemaCodigo: 'Poné el código de la partida.' });
		redirect(303, `/unirse/${encodeURIComponent(codigo)}`);
	}
};
