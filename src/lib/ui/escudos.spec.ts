import { describe, expect, it } from 'vitest';
import { clubes } from '../../../content/mundo';
import { escudoDe, iniciales } from './escudos';
import { BANDERAS, paisDeNacionalidad } from './banderas';
import { paises } from '../../../content/mundo';

describe('los escudos', () => {
	it('todos los clubes tienen escudo', () => {
		for (const c of clubes) {
			const e = escudoDe(c.id);
			expect(e.principal, c.nombre).toMatch(/^#[0-9a-f]{6}$/);
			expect(e.secundario, c.nombre).toMatch(/^#[0-9a-f]{6}$/);
			expect(e.iniciales.length, c.nombre).toBeGreaterThanOrEqual(2);
			expect(e.iniciales.length, c.nombre).toBeLessThanOrEqual(3);
		}
	});

	it('el mismo club da siempre el mismo escudo', () => {
		expect(escudoDe('ar2-tristansuarez')).toEqual(escudoDe('ar2-tristansuarez'));
	});

	it('el fondo y el patrón nunca son del mismo color', () => {
		for (const c of clubes) {
			const e = escudoDe(c.id);
			if (e.patron !== 'liso') expect(e.principal, c.nombre).not.toBe(e.secundario);
		}
	});

	it('la tinta se lee sobre el fondo', () => {
		// Fondo claro, letras oscuras; fondo oscuro, letras blancas.
		expect(escudoDe('ar-river').tinta).toBe('#101014');
		expect(escudoDe('ar-boca').tinta).toBe('#ffffff');
	});

	it('las iniciales salen del nombre', () => {
		expect(iniciales('River Plate')).toBe('RP');
		expect(iniciales("Newell's Old Boys")).toBe('NOB');
		expect(iniciales('Palmeiras')).toBe('PAL');
		expect(iniciales('Gimnasia y Esgrima La Plata')).toBe('GEP');
		expect(iniciales('Real Madrid')).toBe('RM');
	});
});

describe('las banderas', () => {
	it('hay bandera para cada país del mundo', () => {
		for (const p of paises) {
			expect(BANDERAS[p.id], p.nombre).toBeTruthy();
		}
	});

	it('las nacionalidades del contenido encuentran su bandera', () => {
		for (const p of paises) {
			expect(paisDeNacionalidad(p.nombre), p.nombre).toBe(p.id);
		}
	});

	it('una nacionalidad que no conocemos no rompe: no lleva bandera', () => {
		expect(paisDeNacionalidad('Marruecos')).toBe(null);
	});

	it('los pesos, cuando están, son uno por franja', () => {
		for (const [id, b] of Object.entries(BANDERAS)) {
			if (b.pesos) expect(b.pesos.length, id).toBe(b.franjas.length);
		}
	});
});
