# Copolero — diseño técnico

Documento de decisiones. Cierra la sección "Lo que falta definir" de
`diseno-inicial.md` y reconcilia ese documento con `spec-bebo.md`.

Todo lo que está acá está **decidido**, salvo lo que figura en la sección 13.
Los números concretos son de escala realista y se calibran contra datos reales
antes de implementar (ver 13).

---

## 1. Qué es

Juego de carrera de futbolista para dos personas, por turnos y asincrónico, en
el navegador. Un rol es el **futbolista**, el otro es su **representante**. Hay
una sola partida y un solo estado compartido.

Motor de eventos, no simulador de partidos: se presenta una situación, se elige
entre opciones, el motor actualiza el estado, sigue la siguiente. La carrera va
del debut al retiro y termina en una pantalla final con dos puntajes.

La filosofía del ciclo, tal cual la planteó Bebo:

```
EVENTO → DECISIÓN → AZAR/ESTADÍSTICAS → RESULTADO → CONSECUENCIA → PROGRESIÓN → EVENTO
```

---

## 2. Los dos roles y sus economías

La regla que ordena todo el diseño: **cada uno administra su propia plata y su
propio tiempo, y son plata y tiempo distintos.**

### 2.1 El futbolista

Cobra un sueldo del club y paga su vida. Su plata se va en:

| Contratación               | Costo mensual (USD) | Qué hace                                            |
| -------------------------- | ------------------- | --------------------------------------------------- |
| Preparador físico personal | 800 – 2.500         | Sube físico, baja riesgo de lesión                  |
| Nutricionista              | 400 – 1.200         | Sostiene la forma, retrasa el desgaste              |
| Psicólogo deportivo        | 500 – 1.500         | Estabiliza la moral, mejora en partidos importantes |
| Kinesiólogo                | 600 – 2.000         | Acorta las lesiones, baja la reincidencia           |
| Cocinero                   | 700 – 2.000         | Efecto chico y constante sobre forma y desgaste     |

Son **contratos de servicio**, no consumibles: se pagan todos los meses, se
renuevan o se cortan. Ahí está el drama — con el primer contrato del Ascenso no
te da para contratar a nadie, y cuando bajás de categoría o te cortan el sueldo,
tenés que echar gente.

Además decide **dónde pone el tiempo** (entrenamiento extra, descanso, familia,
redes, estudio), qué declara a la prensa, cómo se lleva con el DT y el vestuario,
si juega lesionado, y si acepta un pase, una cesión o la selección.

### 2.2 El representante

Vive de tres fuentes, y ninguna es la cartera:

1. **Fijo anual atado al prestigio.** Se recalcula al cierre de cada temporada.

   ```
   fijo_anual_usd = 4.000 + 600 × prestigio        (prestigio: 0–100)
   ```

   Prestigio 0 → USD 4.000/año (no vivís de esto). Prestigio 100 → USD 64.000.

2. **Porcentaje del salario** del futbolista asociado, mientras dure el
   contrato. Rango negociable: 5 % – 10 %.

3. **Porcentaje de la transferencia y bonos** que él mismo haya negociado: hasta
   10 % del monto del pase, más bonos por objetivos (título, convocatoria a
   selección, cantidad de goles, cláusula de reventa).

Su plata se va en la **agencia**:

| Contratación      | Costo mensual (USD) | Qué hace                                         |
| ----------------- | ------------------- | ------------------------------------------------ |
| Abogado deportivo | 2.000 – 6.000       | Mejores cláusulas, menos riesgo en negociaciones |
| Scout             | 1.500 – 4.000       | Encontrar juveniles, leer mejor el mercado       |
| Analista de datos | 1.500 – 3.500       | Ver qué clubes encajan, anticipar ofertas        |
| Jefe de prensa    | 2.000 – 5.000       | Manejar la imagen del representado y la propia   |
| Contador          | 800 – 2.000         | Optimiza ingresos, evita problemas fiscales      |

Y su **agenda**: a qué clubes viaja, con qué dirigentes come, a qué mercados va.
La agenda tiene un techo por temporada. El límite no es un inventario, es que no
da el año.

### 2.3 La tensión

Está adentro del representante, no solo entre los dos jugadores:

- **Mover al jugador** = comisión inmediata.
- **Que al jugador le vaya bien** = prestigio = fijo anual todos los años.

