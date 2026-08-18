import { beforeEach, describe, expect, it } from 'vitest';
import { crearDb, migrarDb, type Db } from './db/cliente';
import {
	crearPartida,
	enviarDecision,
	ErrorDePartida,
	tirarOcasion,
	unirseAPartida,
	vistaPara
} from './partidas';
import { log } from './db/schema';
import { quienesDeciden } from '$lib/engine/fases';
import type { ConfigPartida } from '$lib/engine/estado';

const CONFIG: ConfigPartida = {
	futbolista: {
		nombre: 'Damián Correa',
		nacionalidad: 'Argentina',
		puesto: 'centrodelantero',
		numero: 9,
		pie: 'derecho',
		edadInicial: 16,
		clubId: 'ar-huracan'
	},
	representante: { nombre: 'Sin representante' }
};

let db: Db;

/** Una partida con los dos jugadores adentro, lista para jugar. */
function partidaCompleta() {
	const { codigo, token: tokenFutbolista } = crearPartida(db, CONFIG, 'futbolista', 'Alan', 2026);
	const tokenRepresentante = unirseAPartida(db, codigo, 'Hernán');
	return { codigo, tokenFutbolista, tokenRepresentante };
}

/**
 * Juega una temporada entera respetando los turnos.
 *
 * No cuenta fases: manda la decisión del que le toca hasta que arranque la
 * temporada siguiente. En el mercado juega uno por vez —el representante
 * filtra y después elige el futbolista—, así que mandar las dos siempre no
 * solo sobra: el servidor rechaza la del que está esperando.
 */
function unaTemporada(tokens: { tokenFutbolista: string; tokenRepresentante: string }) {
	const desde = vistaPara(db, tokens.tokenFutbolista)!.estado.temporada;
	for (let vueltas = 0; vueltas < 12; vueltas++) {
		const vista = vistaPara(db, tokens.tokenFutbolista)!;
		if (vista.estado.carreraTerminada || vista.estado.temporada !== desde) return;
		for (const rol of quienesDeciden(vista.estado)) {
			const token = rol === 'futbolista' ? tokens.tokenFutbolista : tokens.tokenRepresentante;
			jugarSusMomentos(token);
			enviarDecision(db, token, { rol, nota: '' });
		}
	}
}

/**
 * Tira todos los momentos que le toquen a ese jugador.
 *
 * Hace falta porque los momentos son obligatorios: sin jugarlos no se cierra la
 * fase. Antes se podía cerrar de una y quedaban resueltos por defecto, que es
 * exactamente el agujero que encontró Alan.
 */
function jugarSusMomentos(token: string) {
	const vista = vistaPara(db, token)!;
	const suyos = vista.opciones.ocasiones ?? vista.opciones.momentos ?? [];
	for (let i = vista.tiradas.length; i < suyos.length; i++) {
		tirarOcasion(db, token, i, suyos[i].opciones[0].id);
	}
}

beforeEach(() => {
	db = crearDb(':memory:');
	migrarDb(db);
});

describe('crear y entrar', () => {
	it('crea la partida con un código de 6 caracteres y deja el otro rol libre', () => {
		const { codigo, token } = crearPartida(db, CONFIG, 'futbolista', 'Alan', 2026);

		expect(codigo).toMatch(/^[A-Z0-9]{6}$/);

		const vista = vistaPara(db, token)!;
		expect(vista.rol).toBe('futbolista');
		expect(vista.elOtro).toBeNull();
	});

	it('el segundo jugador toma el rol que quedó libre', () => {
		const { tokenFutbolista, tokenRepresentante } = partidaCompleta();

		expect(vistaPara(db, tokenRepresentante)!.rol).toBe('representante');
		expect(vistaPara(db, tokenFutbolista)!.elOtro).toEqual({
			rol: 'representante',
			nombre: 'Hernán'
		});
	});

	it('el representante que entra le pone su nombre al del juego', () => {
		const { tokenRepresentante } = partidaCompleta();
		expect(vistaPara(db, tokenRepresentante)!.estado.representante.nombre).toBe('Hernán');
	});

	it('no deja entrar a un tercero', () => {
		const { codigo } = partidaCompleta();
		expect(() => unirseAPartida(db, codigo, 'Otro')).toThrow(ErrorDePartida);
	});

	it('rechaza un código que no existe', () => {
		expect(() => unirseAPartida(db, 'NOEXIS', 'Alguien')).toThrow(ErrorDePartida);
	});

	it('acepta el código en minúsculas', () => {
		const { codigo } = crearPartida(db, CONFIG, 'futbolista', 'Alan', 2026);
		expect(() => unirseAPartida(db, codigo.toLowerCase(), 'Hernán')).not.toThrow();
	});

	it('devuelve null para un token inventado', () => {
		expect(vistaPara(db, 'token-que-no-existe')).toBeNull();
	});
});

