/**
 * El mundo, en coordenadas de verdad.
 *
 * Los contornos son listas de [longitud, latitud] reales, simplificadas a mano
 * hasta lo que se lee bien en una tarjeta de cuatrocientos píxeles. No hace
 * falta más: a este tamaño, un contorno de alta resolución se dibuja igual que
 * uno de treinta puntos y pesa cien veces más.
 *
 * La primera versión de este mapa eran cuatro óvalos grises, y no se leían como
 * continentes porque no lo eran. Con la costa de verdad, Sudamérica se
 * reconoce sin que nadie la señale, y ahí el mapa empieza a decir algo.
 *
 * Vive en un `.ts` y no adentro del componente porque son datos, no vista.
 */

/** Un punto del mundo: longitud (−180…180) y latitud (−90…90). */
export type Punto = [number, number];

/**
 * El recorte que se dibuja.
 *
 * De California a Turquía y de Islandia a Tierra del Fuego, que es donde están
 * las trece ligas del juego. Dibujar el planisferio entero dejaría el Pacífico
 * y Oceanía vacíos ocupando la mitad del ancho.
 */
export const RECORTE = { oeste: -122, este: 46, norte: 62, sur: -56 };

/** De coordenadas del mundo a coordenadas del dibujo, en una caja de 100×100. */
export function proyectar([lon, lat]: Punto): { x: number; y: number } {
	const { oeste, este, norte, sur } = RECORTE;
	return {
		x: ((lon - oeste) / (este - oeste)) * 100,
		y: ((norte - lat) / (norte - sur)) * 100
	};
}

/** Un contorno entero, listo para el atributo `d` de un `<path>`. */
export function contornoDe(puntos: readonly Punto[]): string {
	return (
		puntos
			.map((p, i) => {
				const { x, y } = proyectar(p);
				return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
			})
			.join(' ') + ' Z'
	);
}

/**
 * Las masas de tierra que entran en el recorte.
 *
 * Cada una es un anillo cerrado recorrido en un solo sentido. Los puntos salen
 * de accidentes reconocibles —el cabo de São Roque, el estrecho de Gibraltar,
 * la bota de Italia— porque son los que hacen que una silueta se reconozca.
 */