Un pase apurado que sale mal paga una vez y hunde el fijo de las próximas cinco
temporadas. Un jugador que se queda diez años en un club y se vuelve ídolo hace
rico al representante por prestigio, aunque no haya cobrado casi comisiones.

### 2.4 El gesto: el representante paga el entorno

El representante puede **ofrecerse a pagar** una contratación del entorno del
futbolista (total o una parte). Al futbolista le llega la oferta y acepta o
rechaza.

- Sale de la plata del representante y no la recupera en forma directa.
- Si el futbolista acepta: `+12` de confianza.
- Si rechaza: `−3` de confianza para el representante (el gesto quedó colgado),
  sin costo para el futbolista.
- Se paga mientras el representante lo sostenga; puede cortarlo al cierre de
  cualquier temporada, con `−8` de confianza.

Es lo que hacen las agencias grandes para retener clientes, y adentro del juego
nunca queda claro si es cuidado o puesta a punto para vender. Las dos cosas son
ciertas al mismo tiempo.

### 2.5 La cartera

Existe, pero no es un negocio. Incorporar representados:

- Sube **prestigio** (tener buenos jugadores te hace visible).
- Abre **contactos** (cada jugador te abre puertas en su club).
- Genera un **ingreso chico y automático** que no se administra.

No compite con la carrera del futbolista principal, que sigue siendo el eje.

---

## 3. Estructura de la partida

### 3.1 Estado compartido

Un solo futbolista, un solo representante, un solo estado.

**Futbolista.** Edad, nacionalidad, posición, club, contrato (salario, años,
cláusula, bonos).
Atributos 0–100: `definicion`, `velocidad`, `potencia`, `resistencia`, `pase`,
`regate`, `defensa`, `liderazgo`. Más `potencial` (techo, oculto al jugador,
estimable).
Volátiles: `forma`, `moral`, `desgaste` (acumulativo e irreversible),
`riesgoLesion`.
Sociales: `fama`, `hinchada`, `dt`, `prensa`.
Carrera: partidos, goles, asistencias, títulos, minutos, valor de mercado,
dinero acumulado, historial por temporada.

`media = f(atributos, posición)` — ponderada por puesto: a un 9 le pesa
definición, a un 5 le pesa pase y defensa.

**Representante.** Edad, prestigio, dinero, atributos 0–100 (`negociacion`,
`scouting`, `contactos`), staff contratado, agenda, cartera de representados,
red de contactos por club y dirigente, historial de operaciones.

**Compartido.** Temporada actual, fase actual, **confianza** (0–100, arranca en
60), contrato de representación vigente.

### 3.2 La temporada: tres fases con barrera

Cada fase avanza solo cuando **los dos** cerraron sus decisiones.

| Fase                     | Futbolista                                                                                                 | Representante                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 · Pretemporada**     | Plan de entrenamiento, puntos de progresión, contratar/cortar entorno, objetivos declarados, vida personal | Repartir agenda (a qué clubes viaja, con quién habla), contratar/cortar staff, puntos de progresión, preparar negociaciones, buscar juveniles |
| **2 · Temporada**        | Bandeja de eventos + 3 o 4 ocasiones marcadas                                                              | Bandeja de eventos (sondeos, prensa, ofertas informales, contactos)                                                                           |
| **3 · Mercado y cierre** | Acepta o rechaza ofertas y renovaciones, expresa preferencias                                              | Negocia con clubes, cierra el pase o la renovación, negocia su propio contrato de representación                                              |

El resultado de la fase 3 es la **pantalla de periódico** (sección 8): resumen
deportivo + resumen del representante + progresión + botón para arrancar la
temporada siguiente.

Estados de la partida, tal como los nombró Bebo:
`WAITING_FOR_PLAYER` · `WAITING_FOR_AGENT` · `BOTH_READY` · `RESOLVING` ·
`SEASON_COMPLETE`.

**Modo simultáneo**: no necesita código propio. Si los dos están conectados al
mismo tiempo, el polling de la pantalla de espera (cada 5 s) hace que se sienta
en vivo. Sin websockets en el MVP.

### 3.3 Las ocasiones marcadas

Tres o cuatro por temporada, en partidos que importan: el debut, el clásico, una
final, el primer partido después de una lesión. Rueda de azar visible con
resultados `GOL / PALO / ATAJADA / AFUERA / PENAL`, con los sectores dibujados a
escala de la probabilidad real, calculada por el motor:

```
p_gol_base = 0,08
p_gol = p_gol_base × (definicion/50) × (forma/70) × mod_contexto × mod_rival
```

El jugador ve los sectores antes de girar: la rueda no oculta las
probabilidades, las muestra. Es un momento, no una mecánica: si aparece treinta
veces por año deja de ser un momento y se vuelve un click.

El resto de la actividad futbolística de la temporada la resuelve el motor sin
interacción, y sale como números en el resumen.

---

## 4. Duración de la carrera y ritmo

- **Debut** a los 16 (configurable en la pantalla de creación).
- **Retiro** entre los 32 y los 39, calculado, no fijo:

  ```
  se retira si  edad ≥ 32  y  ( desgaste ≥ 90  o  media < 55 dos temporadas seguidas )
  retiro forzado si desgaste ≥ 98 (lesión terminal), a cualquier edad ≥ 24
  tope duro: 24 temporadas
  ```

  El futbolista no sabe cuándo termina. Esa incertidumbre es parte del juego:
  aceptar el pase al exterior a los 31 pega distinto si no sabés cuántos años te
  quedan.

- **Esperado**: 17 a 20 temporadas.
- **Por temporada y por persona**: dos pantallas de decisión (fases 1 y 3), tres
  a cinco eventos en la fase 2, tres o cuatro ocasiones el futbolista. Unos
  10–15 minutos.
- **Ritmo objetivo**: una temporada por sesión. Jugando día por medio, la
  carrera dura tres o cuatro semanas. No se impone: el juego es asincrónico.

---

## 5. El motor de eventos

### 5.1 Formato

Los eventos son **contenido**, no código. Viven en archivos bajo `content/` y se
validan con Zod al arrancar. Agregar un evento es editar un archivo.

```ts
type Evento = {
	id: string;
	rol: 'futbolista' | 'representante';
	fase: 1 | 2 | 3;
	titulo: string;
	texto: string; // admite {club}, {rival}, {dt}, {companiero}
	peso: number; // ponderación base en la bolsa
	requisitos: Condicion[]; // sobre el estado; filtra la bolsa
	cooldown: number; // temporadas antes de poder repetirse
	unico?: boolean; // hitos: primer gol, primera lesión grave
	opciones: Opcion[];
};

type Opcion = {
	texto: string;
	defecto?: boolean; // la que aplica el piloto automático (sección 11)
	efectos: Efecto[]; // deltas deterministas sobre el estado
	tirada?: {
		exito: (e: Estado) => number; // 0..1, depende de atributos y contexto
		siExito: Efecto[];
		siFallo: Efecto[];
	};
	visibilidadParaElOtro: 'publica' | 'resumen' | 'oculta';
};
```

### 5.2 Selección

Al abrir la fase 2 se filtra la bolsa por requisitos y cooldown, y se sortean sin
reemplazo ponderando por `peso`. Los eventos `unico` marcados como hito entran
garantizados cuando se cumple su condición.

**Cuota por temporada**: 6 eventos en la fase 2 (3 y 3) más un comodín que puede
caer en cualquiera de los dos.

**Presupuesto de contenido**: 40 eventos (20 y 20) alcanzan para tres o cuatro
temporadas sin repetir. Una carrera completa sin sensación de repetición pide
unos 120. Se escriben de a poco: el motor no cambia.

### 5.3 Efectos cruzados

Los dos resuelven su bandeja en paralelo. Al cerrar la fase, el motor resuelve en
orden fijo — futbolista, representante, efectos cruzados — para que el resultado
no dependa de quién apretó primero.

### 5.4 Determinismo

Cada partida tiene una **semilla**. Cada tirada usa un PRNG derivado:

```
rng = hash(semilla, temporada, fase, evento_id, indice)
```

El resultado no depende del orden de llegada ni se puede volver a tirar
recargando la página. También hace que una carrera completa sea reproducible
para depurar y testear.

---

## 6. La conexión entre los dos

### 6.1 Confianza

Variable compartida, 0–100, arranca en 60.

| Rango                       | Efecto                                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| > 80                        | `+5` al rendimiento del futbolista, `+10 %` de margen en las negociaciones, las propuestas se aceptan sin tirada |
| 40 – 80                     | Normal                                                                                                           |
| < 40                        | `−5` al rendimiento, el futbolista puede rechazar pases (tirada), aparecen eventos de malas declaraciones        |
| < 15 al cierre de la fase 3 | El futbolista **cambia de representante**. Game over del representante                                           |