describe('la barrera', () => {
	it('no avanza con una sola decisión', () => {
		const { tokenFutbolista } = partidaCompleta();

		const resultado = enviarDecision(db, tokenFutbolista, { rol: 'futbolista', nota: '' });

		expect(resultado.faseCerrada).toBe(false);
		expect(resultado.sincronizacion).toBe('WAITING_FOR_AGENT');
		expect(vistaPara(db, tokenFutbolista)!.estado.fase).toBe(1);
	});

	it('avanza cuando llegan las dos', () => {
		const { tokenFutbolista, tokenRepresentante } = partidaCompleta();

		enviarDecision(db, tokenFutbolista, { rol: 'futbolista', nota: '' });
		const resultado = enviarDecision(db, tokenRepresentante, { rol: 'representante', nota: '' });

		expect(resultado.faseCerrada).toBe(true);
		expect(vistaPara(db, tokenFutbolista)!.estado.fase).toBe(2);
	});

	it('avanza igual sin importar quién manda primero', () => {
		const a = partidaCompleta();
		enviarDecision(db, a.tokenFutbolista, { rol: 'futbolista', nota: '' });
		enviarDecision(db, a.tokenRepresentante, { rol: 'representante', nota: '' });

		const b = partidaCompleta();
		enviarDecision(db, b.tokenRepresentante, { rol: 'representante', nota: '' });
		enviarDecision(db, b.tokenFutbolista, { rol: 'futbolista', nota: '' });

		expect(vistaPara(db, a.tokenFutbolista)!.estado.fase).toBe(
			vistaPara(db, b.tokenFutbolista)!.estado.fase
		);
	});

	it('es idempotente: mandar dos veces no adelanta la fase', () => {
		const { tokenFutbolista } = partidaCompleta();

		enviarDecision(db, tokenFutbolista, { rol: 'futbolista', nota: 'primera' });
		const segunda = enviarDecision(db, tokenFutbolista, { rol: 'futbolista', nota: 'segunda' });

		expect(segunda.faseCerrada).toBe(false);
		expect(vistaPara(db, tokenFutbolista)!.estado.fase).toBe(1);
	});

	it('no deja decidir por el otro rol', () => {
		const { tokenFutbolista } = partidaCompleta();
		expect(() =>
			enviarDecision(db, tokenFutbolista, { rol: 'representante', nota: 'no soy yo' })
		).toThrow(ErrorDePartida);
	});

	it('no deja jugar hasta que estén los dos', () => {
		const { token } = crearPartida(db, CONFIG, 'futbolista', 'Alan', 2026);
		expect(() => enviarDecision(db, token, { rol: 'futbolista', nota: '' })).toThrow(
			ErrorDePartida
		);
	});

	it('cierra la temporada cuando se jugaron todas sus fases', () => {
		const { tokenFutbolista, tokenRepresentante } = partidaCompleta();

		unaTemporada({ tokenFutbolista, tokenRepresentante });

		const vista = vistaPara(db, tokenFutbolista)!;
		expect(vista.estado.temporada).toBe(2);
		expect(vista.estado.fase).toBe(1);
		expect(vista.estado.futbolista.edad).toBe(17);
	});

	it('marca yaCerre solo para quien cerró', () => {
		const { tokenFutbolista, tokenRepresentante } = partidaCompleta();

		enviarDecision(db, tokenFutbolista, { rol: 'futbolista', nota: '' });

		expect(vistaPara(db, tokenFutbolista)!.yaCerre).toBe(true);
		expect(vistaPara(db, tokenRepresentante)!.yaCerre).toBe(false);
	});
});

/*
 * La pantalla vieja.
 *
 * Alan lo vio jugando: "el futbolista todavía no eligió y al repre le aparece
 * que YA se cerró el acuerdo del 5%". La barrera estaba bien; lo que estaba
 * mal era que una pestaña abierta desde antes seguía mostrando la fase
 * anterior y su formulario llegaba igual, con los campos de otra pantalla, y
 * se guardaba como decisión de la fase actual. Pasa de verdad cuando el otro
 * usa "avanzar sin esperar", porque la fase cambia sin que vos toques nada.
 */
