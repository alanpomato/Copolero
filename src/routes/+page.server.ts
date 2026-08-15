import { fail, redirect } from '@sveltejs/kit';
import { obtenerDb } from '$lib/server/db';
import { crearPartida, ErrorDePartida } from '$lib/server/partidas';
import { EDAD_INICIAL_POR_DEFECTO } from '$lib/engine/estado';
import { POSICIONES, ROLES, type Posicion, type Rol } from '$lib/engine/tipos';
import { esClubValido } from '$lib/ui/opciones';
import type { Actions } from './$types';

const EDAD_MINIMA = 15;
const EDAD_MAXIMA = 22;

function texto(datos: FormData, campo: string, largoMaximo = 60): string {
	return String(datos.get(campo) ?? '')
		.trim()
		.slice(0, largoMaximo);
}

export const actions: Actions = {
	crear: async ({ request, cookies }) => {
		const datos = await request.formData();

		const tuNombre = texto(datos, 'tuNombre');
		const rol = texto(datos, 'rol') as Rol;
		const nombreFutbolista = texto(datos, 'nombreFutbolista');
		const nacionalidad = texto(datos, 'nacionalidad', 40) || 'Argentina';
		const posicion = texto(datos, 'posicion') as Posicion;
		const clubId = texto(datos, 'clubId', 40);
		const edadInicial = Number(datos.get('edadInicial') ?? EDAD_INICIAL_POR_DEFECTO);

		const problemas: string[] = [];
		if (!tuNombre) problemas.push('Poné tu nombre.');
		if (!ROLES.includes(rol)) problemas.push('Elegí con qué rol querés jugar.');
		if (!nombreFutbolista) problemas.push('Poné el nombre del futbolista.');
		if (!POSICIONES.includes(posicion)) problemas.push('Elegí una posición.');
		if (!esClubValido(clubId)) problemas.push('Elegí el club donde arranca.');
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
					futbolista: { nombre: nombreFutbolista, nacionalidad, posicion, edadInicial, clubId },
					representante: { nombre: rol === 'representante' ? tuNombre : 'Sin representante' }
				},
				rol,
				tuNombre
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
