import { media } from './estado';
import { rngPara } from './rng';
import type { Atributos, Estado } from './tipos';

/**
 * La pretemporada.
 *
 * Es la fase donde el futbolista decide en qué se convierte. Elige un plan
 * —qué quiere mejorar— y con cuánta intensidad lo hace. Lo segundo es la
 * decisión de verdad: entrenar a matar sube más rápido y rompe antes, y a los
 * 30 esa cuenta ya no cierra.
 *
 * El techo lo pone el potencial, que ninguno de los dos jugadores ve. Se
 * intuye: cuando el pibe deja de subir, ya sabés dónde estaba.
 */

export type PlanDeEntrenamiento = {
	id: string;
	nombre: string;
	detalle: string;
	atributos: (keyof Atributos)[];
};

export const PLANES: PlanDeEntrenamiento[] = [
	{
		id: 'definicion',
		nombre: 'Definición',
		detalle: 'Horas de arco después del entrenamiento.',
		atributos: ['definicion']
	},
	{
		id: 'fisico',
		nombre: 'Físico',
		detalle: 'Gimnasio y fondo. Aguantar los 90 y el año entero.',
		atributos: ['potencia', 'resistencia']
	},
	{
		id: 'velocidad',
		nombre: 'Velocidad',
		detalle: 'Piques cortos. Lo primero que se va con la edad.',
		atributos: ['velocidad']
	},
	{
		id: 'juego',
		nombre: 'Juego',
		detalle: 'Pase y control. Lo que te deja jugar cuando ya no corrés.',
		atributos: ['pase', 'regate']
	},
	{
		id: 'marca',
		nombre: 'Marca',
		detalle: 'Posición, anticipo y cruce.',
		atributos: ['defensa']
	},
	{
		id: 'cabeza',
		nombre: 'Cabeza',
		detalle: 'Video, charlas, liderazgo. Sube poco y sirve siempre.',
		atributos: ['liderazgo']
	}
];

export type Intensidad = 'suave' | 'firme' | 'a-matar';

export type PerfilDeIntensidad = {
	id: Intensidad;
	nombre: string;
	detalle: string;
	/** Multiplicador de lo que se gana. */
	rinde: number;
	/** Desgaste que deja en el cuerpo, por temporada. */
	desgaste: number;
};

export const INTENSIDADES: PerfilDeIntensidad[] = [
	{
		id: 'suave',
		nombre: 'Suave',
		detalle: 'Cuidarse. Sube poco y llegás entero a la temporada.',
		rinde: 0.55,
		desgaste: 0
	},
	{
		id: 'firme',
		nombre: 'Firme',
		detalle: 'Lo que hace todo el mundo.',
		rinde: 1,
		desgaste: 1
	},
	{
		id: 'a-matar',
		nombre: 'A matar',
		detalle: 'Doble turno. Sube rápido y el cuerpo lo cobra.',
		rinde: 1.7,
		desgaste: 3
	}
];

export const PLAN_POR_DEFECTO = 'fisico';
export const INTENSIDAD_POR_DEFECTO: Intensidad = 'firme';

/**
 * Cuánto rinde entrenar, por edad.
 *
 * A los 17 cada verano cambia al jugador; a los 32 el mismo trabajo apenas
 * sostiene lo que ya hay. Es la curva que hace que la carrera tenga un momento
 * y que perderlo se pague.
 */
export function rindeDeLaEdad(edad: number): number {
	if (edad <= 19) return 1.6;
	if (edad <= 23) return 1.25;
	if (edad <= 27) return 0.9;
	if (edad <= 30) return 0.55;
	if (edad <= 33) return 0.3;
	return 0.12;
}

export type ResultadoEntrenamiento = {
	subieron: { atributo: keyof Atributos; puntos: number }[];
	desgaste: number;
	texto: string;
};

/**
 * Aplica una pretemporada. Muta el estado que recibe (ya viene clonado).
 */
