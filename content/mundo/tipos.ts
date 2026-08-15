import { z } from 'zod';

/**
 * El mundo del juego: países, ligas y clubes.
 *
 * Los clubes y las ligas son datos reales, porque son estables y le dan al
 * juego una escalera de pases creíble. Las personas (futbolistas, DT,
 * dirigentes) no están acá: se generan, para que no queden viejas y para que
 * cada partida arme sus propios personajes. Ver `generar.ts`.
 *
 * Esto es contenido, no código: se valida con Zod al arrancar y se puede editar
 * sin tocar el motor.
 */

export const esquemaPais = z.object({
	id: z.string().min(2),
	nombre: z.string().min(2),
	/** Cómo se le dice a alguien de ese país: "argentino", "brasileño". */
	gentilicio: z.string().min(2),
	confederacion: z.enum(['conmebol', 'concacaf', 'uefa'])
});

export const esquemaLiga = z.object({
	id: z.string().min(2),
	paisId: z.string().min(2),
	nombre: z.string().min(2),
	/** 1 = primera división, 2 = segunda. */
	nivel: z.union([z.literal(1), z.literal(2)]),

	/**
	 * Qué tan fuerte se juega, 0–100. Define contra qué rivales te medís y
	 * cuánto cuesta destacarse. La Premier y LaLiga arriba de todo; el Ascenso
	 * argentino abajo.
	 */
	fuerza: z.number().min(0).max(100),

	/**
	 * Multiplicador de plata respecto de la base. Un salario equivalente en
	 * Alemania paga mucho más que en Chile. Se usa para los sueldos y para los
	 * montos de los pases.
	 */
	indiceDinero: z.number().min(0.1).max(30),

	/** Qué torneo continental juegan los primeros puestos. */
	continental: z.enum(['champions', 'libertadores', 'concachampions', 'ninguno'])
});

export const esquemaClub = z.object({
	id: z.string().min(2),
	ligaId: z.string().min(2),
	nombre: z.string().min(2),
	ciudad: z.string().min(2),

	/**
	 * Peso del club, 0–100. Mezcla historia, hinchada y proyección
	 * internacional. Es lo que hace que te reconozcan por haber jugado ahí.
	 */
	prestigio: z.number().min(0).max(100),

	/**
	 * Capacidad de pagar, 0–100, relativa dentro de su liga. Combinada con el
	 * índice de dinero de la liga da los sueldos que puede ofrecer.
	 */
	presupuesto: z.number().min(0).max(100),

	/**
	 * Tamaño y exigencia de la hinchada, 0–100. Los clubes grandes te dan más
	 * fama, pero también te aprietan más si no rendís.
	 */
	hinchada: z.number().min(0).max(100)
});

export type Pais = z.infer<typeof esquemaPais>;
export type Liga = z.infer<typeof esquemaLiga>;
export type Club = z.infer<typeof esquemaClub>;

export const esquemaPersona = z.object({
	id: z.string().min(2),
	nombre: z.string().min(2),
	nacionalidad: z.string().min(2),
	nacimiento: z.number().int().min(1940).max(2015),
	fama: z.number().min(0).max(100),
	clubId: z.string().min(2).nullable(),
	seleccion: z.string().min(2).optional(),
	posicion: z.enum(['arquero', 'defensor', 'mediocampista', 'delantero']).optional()
});

export type PersonaValidada = z.infer<typeof esquemaPersona>;

export type Mundo = {
	paises: Pais[];
	ligas: Liga[];
	clubes: Club[];
	personas: PersonaValidada[];
};

/**
 * Valida el mundo entero y revienta con un mensaje claro si algo no cierra.
 * Se llama una sola vez al cargar el contenido: mejor romper al arrancar que
 * descubrir a mitad de una carrera que un club apunta a una liga que no existe.
 */
export function validarMundo(mundo: Mundo): Mundo {
	z.array(esquemaPais).parse(mundo.paises);
	z.array(esquemaLiga).parse(mundo.ligas);
	z.array(esquemaClub).parse(mundo.clubes);
	z.array(esquemaPersona).parse(mundo.personas);

	const paises = new Set(mundo.paises.map((p) => p.id));
	const ligas = new Set(mundo.ligas.map((l) => l.id));

	const problemas: string[] = [];

	for (const id of [...paises].filter((p) => [...paises].filter((q) => q === p).length > 1)) {
		problemas.push(`país repetido: ${id}`);
	}
	repetidos(mundo.ligas.map((l) => l.id)).forEach((id) => problemas.push(`liga repetida: ${id}`));
	repetidos(mundo.clubes.map((c) => c.id)).forEach((id) => problemas.push(`club repetido: ${id}`));

	for (const liga of mundo.ligas) {
		if (!paises.has(liga.paisId)) {
			problemas.push(`la liga ${liga.id} apunta a un país que no existe: ${liga.paisId}`);
		}
	}
	for (const club of mundo.clubes) {
		if (!ligas.has(club.ligaId)) {
			problemas.push(`el club ${club.id} apunta a una liga que no existe: ${club.ligaId}`);
		}
	}
	const clubes = new Set(mundo.clubes.map((c) => c.id));
	repetidos(mundo.personas.map((p) => p.id)).forEach((id) =>
		problemas.push(`persona repetida: ${id}`)
	);
	for (const persona of mundo.personas) {
		if (persona.clubId !== null && !clubes.has(persona.clubId)) {
			problemas.push(`${persona.nombre} está en un club que no existe: ${persona.clubId}`);
		}
		if (persona.clubId === null && !persona.seleccion) {
			problemas.push(`${persona.nombre} no tiene club ni selección`);
		}
	}
	for (const liga of mundo.ligas) {
		const cuantos = mundo.clubes.filter((c) => c.ligaId === liga.id).length;
		if (cuantos < 8) {
			problemas.push(`la liga ${liga.id} tiene solo ${cuantos} clubes`);
		}
	}

	if (problemas.length > 0) {
		throw new Error(`El mundo tiene problemas:\n  - ${problemas.join('\n  - ')}`);
	}

	return mundo;
}

function repetidos(ids: string[]): string[] {
	const vistos = new Set<string>();
	const dobles = new Set<string>();
	for (const id of ids) {
		if (vistos.has(id)) dobles.add(id);
		vistos.add(id);
	}
	return [...dobles];
}