describe('la pantalla que quedó vieja', () => {
	it('rechaza una decisión mandada desde una fase anterior', () => {
		const { tokenFutbolista, tokenRepresentante } = partidaCompleta();

		// La fase 1 se cierra entre los dos: el futbolista queda en la fase 2.
		enviarDecision(db, tokenFutbolista, { rol: 'futbolista', nota: '' }, { deLaFase: 1 });
		enviarDecision(db, tokenRepresentante, { rol: 'representante', nota: '' }, { deLaFase: 1 });
		expect(vistaPara(db, tokenFutbolista)!.estado.fase).toBe(2);

		// Y una pestaña que todavía muestra la fase 1 manda lo suyo.
		try {
			enviarDecision(db, tokenFutbolista, { rol: 'futbolista', nota: 'vieja' }, { deLaFase: 1 });
			throw new Error('tendría que haber fallado');
		} catch (e) {
			expect(e).toBeInstanceOf(ErrorDePartida);
			// El código es el que hace que la pantalla se recargue en el acto.
			expect((e as ErrorDePartida).codigo).toBe('pantalla-vieja');
		}
	});

	it('rechaza una decisión mandada desde la temporada anterior', () => {
		const { tokenFutbolista, tokenRepresentante } = partidaCompleta();

		unaTemporada({ tokenFutbolista, tokenRepresentante });
		expect(vistaPara(db, tokenFutbolista)!.estado.temporada).toBe(2);

		expect(() =>
			enviarDecision(
				db,
				tokenFutbolista,
				{ rol: 'futbolista', nota: 'del año pasado' },
				{ deLaFase: 1, deLaTemporada: 1 }
			)
		).toThrow(ErrorDePartida);
	});

	it('la decisión de la pantalla al día pasa sin problema', () => {
		const { tokenFutbolista } = partidaCompleta();

		const r = enviarDecision(
			db,
			tokenFutbolista,
			{ rol: 'futbolista', nota: 'al día' },
			{ deLaFase: 1, deLaTemporada: 1 }
		);

		expect(r.faseCerrada).toBe(false);
		expect(vistaPara(db, tokenFutbolista)!.yaCerre).toBe(true);
	});

	/*
	 * Sin los campos, todo sigue andando: los clientes viejos —una pestaña
	 * cargada antes de este deploy— no se quedan afuera.
	 */
	it('sin los campos de la pantalla no rechaza nada', () => {
		const { tokenFutbolista } = partidaCompleta();
		expect(() =>
			enviarDecision(db, tokenFutbolista, { rol: 'futbolista', nota: '' })
		).not.toThrow();
	});
});

describe('información por rol', () => {
	it('cada uno ve solo lo suyo y lo compartido', () => {
		const { tokenFutbolista, tokenRepresentante } = partidaCompleta();
		const partidaId = db.select().from(log).all()[0].partidaId;

		db.insert(log)
			.values([
				{
					partidaId,
					temporada: 1,
					fase: 1,
					tipo: 'prueba',
					visiblePara: 'futbolista',
					texto: 'SOLO-FUTBOLISTA'
				},
				{
					partidaId,
					temporada: 1,
					fase: 1,
					tipo: 'prueba',
					visiblePara: 'representante',
					texto: 'SOLO-REPRESENTANTE'
				},
				{
					partidaId,
					temporada: 1,
					fase: 1,
					tipo: 'prueba',
					visiblePara: 'ambos',
					texto: 'PARA-LOS-DOS'
				}
			])
			.run();

		const textosFutbolista = vistaPara(db, tokenFutbolista)!.diario.map((e) => e.texto);
		const textosRepresentante = vistaPara(db, tokenRepresentante)!.diario.map((e) => e.texto);

		expect(textosFutbolista).toContain('SOLO-FUTBOLISTA');
		expect(textosFutbolista).toContain('PARA-LOS-DOS');
		expect(textosFutbolista).not.toContain('SOLO-REPRESENTANTE');

		expect(textosRepresentante).toContain('SOLO-REPRESENTANTE');
		expect(textosRepresentante).toContain('PARA-LOS-DOS');
		expect(textosRepresentante).not.toContain('SOLO-FUTBOLISTA');
	});

	it('los ingresos de cada uno son privados', () => {
		const { tokenFutbolista, tokenRepresentante } = partidaCompleta();

		unaTemporada({ tokenFutbolista, tokenRepresentante });

		const delFutbolista = vistaPara(db, tokenFutbolista)!.diario.filter(
			(e) => e.tipo === 'ingresos'
		);
		const delRepresentante = vistaPara(db, tokenRepresentante)!.diario.filter(
			(e) => e.tipo === 'ingresos'
		);

		expect(delFutbolista).toHaveLength(1);
		expect(delRepresentante).toHaveLength(1);
		expect(delFutbolista[0].texto).not.toEqual(delRepresentante[0].texto);
	});

	it('la nota de una fase abierta no se ve hasta que cierra', () => {
		const { tokenFutbolista, tokenRepresentante } = partidaCompleta();

		enviarDecision(db, tokenFutbolista, { rol: 'futbolista', nota: 'ME QUIERO IR' });

		expect(
			vistaPara(db, tokenRepresentante)!.diario.some((e) => e.texto.includes('ME QUIERO IR'))
		).toBe(false);

		enviarDecision(db, tokenRepresentante, { rol: 'representante', nota: '' });

		expect(
			vistaPara(db, tokenRepresentante)!.diario.some((e) => e.texto.includes('ME QUIERO IR'))
		).toBe(true);
	});
});