Deriva natural: `−2` por temporada sin ninguna interacción positiva. La relación
se enfría sola si nadie la trabaja.

### 6.2 La negociación del contrato de representación

**Decisión: formalizada en pantalla y vinculante, pero liviana.** Tres rondas, un
mensaje corto, y se acabó. No es un minijuego.

**Cuándo**: en la fase 3, después de resolver el contrato con el club (así se
negocia sobre un número conocido). Obligatoria en la temporada 1 y cada vez que
se firma un contrato nuevo con un club.

**Instrumento**:

```ts
type ContratoRepresentacion = {
	pctSalario: number; // 5–10
	pctTransferencia: number; // 0–10
	bonos: Bono[]; // por título, convocatoria, goles, reventa
	duracionTemporadas: number; // 1–5
	clausulaSalida: number; // USD
};
```

**Protocolo**:

1. El representante hace una propuesta.
2. El futbolista **acepta / rechaza / contraoferta**, con un campo de texto libre
   de 140 caracteres que viaja como mensaje. Eso le da un ancla adentro del juego
   a la charla que igual van a tener por WhatsApp.
3. Máximo **3 rondas**.
4. Sin acuerdo: se prorroga el contrato anterior una temporada, `−10` de
   confianza para los dos. En la temporada 1 (no hay anterior) se aplica el
   contrato estándar del ambiente (5 % de salario, 5 % de transferencia) con
   `−15` de confianza.
5. Cada rechazo: `−5` de confianza. Acuerdo cerrado en la primera ronda: `+8`.
6. Con confianza < 30 el futbolista puede romper unilateralmente pagando la
   cláusula. Fin de la partida para el representante.

### 6.3 La negociación de un pase

El futbolista y el representante ven cosas distintas de la misma operación:

- **El representante ve**: el monto ofrecido, el salario, su comisión, los bonos,
  qué otros clubes están mirando, y —si tiene analista de datos— cuánto juega un
  jugador de ese perfil en ese club.
- **El futbolista ve**: qué club es, qué liga, qué salario le queda a él, qué
  dice la prensa, y qué le transmite su representante.

El futbolista expresa preferencias (_quiero aceptar / quiero quedarme / quiero
otro club / quiero más salario / quiero jugar la Libertadores_). El representante
negocia. Con confianza alta, la preferencia del futbolista pesa poco en la
tirada; con confianza baja, puede directamente vetar la operación.

### 6.4 Información oculta (v2)

El sistema de acciones ocultas y filtraciones probabilísticas de
`diseno-inicial.md` **no entra en el MVP**. Es el sistema más caro de construir y
de balancear, y necesita la partida andando para saber si el riesgo se siente
bien. La confianza sí entra desde el día uno, y el modelo de datos ya lo
contempla: el campo `visible_para` está en la tabla `log` desde la primera
migración, así que sumar acciones ocultas después no obliga a rehacer nada.

---

## 7. Los dos puntajes y el retiro

No compiten entre sí: a los dos les conviene que al futbolista le vaya bien. Pero
puntúan por cosas distintas.

### 7.1 Futbolista — Puntaje de Legado

```
PL = 10 × goles_ponderados
   +  6 × asistencias
   + 150 × titulos_locales
   + 400 × titulos_internacionales
   + 0,02 × minutos
   + 250 × clubes_donde_es_idolo
   +  3 × fama_final
   + bonus_seleccion            (20 × partidos + 500 por Mundial ganado)
   − 200 × temporadas_perdidas  (lesión larga o banco)

PL_final = PL × (1 + 0,05 × max(0, temporadas_en_el_club_mas_largo − 3))
```

`goles_ponderados`: liga local ×1, liga extranjera fuerte ×1,5, torneo
internacional ×2.

El multiplicador de permanencia es el que le da sentido a quedarse, y es el que
choca de frente con la comisión por transferencia del representante.

Al final se ubica el `PL` en una tabla de rangos y sale la comparación: _"tu
carrera se parece a la de …"_.

### 7.2 Representante — Puntaje de Carrera

