import { describe, expect, it } from 'vitest';
import { estadoInicial } from './estado';
import { ocasionesDe } from './ocasiones';
import { momentosDelRepresentante } from './momentos';
import { rngPara } from './rng';
import type { Estado } from './tipos';

/**
 * Que una carrera no sea la misma temporada quince veces.
 *
 * "El juego está bien pero se siente plano y repetitivo", dijo Hernán. Medido,
 * tenía toda la razón y por un motivo concreto: la función que elegía los
 * momentos del año copiaba la lista a un array llamado `mezcla` y le hacía
 * `slice(0, 2)` sin mezclar nada. Salían siempre las dos primeras, las mismas
 * dieciocho temporadas seguidas: un delantero veía siete momentos distintos en
 * toda su carrera y dos de ellos eran la mitad de todo lo que le pasaba.
 *
 * Este test es el que hubiera cantado eso, así que queda para que no vuelva.
 */

function unaCarrera(puesto: string): Estado {
	return estadoInicial(
		{
			futbolista: {
				nombre: 'Damián Correa',
				nacionalidad: 'Argentina',
				puesto,
				numero: 9,
				pie: 'derecho',
				edadInicial: 16,
				clubId: 'ar-huracan'
			},
			representante: { nombre: 'Rubén Bravo' }
		},
		rngPara('var', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

/** Cuántas veces le tocó cada momento en una carrera entera. */
function loQueLePasa(e: Estado, deQuien: 'futbolista' | 'representante'): Record<string, number> {
	const cuenta: Record<string, number> = {};
	for (let t = 1; t <= 18; t++) {
		e.temporada = t;
		for (const fase of [2, 3] as const) {
			e.fase = fase;
			const momentos =
				deQuien === 'futbolista' ? ocasionesDe(e, 'var') : momentosDelRepresentante(e, 'var');
			for (const m of momentos) cuenta[m.id] = (cuenta[m.id] ?? 0) + 1;
		}
	}
	return cuenta;
}

const PUESTOS = ['centrodelantero', 'cinco', 'central', 'arquero'];

describe('la variedad de una carrera', () => {
	it('a un futbolista le pasan al menos dieciséis cosas distintas', () => {
		/*
		 * Eran diez. Alan pidió la batería —"hay que empezar a poner momentos más
		 * icónicos", "deberíamos tener 30 momentos y alternar"— y con treinta y
		 * tres plantillas por puesto una carrera de dieciocho temporadas veía
		 * veintiocho con tres ocasiones por temporada.
		 *
		 * Después Alan pidió bajar a dos momentos por año en total —uno en la
		 * temporada, uno en el mercado, en vez de tres y uno— para que cada uno
		 * pese más. Con menos tiradas por año la variedad absoluta baja con ellas
		 * —medido, 17 de 36—, así que el piso baja también, pero se mantiene bien
		 * por encima de "las mismas dos siempre", que es lo que este test canta.
		 */
		for (const puesto of PUESTOS) {
			const cuenta = loQueLePasa(unaCarrera(puesto), 'futbolista');
			expect(Object.keys(cuenta).length, puesto).toBeGreaterThanOrEqual(16);
		}
	});

	it('y ninguna se lleva más de un quinto de la carrera', () => {
		// El número exacto importa menos que el techo: si una sola cosa se lleva
		// un tercio de todo lo que te pasa en quince años, eso es lo que vas a
		// recordar del juego.
		for (const puesto of PUESTOS) {
			const cuenta = loQueLePasa(unaCarrera(puesto), 'futbolista');
			const total = Object.values(cuenta).reduce((a, b) => a + b, 0);
			const [masRepetida, veces] = Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0];
			expect(veces / total, `${puesto}: ${masRepetida}`).toBeLessThan(0.15);
		}
	});

	it('ninguna aparece todas las temporadas', () => {
		// El síntoma exacto del bug: `slice(0, 2)` sobre una lista sin mezclar.
		for (const puesto of PUESTOS) {
			const cuenta = loQueLePasa(unaCarrera(puesto), 'futbolista');
			for (const [id, veces] of Object.entries(cuenta)) {
				expect(veces, `${puesto}: ${id}`).toBeLessThan(18);
			}
		}
	});

	it('al representante también le pasan cosas distintas', () => {
		/*
		 * Eran cinco momentos en la temporada y tres en el mercado, y Alan lo
		 * midió jugando: "repre → tiene 2 momentos, deberíamos tener 20 momentos
		 * y alternar". Ahora son veinte en la temporada, repartidos en ocho
		 * familias.
		 *
		 * Después Alan pidió bajar a dos momentos por año en total —uno en la
		 * temporada, uno en el mercado—, así que hay menos tiradas por carrera y
		 * el que más se repite pesa más del total: medido, 0.139. El piso de
		 * variedad —al menos catorce cosas distintas— no se movió.
		 */
		const e = unaCarrera('centrodelantero');
		e.representante.atributos.scouting = 60;
		e.representante.representadosExtra = 3;
		const cuenta = loQueLePasa(e, 'representante');

		expect(Object.keys(cuenta).length).toBeGreaterThanOrEqual(14);
		const total = Object.values(cuenta).reduce((a, b) => a + b, 0);
		const veces = Object.values(cuenta).sort((a, b) => b - a)[0];
		expect(veces / total).toBeLessThan(0.16);
	});

	it('al representante no le toca la misma familia dos años seguidos', () => {
		/*
		 * La otra mitad de lo que pidió Alan: "agregar de sociales, familiares,
		 * turbios, etc.". Tener veinte no sirve si te llaman de lo mismo todos
		 * los años.
		 *
		 * Con dos momentos por año en la temporada esto comparaba que los dos del
		 * mismo año fueran de familias distintas. Bajado a uno solo por año —Alan
		 * pidió dos por año en total, uno acá y uno en el mercado— ya no hay dos
		 * en el mismo año para comparar entre sí: lo que queda, y sigue siendo lo
		 * que importa, es que la familia rote de un año al siguiente.
		 */
		const e = unaCarrera('centrodelantero');
		e.representante.atributos.scouting = 60;
		e.representante.representadosExtra = 3;
		e.fase = 2;

		const vistas: string[] = [];
		for (let t = 1; t <= 18; t++) {
			e.temporada = t;
			const familias = momentosDelRepresentante(e, 'var').map((m) => m.familia!);
			expect(familias.length, `temporada ${t}`).toBe(1);
			vistas.push(familias[0]);
		}

		// Y de un año al otro no se repite: la rotación avanza.
		for (let i = 1; i < vistas.length; i++) {
			expect(vistas[i], `temporada ${i + 1}`).not.toBe(vistas[i - 1]);
		}
	});

	it('no toca dos años seguidos la misma familia fuera de la cancha', () => {
		/*
		 * Lo que Alan pidió con la lista adentro: "no pueden ser siempre lo
		 * mismo, tenemos que tener una batería de momentos (sociales, prensa,
		 * lesiones, comidas, incluso cosas turbias, momento del partido,
		 * árbitros, tarjetas, etc.)".
		 *
		 * Tener veintidós momentos fuera de la cancha no sirve de nada si el
		 * sorteo te da prensa tres años seguidos. Por eso la familia rota y lo
		 * único que se sortea es cuál de esa familia.
		 *
		 * Con un solo momento por temporada (Alan pidió bajar a dos por año en
		 * total) ya no toca "de la vida" todos los años: le toca a uno de cada
		 * tres, igual que antes de este cambio, solo que repartido entre
		 * temporadas en vez de siempre presente. Por eso acá se simula el triple
		 * de años —para juntar tantas veces "de la vida" como antes— y se
		 * compara solo entre esas apariciones, no entre temporadas consecutivas
		 * a secas.
		 */
		const e = unaCarrera('centrodelantero');
		const familias: string[] = [];
		for (let t = 1; t <= 54; t++) {
			e.temporada = t;
			e.fase = 2;
			const deLaVida = ocasionesDe(e, 'var').find((o) => o.familia !== undefined);
			if (deLaVida) familias.push(deLaVida.familia!);
		}

		// Dieciocho apariciones de "de la vida" en cincuenta y cuatro años, la
		// misma proporción de siempre.
		expect(familias.length).toBeGreaterThanOrEqual(15);

		for (let i = 1; i < familias.length; i++) {
			expect(familias[i], `aparición ${i + 1}`).not.toBe(familias[i - 1]);
		}
		// Y las ocho familias aparecen: ninguna quedó escrita y sin usar.
		expect(new Set(familias).size).toBeGreaterThanOrEqual(8);
	});

	it('dos puestos distintos no juegan la misma carrera', () => {
		const delNueve = new Set(Object.keys(loQueLePasa(unaCarrera('centrodelantero'), 'futbolista')));
		const delArquero = new Set(Object.keys(loQueLePasa(unaCarrera('arquero'), 'futbolista')));

		// Comparten los que son de cualquier puesto, pero no los de pelota.
		const solosDelNueve = [...delNueve].filter((id) => !delArquero.has(id));
		expect(solosDelNueve.length).toBeGreaterThanOrEqual(3);
	});
});