export const TIERRAS: readonly { nombre: string; puntos: readonly Punto[] }[] = [
	{
		nombre: 'Sudamérica',
		puntos: [
			[-77, 8],
			[-72, 12],
			[-61, 11],
			[-52, 5],
			[-50, 0],
			[-44, -2],
			[-38, -5],
			[-35, -8],
			[-39, -13],
			[-41, -22],
			[-48, -25],
			[-53, -33],
			[-57, -35],
			[-62, -39],
			[-64, -42],
			[-65, -45],
			[-68, -50],
			[-70, -55],
			[-75, -52],
			[-74, -45],
			[-73, -38],
			[-71, -30],
			[-70, -23],
			[-71, -18],
			[-76, -14],
			[-79, -7],
			[-81, -5],
			[-80, 0],
			[-78, 2],
			[-77, 8]
		]
	},
	{
		nombre: 'Centroamérica y México',
		puntos: [
			[-117, 32],
			[-108, 31],
			[-104, 25],
			[-97, 26],
			[-95, 19],
			[-91, 19],
			[-87, 21],
			[-88, 18],
			[-84, 15],
			[-83, 9],
			[-79, 9],
			[-77, 8],
			[-80, 9],
			[-84, 10],
			[-87, 13],
			[-92, 14],
			[-96, 16],
			[-101, 17],
			[-105, 20],
			[-109, 23],
			[-113, 27],
			[-115, 30],
			[-117, 32]
		]
	},
	{
		nombre: 'Norteamérica',
		/*
		 * Con Canadá, y no cortado en el paralelo 49.
		 *
		 * La primera versión terminaba en la frontera con Estados Unidos, que es
		 * una línea recta y no una costa: en pantalla quedaba una cuña con un
		 * tajo horizontal arriba y medio mapa vacío al lado. La bahía de Hudson,
		 * Labrador y Terranova son las tres formas que hacen que el norte se
		 * reconozca, y cuestan trece puntos.
		 */
		puntos: [
			[-122, 48],
			[-122, 60],
			[-114, 62],
			[-104, 62],
			[-97, 60],
			// La bahía de Hudson, por la costa oeste y bajando a la de James.
			[-94, 58],
			[-92, 57],
			[-88, 56],
			[-85, 55],
			[-82, 55],
			[-80, 52],
			[-79, 54],
			[-78, 58],
			// Ungava, Labrador y Terranova.
			[-74, 62],
			[-68, 60],
			[-64, 58],
			[-61, 55],
			[-57, 52],
			[-53, 47],
			[-59, 46],
			[-64, 46],
			[-67, 45],
			[-70, 41],
			[-76, 37],
			[-81, 32],
			[-80, 25],
			[-83, 29],
			[-88, 30],
			[-94, 29],
			[-97, 26],
			[-104, 25],
			[-108, 31],
			[-117, 32],
			[-122, 37],
			[-124, 42],
			[-122, 48]
		]
	},
	/*
	 * Europa va en pedazos y no en un anillo solo.
	 *
	 * Un contorno único que entrara y saliera de Iberia, de Italia y de Grecia
	 * se cruzaba consigo mismo y se dibujaba como una mancha con agujeros. En
	 * piezas, cada una es un polígono simple y las penínsulas se reconocen.
	 */
	{
		nombre: 'Iberia',
		puntos: [
			[-9, 43],
			[-2, 43],
			[3, 42],
			[0, 39],
			[-2, 37],
			[-6, 36],
			[-9, 38],
			[-9, 43]
		]
	},
	{
		nombre: 'Europa central',
		puntos: [
			[-2, 43],
			[-2, 46],
			[-5, 48],
			[-1, 49],
			[2, 51],
			[4, 51],
			[6, 53],
			[8, 54],
			[9, 57],
			[11, 59],
			[13, 55],
			[19, 55],
			[24, 57],
			[27, 60],
			[23, 61],
			[17, 61],
			[12, 59],
			[13, 54],
			[19, 51],
			[23, 49],
			[28, 46],
			[24, 44],
			[19, 42],
			[16, 43],
			[13, 46],
			[9, 46],
			[6, 47],
			[3, 43],
			[-2, 43]
		]
	},
	{
		nombre: 'Italia',
		puntos: [
			[7, 44],
			[10, 44],
			[13, 46],
			[13, 45],
			[13, 42],
			[16, 41],
			[18, 40],
			[16, 38],
			[15, 40],
			[12, 41],
			[10, 43],
			[9, 44],
			[7, 44]
		]
	},
	{
		nombre: 'Grecia',
		puntos: [
			[20, 40],
			[23, 41],
			[26, 40],
			[24, 38],
			[23, 35],
			[22, 37],
			[20, 38],
			[20, 40]
		]
	},
	{
		nombre: 'Turquía',
		puntos: [
			[26, 40],
			[29, 41],
			[36, 42],
			[41, 41],
			[44, 39],
			[44, 37],
			[36, 36],
			[30, 37],
			[27, 37],
			[26, 40]
		]
	},
	{
		nombre: 'Gran Bretaña',
		puntos: [
			[-5, 58],
			[-2, 58],
			[0, 54],
			[1, 53],
			[1, 51],
			[-1, 51],
			[-5, 50],
			[-4, 53],
			[-5, 55],
			[-5, 58]
		]
	},
	{
		nombre: 'Irlanda',
		puntos: [
			[-10, 54],
			[-6, 55],
			[-6, 52],
			[-10, 52],
			[-10, 54]
		]
	},
	{
		// Solo la costa norte: alcanza para que el Mediterráneo se lea como un mar
		// y Europa deje de flotar. Más abajo no hay ninguna liga del juego.
		nombre: 'África del norte',
		puntos: [
			[-17, 21],
			[-13, 28],
			[-6, 36],
			[3, 37],
			[10, 37],
			[11, 33],
			[20, 32],
			[25, 32],
			[34, 31],
			[35, 24],
			[38, 18],
			[30, 12],
			[16, 12],
			[0, 14],
			[-17, 15],
			[-17, 21]
		]
	}
];

/**
 * Dónde queda cada ciudad donde hay un club del juego.
 *
 * Ciudad y no país: en Argentina hay clubes en Buenos Aires, Rosario, Córdoba
 * y Tucumán, y son mil kilómetros de diferencia. Con el país, una carrera
 * entera en Argentina era un solo punto y no se veía nada; con la ciudad se ve
 * el que subió del ascenso del conurbano al centro de Europa.
 *
 * Son las 196 ciudades del mundo del juego, con sus coordenadas de verdad.
 */