```
PC = 0,001 × dinero_acumulado_usd
   +  40 × calidad_media_de_contratos    (0–100)
   +   4 × prestigio_final
   +  15 × contactos_de_nivel            (dirigentes con relación > 60)
   + 300  si el futbolista se retiró siendo ídolo de algún club
   − 500  si perdió la representación antes del retiro
```

`calidad_media_de_contratos = f(salario vs. mercado del club, años, cláusulas,
bonos cumplidos)`.

El bono de legado compartido y el peso del prestigio son los que atan al
representante al éxito deportivo, no solo al movimiento.

---

## 8. La pantalla de fin de temporada

Es la pantalla más importante del juego y las dos personas ven la misma, con la
sección de la otra plegada.

**Bloque 1 — periódico deportivo.** Titular, nota de la temporada, goles,
asistencias, partidos, posición del club, títulos, qué hizo el archirrival, qué
se viene el año que entra.

**Bloque 2 — el representante.** Representados, ingresos de la temporada,
progresión de atributos, prestigio (antes → después), operaciones cerradas,
nuevos descubrimientos.

**Bloque 3 — la relación.** Confianza (antes → después) y las dos o tres cosas
que la movieron.

Botón **Continuar** → arranca la temporada siguiente.

Los textos de esta pantalla los redacta la capa narrativa (sección 10) a partir
de números que ya decidió el motor.

---

## 9. Stack y arquitectura

### 9.1 Decisión

| Pieza     | Elección                                              | Por qué                                                                                                           |
| --------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Lenguaje  | **TypeScript** en todo                                | El motor, el servidor y la UI en un solo lenguaje; el motor se testea sin navegador                               |
| Framework | **SvelteKit** (adapter-node)                          | Las _form actions_ encajan exactamente con "mando mi decisión y se re-renderiza"; SSR por defecto, poco andamiaje |
| Base      | **SQLite** (`better-sqlite3`) + **Drizzle ORM**       | Transacciones síncronas: la barrera de fase se hace bien y en una sola transacción. Schema tipado y migraciones   |
| Deploy    | **Fly.io**, una máquina chica + volumen de 1 GB       | Barato y con disco persistente. Alternativa igual de válida: cualquier VPS con Caddy adelante                     |
| Contenido | Archivos TS/JSON en `content/`, validados con **Zod** | Agregar eventos sin tocar el motor                                                                                |
| Tests     | **Vitest**                                            | Incluye simular 1.000 carreras completas al azar buscando estados imposibles                                      |

Evito serverless a propósito: SQLite con volumen y el lock de la barrera piden un
proceso con disco.

### 9.2 Las cuatro capas (como pidió Bebo)

```
content/          Eventos, textos, tablas de clubes y jugadores. Datos, no código.
src/lib/engine/   GAME ENGINE. Módulo puro, sin I/O:
                    resolverFase(estado, decisiones, rng) → { estado, log }
src/lib/db/       GAME STATE. Schema, migraciones, repositorios.
src/lib/narrative/ AI LAYER. Toma números ya decididos y devuelve texto.
src/routes/       UI. Una vista por rol, mobile-first.
```

El motor es una función pura. Si algún día quieren mudarse de framework, se mueve
el envoltorio y no el juego.

### 9.3 Cómo se sostiene la información por rol

El servidor arma la proyección de cada jugador y **nunca manda al cliente lo que
no le corresponde**. No es que el front lo oculte: no viaja. La tabla `log` tiene
`visible_para` desde la primera migración y toda consulta la filtra.

### 9.4 La barrera de fase

Al llegar la última decisión pendiente, en **una sola transacción**: se toma un
lock sobre la fila de la partida, se verifica que las dos bandejas estén
completas, se resuelve, se escriben snapshot y log, y se avanza la fase.
Idempotente por `(partida, temporada, fase)`.

---

## 10. La capa narrativa

Bebo la pidió y entra, con tres candados.

**Candado 1 — la IA no toca ningún número.** El motor resuelve todo y recién
después se le pasan los resultados ya calculados. La respuesta se pide con
_structured outputs_ contra un schema que **solo tiene campos de texto**: no hay
forma de que devuelva un valor que el motor vaya a leer.

```ts
const response = await client.messages.create({
	model: 'claude-opus-5',
	max_tokens: 2000,
	output_config: {
		effort: 'low',
		format: { type: 'json_schema', schema: resumenTemporadaSchema }
	},
	system: [{ type: 'text', text: MANUAL_DE_ESTILO, cache_control: { type: 'ephemeral' } }],
	messages: [{ role: 'user', content: JSON.stringify(hechosDeLaTemporada) }]
});
```

