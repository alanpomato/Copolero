import { describe, expect, it } from 'vitest';
import { estadoInicial, media } from './estado';
import { resolverFase } from './fases';
import { aplicarPase, ofertasPara } from './pases';
import { resumirRetiro } from './retiro';
import { brechaCon, crecerPorJugar } from './temporada';
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

	const salarioInicial = estado.futbolista.contrato.salarioMensual;
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

	return { estado, clubes, notas, temporadas: vueltas, salarioInicial };
}

function promedio(ns: number[]): number {
	return ns.reduce((a, b) => a + b, 0) / Math.max(1, ns.length);
}

const AMBICIOSO: Estrategia = { intensidad: 'a-matar', mejoraMinima: 1.3, gestion: 'renovar' };
const PRUDENTE: Estrategia = { intensidad: 'suave', mejoraMinima: 3, gestion: 'acompanar' };
/**
 * El que no se mueve nunca por su cuenta.
 *
 * `mejoraMinima: Infinity` es literal: ninguna oferta le alcanza. Hace falta
 * porque PRUDENTE no modela lealtad —con el sueldo de un pibe, cualquier oferta
 * supera el triple— y para medir lo que paga quedarse hay que tener a alguien
 * que de verdad se quede.
 */
const FIEL: Estrategia = { intensidad: 'firme', mejoraMinima: Infinity, gestion: 'acompanar' };

/**
 * El que prioriza jugar por encima de la plata.
 *
 * `mejoraMinima: Infinity` es parte de la definición y no un detalle: este es
 * el que se mueve **solo** cuando no juega. Cuando además perseguía cualquier
 * oferta un 30% mejor terminaba en diez clubes distintos, perdía el
 * multiplicador de permanencia y puntuaba peor que el que no hacía nada. Eso no
 * medía la salida del banco, medía una mala estrategia de plata.
 */