export const CIUDADES: Record<string, Punto> = {
	Adana: [35.33, 37.0],
	Aguascalientes: [-102.3, 21.88],
	Alanya: [31.99, 36.54],
	Alkmaar: [4.75, 52.63],
	Almelo: [6.66, 52.36],
	Almere: [5.22, 52.37],
	Amadora: [-9.23, 38.76],
	Angers: [-0.55, 47.47],
	Antalya: [30.71, 36.9],
	Antioquía: [38.3, 36.2],
	Arnhem: [5.9, 51.98],
	Arouca: [-8.24, 40.93],
	Augsburgo: [10.9, 48.37],
	Auxerre: [3.57, 47.8],
	Avellaneda: [-58.37, -34.66],
	Banfield: [-58.39, -34.74],
	Barcelona: [2.17, 41.39],
	Barcelos: [-8.62, 41.54],
	'Belo Horizonte': [-43.94, -19.92],
	Berlín: [13.4, 52.52],
	Bilbao: [-2.93, 43.26],
	Birmingham: [-1.9, 52.48],
	Bochum: [7.22, 51.48],
	Bolonia: [11.34, 44.49],
	Bournemouth: [-1.88, 50.72],
	Braga: [-8.43, 41.55],
	'Bragança Paulista': [-46.54, -22.95],
	Bremen: [8.8, 53.08],
	Brest: [-4.49, 48.39],
	Brighton: [-0.14, 50.82],
	'Buenos Aires': [-58.44, -34.61],
	Bérgamo: [9.67, 45.7],
	Cagliari: [9.11, 39.22],
	Calama: [-68.93, -22.46],
	'Carlos Casares': [-61.37, -35.62],
	Chillán: [-72.1, -36.61],
	'Ciudad Juárez': [-106.49, 31.74],
	'Ciudad de México': [-99.13, 19.43],
	'Colonia del Sacramento': [-57.84, -34.47],
	Como: [9.09, 45.81],
	Coquimbo: [-71.34, -29.95],
	Cuiabá: [-56.1, -15.6],
	Curitiba: [-49.27, -25.43],
	Córdoba: [-64.18, -31.42],
	Deventer: [6.16, 52.26],
	Dortmund: [7.47, 51.51],
	Eindhoven: [5.48, 51.44],
	'El Salvador': [-69.61, -24.42],
	Empoli: [10.95, 43.72],
	Enschede: [6.89, 52.22],
	Esmirna: [27.14, 38.42],
	Estambul: [28.98, 41.01],
	Estoril: [-9.4, 38.71],
	Estrasburgo: [7.75, 48.58],
	Ezeiza: [-58.52, -34.85],
	Faro: [-7.93, 37.02],
	Florencia: [11.26, 43.77],
	'Florencio Varela': [-58.28, -34.81],
	Fortaleza: [-38.54, -3.73],
	Friburgo: [7.85, 47.99],
	Fráncfort: [8.68, 50.11],
	Funchal: [-16.92, 32.65],
	Gaziantep: [37.38, 37.07],
	Getafe: [-3.73, 40.31],
	Girona: [2.82, 41.98],
	Goiânia: [-49.25, -16.68],
	Groninga: [6.57, 53.22],
	Guadalajara: [-103.35, 20.66],
	Guimarães: [-8.3, 41.44],
	Génova: [8.95, 44.41],
	Hamburgo: [9.99, 53.55],
	Heerenveen: [5.92, 52.96],
	Heidenheim: [10.15, 48.68],
	Ipswich: [1.15, 52.06],
	Iquique: [-70.14, -20.22],
	'José Ingenieros': [-58.53, -34.62],
	Kayseri: [35.48, 38.73],
	Kiel: [10.14, 54.32],
	Konya: [32.49, 37.87],
	'La Calera': [-71.2, -32.79],
	'La Plata': [-57.95, -34.92],
	'La Serena': [-71.25, -29.9],
	'Las Palmas de Gran Canaria': [-15.42, 28.12],
	'Le Havre': [0.11, 49.49],
	Lecce: [18.17, 40.35],
	Leganés: [-3.76, 40.33],
	Leicester: [-1.13, 52.64],
	Leipzig: [12.37, 51.34],
	Lens: [2.83, 50.43],
	Leverkusen: [7.0, 51.03],
	León: [-101.68, 21.12],
	Lille: [3.06, 50.63],
	Lisboa: [-9.14, 38.72],
	Liverpool: [-2.98, 53.41],
	'Lomas de Zamora': [-58.41, -34.76],
	Londres: [-0.13, 51.51],
	Lyon: [4.83, 45.76],
	Madrid: [-3.7, 40.42],
	Maguncia: [8.27, 49.99],
	Maipú: [-68.79, -32.98],
	Maldonado: [-54.96, -34.91],
	'Mar del Plata': [-57.55, -38.0],
	Marsella: [5.37, 43.3],
	Mazatlán: [-106.42, 23.25],
	Melo: [-54.17, -32.37],
	Mendoza: [-68.84, -32.89],
	Milán: [9.19, 45.46],
	Monterrey: [-100.32, 25.69],
	Montevideo: [-56.19, -34.9],
	Montpellier: [3.88, 43.61],
	Monza: [9.27, 45.58],
	'Moreira de Cónegos': [-8.35, 41.36],
	Morón: [-58.62, -34.65],
	Munro: [-58.52, -34.53],
	Mánchester: [-2.24, 53.48],
	Mónaco: [7.42, 43.74],
	Mönchengladbach: [6.44, 51.19],
	Múnich: [11.58, 48.14],
	Nantes: [-1.55, 47.22],
	Newcastle: [-1.61, 54.98],
	Nimega: [5.86, 51.84],
	Niza: [7.27, 43.7],
	Nottingham: [-1.15, 52.95],
	Nápoles: [14.25, 40.85],
	Oporto: [-8.61, 41.15],
	Pachuca: [-98.73, 20.12],
	Palma: [2.65, 39.57],
	Pamplona: [-1.64, 42.82],
	Parma: [10.33, 44.8],
	París: [2.35, 48.86],
	'Ponta Delgada': [-25.67, 37.74],
	'Porto Alegre': [-51.23, -30.03],
	Puebla: [-98.21, 19.04],
	Querétaro: [-100.39, 20.59],
	Quilmes: [-58.27, -34.72],
	Rancagua: [-70.74, -34.17],
	Recife: [-34.88, -8.05],
	Reims: [4.03, 49.26],
	Rennes: [-1.68, 48.11],
	Rize: [40.52, 41.02],
	Roma: [12.5, 41.9],
	Rosario: [-60.64, -32.95],
	'Río Cuarto': [-64.35, -33.13],
	'Río de Janeiro': [-43.2, -22.91],
	Róterdam: [4.48, 51.92],
	'Saint-Étienne': [4.39, 45.44],
	Salvador: [-38.5, -12.97],
	Samsun: [36.33, 41.29],
	'San Luis Potosí': [-100.99, 22.15],
	'San Martín': [-58.53, -34.57],
	'San Miguel': [-58.71, -34.54],
	'San Miguel de Tucumán': [-65.21, -26.82],
	'San Nicolás de los Garza': [-100.3, 25.75],
	'San Salvador de Jujuy': [-65.3, -24.19],
	'San Sebastián': [-1.98, 43.32],
	'Santa Fe': [-60.7, -31.63],
	Santiago: [-70.65, -33.45],
	Santos: [-46.33, -23.96],
	Sassuolo: [10.78, 44.55],
	Sevilla: [-5.98, 37.39],
	Sinsheim: [8.88, 49.25],
	Sittard: [5.87, 51.0],
	Sivas: [37.02, 39.75],
	Southampton: [-1.4, 50.91],
	Stuttgart: [9.18, 48.78],
	'São Paulo': [-46.63, -23.55],
	Talcahuano: [-73.12, -36.72],
	Temperley: [-58.4, -34.77],
	Tijuana: [-117.04, 32.51],
	Tilburg: [5.09, 51.56],
	Toluca: [-99.66, 19.29],
	Torreón: [-103.44, 25.54],
	Toulouse: [1.44, 43.6],
	Trebisonda: [39.72, 41.0],
	Turín: [7.69, 45.07],
	Udine: [13.24, 46.06],
	Utrecht: [5.12, 52.09],
	Valencia: [-0.38, 39.47],
	Valladolid: [-4.72, 41.65],
	Valparaíso: [-71.61, -33.05],
	Verona: [10.99, 45.44],
	'Vicente López': [-58.48, -34.53],
	Victoria: [-58.48, -34.46],
	Vigo: [-8.72, 42.24],
	'Vila Nova de Famalicão': [-8.52, 41.41],
	'Vila das Aves': [-8.42, 41.35],
	'Vila do Conde': [-8.75, 41.35],
	Villarreal: [-0.1, 39.94],
	'Vitoria-Gasteiz': [-2.67, 42.85],
	'Viña del Mar': [-71.55, -33.02],
	Waalwijk: [5.07, 51.69],
	Wolfsburgo: [10.79, 52.42],
	Wolverhampton: [-2.13, 52.59],
	Zwolle: [6.09, 52.51],
	Ámsterdam: [4.9, 52.37]
};

/**
 * Y el centro de cada país, para la ciudad que falte.
 *
 * Un club nuevo con una ciudad que no esté en la lista de arriba tiene que
 * caer en algún lado razonable y no en el medio del Atlántico.
 */
export const PAISES: Record<string, Punto> = {
	ar: [-63.6, -34.0],
	uy: [-56.0, -33.0],
	cl: [-71.0, -35.0],
	br: [-47.0, -15.0],
	mx: [-102.0, 23.0],
	pt: [-8.2, 39.5],
	es: [-3.7, 40.4],
	en: [-1.5, 52.5],
	fr: [2.3, 46.6],
	nl: [5.3, 52.1],
	de: [10.4, 51.2],
	it: [12.6, 42.5],
	tr: [35.2, 39.0]
};

/** Dónde dibujar un club: su ciudad, o el centro de su país si no está. */
export function dondeJuega(ciudad: string, paisId: string): Punto {
	return CIUDADES[ciudad] ?? PAISES[paisId] ?? [0, 20];
}