export function entrenar(
	estado: Estado,
	planId: string,
	intensidadId: Intensidad,
	semilla: string
): ResultadoEntrenamiento {
	const f = estado.futbolista;
	const plan =
		PLANES.find((p) => p.id === planId) ?? PLANES.find((p) => p.id === PLAN_POR_DEFECTO)!;
	const intensidad =
		INTENSIDADES.find((i) => i.id === intensidadId) ??
		INTENSIDADES.find((i) => i.id === INTENSIDAD_POR_DEFECTO)!;

	const rng = rngPara(semilla, {
		temporada: estado.temporada,
		fase: 1,
		clave: `entrenamiento-${plan.id}`
	});

	const rinde = rindeDeLaEdad(f.edad) * intensidad.rinde;
	const subieron: ResultadoEntrenamiento['subieron'] = [];

	for (const atributo of plan.atributos) {
		// Cuanto más cerca del techo, menos se sube. Cuando la media ya pasó el
		// potencial, sube solo por casualidad.
		const margen = f.potencial - media(f.atributos, f.posicion);
		const frenoPorTecho = margen <= 0 ? 0.12 : Math.min(1, margen / 12);

		const puntos = Math.round(rng.entero(1, 4) * rinde * frenoPorTecho);
		if (puntos > 0) {
			f.atributos[atributo] = Math.min(99, f.atributos[atributo] + puntos);
			subieron.push({ atributo, puntos });
		}
	}

	// El desgaste de entrenar se suma al de jugar. A los 33, a matar, es la
	// forma más rápida de terminar la carrera.
	const desgaste = intensidad.desgaste + (f.edad >= 31 ? Math.round(intensidad.desgaste / 2) : 0);
	f.desgaste = Math.min(100, f.desgaste + desgaste);

	// Llegar bien a la pretemporada arranca la temporada con mejor forma.
	f.forma = Math.max(1, Math.min(100, f.forma + Math.round(intensidad.rinde * 6) - 2));

	const texto =
		subieron.length === 0
			? `Hiciste la pretemporada de ${plan.nombre.toLowerCase()} y no se movió nada. Pasa.`
			: `Pretemporada de ${plan.nombre.toLowerCase()}: ` +
				subieron.map((s) => `${nombreAtributo(s.atributo)} +${s.puntos}`).join(', ') +
				'.';

	return { subieron, desgaste, texto };
}

/**
 * Lo que un plan promete, antes de entrenarlo.
 *
 * Sirve para que la pantalla pueda decir "Potencia 41, hasta +4" en vez de
 * "Físico". Es el techo optimista: no descuenta el freno por potencial, que es
 * información oculta. Que a los 28 entrenes para +4 y subas +1 es exactamente
 * la señal de que estás llegando a tu techo, y descubrirla jugando es parte de
 * lo que el juego quiere.
 */
export type PromesaDeEntrenamiento = {
	atributo: keyof Atributos;
	nombre: string;
	actual: number;
	/** Lo máximo que podría subir, con suerte y sin techo. */
	hasta: number;
};

export function loQuePromete(
	estado: Estado,
	planId: string,
	intensidadId: Intensidad
): PromesaDeEntrenamiento[] {
	const f = estado.futbolista;
	const plan =
		PLANES.find((p) => p.id === planId) ?? PLANES.find((p) => p.id === PLAN_POR_DEFECTO)!;
	const intensidad =
		INTENSIDADES.find((i) => i.id === intensidadId) ??
		INTENSIDADES.find((i) => i.id === INTENSIDAD_POR_DEFECTO)!;

	const rinde = rindeDeLaEdad(f.edad) * intensidad.rinde;

	return plan.atributos.map((atributo) => ({
		atributo,
		nombre: nombreAtributo(atributo),
		actual: f.atributos[atributo],
		hasta: Math.max(1, Math.round(4 * rinde))
	}));
}

export function nombreAtributo(atributo: keyof Atributos): string {
	const nombres: Record<keyof Atributos, string> = {
		definicion: 'definición',
		velocidad: 'velocidad',
		potencia: 'potencia',
		resistencia: 'resistencia',
		pase: 'pase',
		regate: 'regate',
		defensa: 'defensa',
		liderazgo: 'liderazgo'
	};
	return nombres[atributo];
}
