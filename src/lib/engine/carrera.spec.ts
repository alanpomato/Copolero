import { describe, expect, it } from 'vitest';
import { estadoInicial, media } from './estado';
import { resolverFase } from './fases';
import { aplicarPase, ofertasPara } from './pases';
import { resumirRetiro } from './retiro';
import { brechaCon } from './temporada';
import { rngPara } from './rng';
import { contexto } from '../../../content/mundo';
import { PUESTOS, puesto } from './puestos';
import type { Decision, Estado } from './tipos';

/**
 * Carreras enteras, de punta a punta.
 *
 * Estos tests no verifican una fórmula: verifican que una carrera completa se
 * sienta como una carrera. Que el pibe suba, que el veterano baje, que el
 * cuerpo se termine antes que las ganas, y que ninguna de las dos formas de
 * jugar —cuidarse o romperse— sea la obvia. Es la red que avisa cuando un
 * número tocado por balance rompe el arco entero.
 */

type Estrategia = {
	intensidad: string;
	/** Si acepta el mejor pase disponible, y con qué exigencia de mejora. */
	mejoraMinima: number;
	gestion: string;
	/** Si prefiere jugar antes que cobrar. */
	priorizaJugar?: boolean;
	/** Qué contrato de representación firman cuando toca renegociar. */
	trato?: string;
};

