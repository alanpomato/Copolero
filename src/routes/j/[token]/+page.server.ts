import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { enviarDecision, ErrorDePartida, tocarJugador, vistaPara } from '$lib/server/partidas';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, cookies }) => {
	const vista = vistaPara(db, params.token);
	if (!vista) error(404, 'Ese link no corresponde a ninguna partida.');

	tocarJugador(db, params.token);

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
	cerrarFase: async ({ params, request }) => {
		const datos = await request.formData();
		const nota = String(datos.get('nota') ?? '')
			.trim()
			.slice(0, 280);

		const vista = vistaPara(db, params.token);
		if (!vista) error(404, 'Ese link no corresponde a ninguna partida.');

		try {
			const resultado = enviarDecision(db, params.token, { rol: vista.rol, nota });
			return { faseCerrada: resultado.faseCerrada };
		} catch (e) {
			const mensaje = e instanceof ErrorDePartida ? e.message : 'No se pudo cerrar la fase.';
			return fail(400, { problema: mensaje });
		}
	}
};