**Candado 2 — todo texto generado se guarda en la base.** La partida es
reproducible, volver atrás muestra lo mismo, y recargar la pantalla no gasta una
llamada. Se genera una sola vez, al cerrar la fase 3.

**Candado 3 — plantillas como fallback.** Si la API falla o no hay clave
configurada, el resumen sale de plantillas con variables. Más seco, pero el juego
no se cae nunca por una dependencia externa.

**Dónde se usa**: la pantalla de fin de temporada y las declaraciones a la
prensa. Los eventos son contenido escrito a mano — necesitan opciones y efectos
balanceados, y eso no se delega.

**Costo.** Modelo `claude-opus-5` (USD 5 por millón de tokens de entrada, USD 25
de salida). El manual de estilo va cacheado, así que la mayor parte de la entrada
se lee a precio de caché. Una temporada son unos 600 tokens de salida y unos 3.000
de entrada: **cerca de USD 0,02 por temporada, menos de USD 0,50 por carrera
completa**. No es una restricción de diseño.

---

## 11. Plazos y abandono

Cuatro mecanismos, en escala:

1. **Plazos por fase.** Configurables por partida, 48 h por defecto, con aviso a
   las 24 h.
2. **Piloto automático.** Al vencer el plazo por segunda vez, el servidor resuelve
   las decisiones pendientes con la opción marcada `defecto` de cada evento, y lo
   deja anotado en el log como resuelto automáticamente. No penaliza el puntaje,
   pero sí `−3` de confianza: no apareció.
3. **Pausa explícita.** Cualquiera de los dos congela los plazos.
4. **Cierre anticipado.** Si uno abandona de verdad, el otro elige entre seguir en
   **modo solitario** (el rol vacante lo maneja el piloto automático hasta el
   retiro) o forzar el **retiro anticipado** y ver la pantalla final con lo
   conseguido hasta ahí, marcada como carrera incompleta.

La partida nunca se borra. El estado y el log quedan, y se puede retomar.

---

## 12. Cómo se construye

| Hito   | Qué tiene que andar                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------------------- |
| **M0** | Crear partida, código de invitación, dos roles, las tres fases con barrera, sin contenido                   |
| **M1** | Motor puro + 10 eventos + progresión de atributos + la rueda de ocasión                                     |
| **M2** | Fase 3: ofertas, renovación y la negociación del contrato de representación                                 |
| **M3** | Las dos economías: entorno del futbolista, staff y agenda del representante, y el gesto de pagar el entorno |
| **M4** | Pantalla de fin de temporada con capa narrativa, y confianza andando de punta a punta                       |
| **M5** | Retiro, los dos puntajes, comparación con figura histórica                                                  |
| **M6** | Contenido: llegar a 120 eventos, mundo vivo, archirrival persistente                                        |
| **v2** | Acciones ocultas y filtraciones                                                                             |

El ciclo completo que pidió Bebo —crear los dos, vincularlos, jugar una
temporada, que se crucen al menos una vez, resumen, progresión, empezar la
temporada 2— cierra en **M4**.

---

## 13. Lo que queda abierto

Cosas que **no** se pueden decidir en un documento y se resuelven jugando o
midiendo:

1. **La tabla de números reales.** Sueldos por categoría, montos de pases,
   costos del entorno y del staff: los rangos de este documento son de escala
   correcta, pero hay que calibrarlos contra datos reales del fútbol argentino y
   europeo antes de implementar la economía. Es una tarde de investigación.
2. **Balance del ritmo de progresión.** Cuántos puntos por temporada, cuánto pesa
   el potencial, a qué velocidad se acumula el desgaste. Sale de simular carreras,
   no de discutirlo.
3. **El tono de los textos.** El manual de estilo de la capa narrativa se escribe
   una vez que haya tres o cuatro resúmenes generados para comparar.
4. **La tabla de figuras históricas** para la comparación final del futbolista.
5. **Si la confianza alcanza sola.** Si con confianza pero sin acciones ocultas el
   juego ya se siente como una relación con riesgo, la v2 puede no hacer falta. Se
   sabe recién con una carrera completa jugada de verdad.
