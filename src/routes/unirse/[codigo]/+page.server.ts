import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { obtenerDb } from '$lib/server/db';
import { jugadores, partidas } from '$lib/server/db/schema';
import { ErrorDePartida, unirseAPartida } from '$lib/server/partidas';
import { ROLES, type Estado } from '$lib/engine/tipos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const codigo = params.codigo.toUpperCase();
	const partida = obtenerDb().select().from(partidas).where(eq(partidas.codigo, codigo)).get();

	if (!partida) {
		error(404, 'No existe ninguna partida con ese código.');
	}

	const presentes = obtenerDb()
		.select()
		.from(jugadores)
		.where(eq(jugadores.partidaId, partida.id))
		.all();
	const rolLibre = ROLES.find((r) => !presentes.some((j) => j.rol === r)) ?? null;
	const estado = JSON.parse(partida.estadoJson) as Estado;

	return {
		codigo,
		rolLibre,
		anfitrion: presentes[0]?.nombre ?? null,
		futbolista: {
			nombre: estado.futbolista.nombre,
			club: estado.futbolista.contrato.club,
			edad: estado.futbolista.edad,
			posicion: estado.futbolista.posicion
		}
	};
};

export const actions: Actions = {
	default: async ({ params, request, cookies }) => {
		const datos = await request.formData();
		const nombre = String(datos.get('nombre') ?? '')
			.trim()
			.slice(0, 60);

		if (!nombre) return fail(400, { problema: 'Poné tu nombre.' });

		let token: string;
		try {
			token = unirseAPartida(obtenerDb(), params.codigo, nombre);
		} catch (e) {
			const mensaje = e instanceof ErrorDePartida ? e.message : 'No se pudo entrar a la partida.';
			return fail(400, { problema: mensaje });
		}

		cookies.set('copolero_token', token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365
		});

		redirect(303, `/j/${token}`);
	}
};
