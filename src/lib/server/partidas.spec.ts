import { beforeEach, describe, expect, it } from 'vitest';
import { crearDb, migrarDb, type Db } from './db/cliente';
import {
	crearPartida,
	enviarDecision,
	ErrorDePartida,
	unirseAPartida,
	vistaPara
} from './partidas';
import { log } from './db/schema';
import type { ConfigPartida } from '$lib/engine/estado';

const CONFIG: ConfigPartida = {
	futbolista: {
		nombre: 'Damián Correa',
		nacionalidad: 'Argentina',
		posicion: 'delantero',
		edadInicial: 16,
		club: 'Huracán'
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

	it('cierra la temporada después de las tres fases', () => {
		const { tokenFutbolista, tokenRepresentante } = partidaCompleta();

		for (let fase = 0; fase < 3; fase++) {
			enviarDecision(db, tokenFutbolista, { rol: 'futbolista', nota: '' });
			enviarDecision(db, tokenRepresentante, { rol: 'representante', nota: '' });
		}

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

		for (let fase = 0; fase < 3; fase++) {
			enviarDecision(db, tokenFutbolista, { rol: 'futbolista', nota: '' });
			enviarDecision(db, tokenRepresentante, { rol: 'representante', nota: '' });
		}

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