function correrCarrera(
	semilla: string,
	puestoId: string,
	clubInicial: string,
	estrategia: Estrategia
) {
	let estado: Estado = estadoInicial(
		{
			futbolista: {
				nombre: 'Damián Correa',
				nacionalidad: 'Argentina',
				puesto: puestoId,
				numero: puesto(puestoId).numero,
				pie: 'derecho',
				edadInicial: 16,
				clubId: clubInicial
			},
			representante: { nombre: 'Alan' }
		},
		rngPara(semilla, { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);

	const clubes = [clubInicial];
	const notas: number[] = [];
	let vueltas = 0;

	while (!estado.carreraTerminada && vueltas < 30) {
		for (const fase of [1, 2, 3] as const) {
			let destino = 'quedarse';
			if (fase === 3) {
				const ofertas = ofertasPara(estado, semilla);
				const enElBanco = brechaCon(estado.futbolista, estado.futbolista.contrato.clubId) < -6;

				if (estrategia.priorizaJugar && enElBanco) {
					const dondeJuega = [...ofertas].sort((a, b) => b.brecha - a.brecha)[0];
					if (dondeJuega && dondeJuega.brecha > 0) destino = dondeJuega.clubId;
				} else {
					const mejor = ofertas
						.filter((o) => o.brecha > -6)
						.sort((a, b) => b.salarioMensual - a.salarioMensual)[0];
					if (
						mejor &&
						mejor.salarioMensual >
							estado.futbolista.contrato.salarioMensual * estrategia.mejoraMinima
					) {
						destino = mejor.clubId;
					}
				}
			}

			const decisiones: Decision[] = [
				{
					rol: 'futbolista',
					nota: '',
					intensidad: estrategia.intensidad,
					destino,
					// El futbolista acepta lo que el representante pida.
					trato: 'socios'
				},
				{
					rol: 'representante',
					nota: '',
					gestion: estrategia.gestion,
					destino,
					trato: estrategia.trato
				}
			];
			estado = resolverFase(estado, decisiones, semilla).estado;
		}

		const resumen = estado.ultimaTemporada!;
		notas.push(resumen.nota);
		if (clubes[clubes.length - 1] !== estado.futbolista.contrato.clubId) {
			clubes.push(estado.futbolista.contrato.clubId);
		}
		vueltas++;
	}

	return { estado, clubes, notas, temporadas: vueltas };
}

const AMBICIOSO: Estrategia = { intensidad: 'a-matar', mejoraMinima: 1.3, gestion: 'renovar' };
const PRUDENTE: Estrategia = { intensidad: 'suave', mejoraMinima: 3, gestion: 'acompanar' };
/** El que prioriza jugar por encima de la plata. */
const BUSCA_JUGAR: Estrategia = {
	intensidad: 'firme',
	mejoraMinima: 1.3,
	gestion: 'acompanar',
	priorizaJugar: true
};

describe('una carrera entera', () => {
	it('termina sola, y ni muy corta ni eterna', () => {
		const { estado, temporadas } = correrCarrera('c1', 'centrodelantero', 'ar2-moron', AMBICIOSO);

		expect(estado.carreraTerminada).toBe(true);
		expect(temporadas).toBeGreaterThan(9);
		expect(temporadas).toBeLessThanOrEqual(24);
		expect(estado.futbolista.edad).toBeGreaterThanOrEqual(28);
		expect(estado.futbolista.edad).toBeLessThanOrEqual(41);
	});

	it('el que se cuida dura más que el que se rompe', () => {
		const roto = correrCarrera('c2', 'centrodelantero', 'ar2-moron', AMBICIOSO);
		const entero = correrCarrera('c2', 'centrodelantero', 'ar2-moron', PRUDENTE);

		expect(entero.estado.futbolista.edad).toBeGreaterThan(roto.estado.futbolista.edad);
	});

	it('pero el que se rompe llega más arriba', () => {
		const roto = correrCarrera('c2', 'centrodelantero', 'ar2-moron', AMBICIOSO);
		const entero = correrCarrera('c2', 'centrodelantero', 'ar2-moron', PRUDENTE);

		const techo = (r: typeof roto) => Math.max(...r.clubes.map((c) => contexto(c).liga.fuerza));
		expect(techo(roto)).toBeGreaterThanOrEqual(techo(entero));
		expect(roto.estado.futbolista.dineroUsd).toBeGreaterThan(entero.estado.futbolista.dineroUsd);
	});

	it('el que arranca en el Ascenso puede terminar en otra liga', () => {
		const { clubes } = correrCarrera('c3', 'centrodelantero', 'ar2-moron', AMBICIOSO);
		expect(clubes.length).toBeGreaterThan(1);
		expect(contexto(clubes[clubes.length - 1]).liga.id).not.toBe('ar-2');
	});

	it('la media sube de joven y se frena de grande', () => {
		const { estado } = correrCarrera('c4', 'enganche', 'ar2-moron', AMBICIOSO);
		const final = media(estado.futbolista.atributos, estado.futbolista.posicion);
		expect(final).toBeGreaterThan(50);
		// El potencial es un techo de verdad: nadie lo pasa por mucho.
		expect(final).toBeLessThan(estado.futbolista.potencial + 12);
	});

	it('el representante termina con plata y con prestigio', () => {
		const { estado } = correrCarrera('c5', 'centrodelantero', 'ar2-moron', AMBICIOSO);
		expect(estado.representante.dineroUsd).toBeGreaterThan(50_000);
		expect(estado.representante.prestigio).toBeGreaterThan(10);
	});

	it('las notas se mueven: no es siempre 5 ni siempre 9', () => {
		const { notas } = correrCarrera('c6', 'centrodelantero', 'ar2-moron', AMBICIOSO);
		expect(Math.max(...notas) - Math.min(...notas)).toBeGreaterThan(1.5);
		for (const nota of notas) {
			expect(nota).toBeGreaterThanOrEqual(1);
			expect(nota).toBeLessThanOrEqual(10);
		}
	});

	it('la misma semilla da la misma carrera', () => {
		const a = correrCarrera('igual', 'central', 'ar2-ferro', AMBICIOSO);
		const b = correrCarrera('igual', 'central', 'ar2-ferro', AMBICIOSO);
		expect(a.clubes).toEqual(b.clubes);
		expect(a.notas).toEqual(b.notas);
		expect(a.estado).toEqual(b.estado);
	});

	it('los once puestos llegan al final sin romperse', () => {
		for (const p of PUESTOS) {
			const { estado, temporadas } = correrCarrera(`p-${p.id}`, p.id, 'ar2-moron', AMBICIOSO);
			expect(estado.carreraTerminada, p.nombre).toBe(true);
			expect(temporadas, p.nombre).toBeGreaterThan(6);
		}
	});
});

describe('el final de la carrera', () => {
	it('el que se queda en un club puntúa más que el que se mueve siempre', () => {
		const fiel = correrCarrera('fiel', 'centrodelantero', 'ar-huracan', PRUDENTE);
		const trotamundos = correrCarrera('fiel', 'centrodelantero', 'ar-huracan', AMBICIOSO);

		expect(fiel.clubes.length).toBeLessThan(trotamundos.clubes.length);

		const suyo = resumirRetiro(fiel.estado);
		const delOtro = resumirRetiro(trotamundos.estado);
		// El multiplicador de permanencia es el que hace que quedarse valga.
		expect(suyo.futbolista.multiplicador).toBeGreaterThan(delOtro.futbolista.multiplicador);
	});

	it('mover al futbolista le deja al representante más plata', () => {
		// La tensión del juego, medida: dos carreras iguales en todo salvo la
		// política de pases.
		//
		// Lo que lo hace funcionar no son solo las comisiones: cada pase le sube
		// el prestigio, y el prestigio es lo que paga el fijo de todas las
		// temporadas siguientes. Mover compone.
		//
		// La diferencia es clara pero no enorme, y por un motivo que es del
		// juego y no del balance: una carrera que se queda en Argentina hace un
		// pase en veinte temporadas. Renovar sueldo todos los años sube la vara
		// que la próxima oferta tiene que superar, así que quedarse te hace más
		// difícil de mover. Eso está bien que sea así.
		const semillas = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
		const promedio = (estrategia: Estrategia) =>
			semillas
				.map((s) => correrCarrera(s, 'centrodelantero', 'ar-huracan', estrategia).estado)
				.reduce((total, e) => total + e.representante.dineroUsd, 0) / semillas.length;

		// Mismo entrenamiento, misma gestión y el mismo contrato entre ellos: lo
		// único que cambia es si acepta los pases o no.
		const base = { intensidad: 'firme', gestion: 'renovar', trato: 'fuerte' };
		const seMueve: Estrategia = { ...base, mejoraMinima: 1.25 };
		const seQueda: Estrategia = { ...base, mejoraMinima: 99 };

		expect(promedio(seMueve)).toBeGreaterThan(promedio(seQueda));
	});

	it('y cuánto más depende del contrato que negoció', () => {
		// Ésta es la gracia de la mesa: un representante barato casi no tiene
		// motivo para empujar un pase, y uno caro tiene todos. El porcentaje que
		// firmaron es lo que decide cuánto le importa mover a su jugador.
		const semillas = ['t1', 't2', 't3', 't4'];
		const conTrato = (trato: string) =>
			semillas
				.map(
					(s) =>
						correrCarrera(s, 'centrodelantero', 'ar-huracan', {
							intensidad: 'firme',
							gestion: 'renovar',
							mejoraMinima: 1.25,
							trato
						}).estado
				)
				.reduce((total, e) => total + e.representante.dineroUsd, 0) / semillas.length;

		expect(conTrato('fuerte')).toBeGreaterThan(conTrato('minimo'));
	});

	it('cada pase le deja una comisión al representante', () => {
		// El mecanismo, aparte de la estrategia.
		const estado = estadoInicial(
			{
				futbolista: {
					nombre: 'Damián Correa',
					nacionalidad: 'Argentina',
					puesto: 'centrodelantero',
					numero: 9,
					pie: 'derecho',
					edadInicial: 16,
					clubId: 'ar-huracan'
				},
				representante: { nombre: 'Alan' }
			},
			rngPara('comision', { temporada: 0, fase: 1, clave: 'inicio' }),
			2026
		);

		const ofertas = ofertasPara(estado, 'comision');
		expect(ofertas.length).toBeGreaterThan(0);

		for (const oferta of ofertas) {
			const esperada = Math.round(
				(oferta.montoUsd * estado.contratoRepresentacion.pctTransferencia) / 100
			);
			expect(oferta.comisionUsd, oferta.clubId).toBe(esperada);
			expect(oferta.comisionUsd, oferta.clubId).toBeGreaterThan(0);
		}

		// Y al aceptarlo, esa comisión entra en la caja.
		const antes = estado.representante.dineroUsd;
		const conPase = structuredClone(estado);
		aplicarPase(conPase, ofertas[0], []);
		expect(conPase.representante.dineroUsd).toBe(antes + ofertas[0].comisionUsd);
	});

	it('el puntaje tiene desglose y nunca es negativo', () => {
		for (const semilla of ['r1', 'r2', 'r3']) {
			const { estado } = correrCarrera(semilla, 'enganche', 'ar2-moron', AMBICIOSO);
			const retiro = resumirRetiro(estado);

			expect(retiro.futbolista.total, semilla).toBeGreaterThanOrEqual(0);
			expect(retiro.representante.total, semilla).toBeGreaterThanOrEqual(0);
			expect(retiro.futbolista.desglose.length, semilla).toBeGreaterThan(2);
			expect(retiro.futbolista.rango.titulo.length, semilla).toBeGreaterThan(3);
			expect(retiro.epitafio, semilla).toContain(estado.futbolista.nombre);
		}
	});

	it('meter más goles puntúa más', () => {
		const { estado } = correrCarrera('goles', 'centrodelantero', 'ar2-moron', AMBICIOSO);
		const antes = resumirRetiro(estado).futbolista.total;

		const conMas = structuredClone(estado);
		conMas.futbolista.goles += 40;
		expect(resumirRetiro(conMas).futbolista.total).toBeGreaterThan(antes);
	});

	it('el que no juega en su club recibe ofertas de clubes donde sí jugaría', () => {
		// Sin esto una carrera mal empezada no tiene arreglo: un pibe de 16 en un
		// club grande se queda quince años en el banco y nadie le ofrece nada,
		// porque las ofertas exigían pagar más. Ahora siempre hay salida hacia
		// abajo, y tomarla es una decisión: el futbolista vuelve a jugar y el
		// representante cobra menos.
		const estado = estadoInicial(
			{
				futbolista: {
					nombre: 'Damián Correa',
					nacionalidad: 'Argentina',
					puesto: 'centrodelantero',
					numero: 9,
					pie: 'derecho',
					edadInicial: 16,
					clubId: 'ar-river'
				},
				representante: { nombre: 'Alan' }
			},
			rngPara('banco', { temporada: 0, fase: 1, clave: 'inicio' }),
			2026
		);

		expect(brechaCon(estado.futbolista, 'ar-river')).toBeLessThan(-6);

		const ofertas = ofertasPara(estado, 'banco');
		expect(ofertas.length).toBeGreaterThan(0);
		for (const oferta of ofertas) {
			expect(oferta.brecha, `${oferta.clubId} lo sentaría igual`).toBeGreaterThan(0);
		}
	});

	it('bajar para jugar salva una carrera que arrancó demasiado arriba', () => {
		const seQueda = correrCarrera('grande', 'centrodelantero', 'ar-river', PRUDENTE);
		const baja = correrCarrera('grande', 'centrodelantero', 'ar-river', BUSCA_JUGAR);

		expect(baja.estado.futbolista.partidos).toBeGreaterThan(seQueda.estado.futbolista.partidos);
		expect(resumirRetiro(baja.estado).futbolista.total).toBeGreaterThan(
			resumirRetiro(seQueda.estado).futbolista.total
		);
	});

	it('las temporadas por club suman lo que se jugó', () => {
		const { estado, temporadas } = correrCarrera('conteo', 'central', 'ar2-ferro', AMBICIOSO);
		const total = Object.values(estado.temporadasPorClub).reduce((a, b) => a + b, 0);
		expect(total).toBe(temporadas);
	});
});
