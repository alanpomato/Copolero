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
		/*
		 * El nombre con el que entra: el del personaje que quedó libre.
		 *
		 * Los dos nombres se eligen al crear la partida, así que el que entra no
		 * tiene nada que escribir. Antes se le pedía el suyo y terminaban siendo
		 * tres nombres para dos personajes.
		 */
		nombreQueLeToca:
			rolLibre === 'futbolista' ? estado.futbolista.nombre : estado.representante.nombre,
		representante: estado.representante.nombre,
		futbolista: {
			nombre: estado.futbolista.nombre,
			clubId: estado.futbolista.contrato.clubId,
			edad: estado.futbolista.edad,
			puesto: estado.futbolista.puesto,
			numero: estado.futbolista.numero
		}
	};
};

export const actions: Actions = {
	default: async ({ params, request, cookies }) => {
		const partida = obtenerDb()
			.select()
			.from(partidas)
			.where(eq(partidas.codigo, params.codigo.toUpperCase().trim()))
			.get();
		if (!partida) return fail(400, { problema: 'No existe ninguna partida con ese código.' });

		// El nombre no se pide: es el del personaje que quedó libre, que se eligió
		// al crear la partida.
		const presentes = obtenerDb()
			.select()
			.from(jugadores)
			.where(eq(jugadores.partidaId, partida.id))
			.all();
		const libre = ROLES.find((r) => !presentes.some((j) => j.rol === r));
		const estado = JSON.parse(partida.estadoJson) as Estado;
		const nombre =
			libre === 'representante' ? estado.representante.nombre : estado.futbolista.nombre;

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