const BUSCA_JUGAR: Estrategia = {
	intensidad: 'firme',
	mejoraMinima: Infinity,
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
		// Sobre varias semillas y no sobre una.
		//
		// Es una afirmación de balance, y una carrera tiene demasiado azar como
		// para que una sola partida la pruebe: hay semillas donde el que se cuida
		// llega igual de alto, y está bien que las haya. Lo que tiene que ser
		// cierto es la tendencia. Cuando esto se medía con una sola semilla, el
		// test pasaba o fallaba según qué otra cosa del motor hubiera movido el
		// azar, que es la peor clase de test que hay.
		const pico = (r: ReturnType<typeof correrCarrera>) =>
			Math.max(...r.estado.historial.map((h) => h.media));

		let gana = 0;
		const semillas = ['c2', 'c2b', 'c2c', 'c2d', 'c2e', 'c2f', 'c2g'];
		for (const s of semillas) {
			const roto = correrCarrera(s, 'centrodelantero', 'ar2-moron', AMBICIOSO);
			const entero = correrCarrera(s, 'centrodelantero', 'ar2-moron', PRUDENTE);
			if (pico(roto) >= pico(entero)) gana++;
		}
		expect(gana).toBeGreaterThanOrEqual(semillas.length - 2);
	});

	it('quedarse quieto ya no es cobrar siempre lo mismo', () => {
		// Sin renovación, el que nunca se movía cobraba su primer sueldo hasta el
		// retiro. Era el agujero que hacía que no moverse fuera insostenible por
		// razones equivocadas.
		const { estado, salarioInicial } = correrCarrera(
			'quieto',
			'centrodelantero',
			'ar-huracan',
			PRUDENTE
		);
		expect(estado.futbolista.contrato.salarioMensual).toBeGreaterThan(salarioInicial * 1.5);
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

	it('la carrera tiene forma: sube, hace pico y baja', () => {
		const { estado } = correrCarrera('arco', 'centrodelantero', 'ar2-moron', BUSCA_JUGAR);
		const h = estado.historial;
		expect(h.length).toBeGreaterThan(10);

		const inicial = h[0].media;
		const pico = Math.max(...h.map((x) => x.media));
		const final = h[h.length - 1].media;

		// Sin esto la carrera es plana y no hay motivo para jugar la temporada
		// doce: el jugador termina igual que como empezó.
		expect(pico - inicial).toBeGreaterThan(12);
		// Y el pico llega jugando, no de arranque.
		const cuandoElPico = h.findIndex((x) => x.media === pico);
		expect(cuandoElPico).toBeGreaterThan(3);
		// Después de los 30 el cuerpo se lo lleva.
		expect(final).toBeLessThan(pico);
	});

	it('jugar es lo que te hace mejor, y no jugar no te hace nada', () => {
		// La regla, medida de frente: el mismo jugador, la misma semilla, y lo
		// único distinto son los minutos que jugó.
		//
		// Antes esto se medía comparando tramos de una misma carrera, y no servía:
		// los años de muchos minutos son también los años de más margen al techo y
		// de mejor edad, así que la comparación mezclaba tres cosas y a veces
		// empataba. Acá no hay nada más que cambie.
		function crecio(minutos: number): number {
			const e = estadoInicial(
				{
					futbolista: {
						nombre: 'Damián Correa',
						nacionalidad: 'Argentina',
						puesto: 'centrodelantero',
						numero: 9,
						pie: 'derecho',
						edadInicial: 18,
						clubId: 'ar2-moron'
					},
					representante: { nombre: 'Alan' }
				},
				rngPara('minutos', { temporada: 0, fase: 1, clave: 'inicio' }),
				2026
			);
			e.futbolista.potencial = 90;
			const antes = media(e.futbolista.atributos, e.futbolista.posicion);
			crecerPorJugar(
				e,
				{ minutos, nota: 6.5 },
				rngPara('minutos', {
					temporada: 1,
					fase: 2,
					clave: 'crecer'
				})
			);
			return media(e.futbolista.atributos, e.futbolista.posicion) - antes;
		}

		const jugandoTodo = crecio(2400);
		const desdeElBanco = crecio(150);

		expect(jugandoTodo).toBeGreaterThan(desdeElBanco);
		expect(desdeElBanco).toBeLessThanOrEqual(1);
		// Y el que no entró nunca no aprende nada.
		expect(crecio(0)).toBe(0);
	});

	it('irse a una liga grande no te hace peor jugador', () => {
		// El test que más falta hacía. Medí treinta carreras del que nunca se mueve
		// del Ascenso y treinta del que agarra siempre la liga más fuerte: con el
		// mismo potencial —77,8— el que se quedaba terminaba en media 73 y el que
		// subía en 60,8. Doce puntos de castigo por hacer justo lo que el juego
		// entero te invita a hacer.
		//
		// Se medía acá y no en una carrera entera porque en una carrera se mezclan
		// la edad, el techo que queda y la suerte del mercado. Acá es el mismo
		// jugador, el mismo año y el mismo azar; lo único que cambia es dónde juega
		// y cuánto.
		function crecio(clubId: string, minutos: number, nota: number): number {
			const e = estadoInicial(
				{
					futbolista: {
						nombre: 'Damián Correa',
						nacionalidad: 'Argentina',
						puesto: 'centrodelantero',
						numero: 9,
						pie: 'derecho',
						edadInicial: 20,
						clubId
					},
					representante: { nombre: 'Alan' }
				},
				rngPara('liga', { temporada: 0, fase: 1, clave: 'inicio' }),
				2026
			);
			e.futbolista.potencial = 92;
			const antes = media(e.futbolista.atributos, e.futbolista.posicion);
			crecerPorJugar(
				e,
				{ minutos, nota },
				rngPara('liga', { temporada: 1, fase: 2, clave: 'crecer' })
			);
			return media(e.futbolista.atributos, e.futbolista.posicion) - antes;
		}

		// El Ascenso (fuerza 45) contra una liga grande (fuerza 92). Las notas son
		// las medidas de verdad en cada camino: arriba se juega peor.
		const figuraDelAscenso = crecio('ar2-moron', 2400, 7.4);
		const suplenteEnEuropa = crecio('es-realmadrid', 1100, 6.5);
		const titularEnEuropa = crecio('es-realmadrid', 2400, 6.5);

		// Media temporada arriba tiene que rendir parecido a una entera abajo: son
		// dos caminos válidos y ninguno puede ser una trampa.
		expect(suplenteEnEuropa).toBeGreaterThan(figuraDelAscenso * 0.7);

		// Y jugarlo todo arriba tiene que ser lo mejor que le puede pasar a una
		// carrera. Si esto se rompe, el mercado deja de tener sentido.
		expect(titularEnEuropa).toBeGreaterThan(figuraDelAscenso);
		expect(titularEnEuropa).toBeGreaterThan(suplenteEnEuropa);
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
		// Los dos arrancan donde pueden sostener el puesto. Si arrancan en un club
		// que les queda grande, el "fiel" no es fiel: se queda sin contrato y el
		// mercado lo mueve igual, que es otra cosa y se prueba aparte.
		const fiel = correrCarrera('fiel', 'centrodelantero', 'ar2-moron', FIEL);
		const trotamundos = correrCarrera('fiel', 'centrodelantero', 'ar2-moron', AMBICIOSO);

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
		// También sobre varias semillas: es la salida del que arrancó en un club
		// que le queda grande, y tiene que valer la pena casi siempre, no una vez.
		//
		// Lo que se compara es el puntaje final y ya no los partidos jugados. La
		// razón es un cambio del motor y no un ablande del test: desde que al que
		// se le termina el contrato el mercado le consigue equipo, nadie se queda
		// quince años en el banco sin jugar. Los dos terminan jugando parecido; lo
		// que los separa es dónde. El que elige bajar llega negociando y en
		// condiciones; al que lo bajan lo firman apurado, tarde y como al que
		// nadie quería.
		const semillas = ['grande', 'grande2', 'grande3', 'grande4', 'grande5'];
		let mejorPuntaje = 0;

		for (const s of semillas) {
			const seQueda = correrCarrera(s, 'centrodelantero', 'ar-river', PRUDENTE);
			const baja = correrCarrera(s, 'centrodelantero', 'ar-river', BUSCA_JUGAR);
			if (
				resumirRetiro(baja.estado).futbolista.total > resumirRetiro(seQueda.estado).futbolista.total
			) {
				mejorPuntaje++;
			}
		}

		expect(mejorPuntaje).toBeGreaterThanOrEqual(semillas.length - 1);
	});

	it('las temporadas por club suman lo que se jugó', () => {
		const { estado, temporadas } = correrCarrera('conteo', 'central', 'ar2-ferro', AMBICIOSO);
		const total = Object.values(estado.temporadasPorClub).reduce((a, b) => a + b, 0);
		expect(total).toBe(temporadas);
	});
});
