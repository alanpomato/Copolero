# Spec de Bebo — juego cooperativo jugador + representante

Mensaje recibido de Bebo, transcripto tal cual para tener trazabilidad.
Las decisiones tomadas a partir de este texto están en `diseno-tecnico.md`.

---

Quiero que desarrolles una primera versión jugable de un juego web/app de
gestión narrativa de fútbol inspirado conceptualmente en los juegos de carrera
futbolística por temporadas, pero con una mecánica diferencial: dos jugadores
humanos comparten la misma partida y tienen dos roles diferentes: FUTBOLISTA y
REPRESENTANTE.

La primera versión debe ser un MVP funcional, no hace falta implementar todas
las mecánicas posibles. Lo prioritario es demostrar que el sistema de dos
carreras conectadas funciona.

## 1. Concepto central

Dos personas comienzan una partida compartida.

**Jugador A — FUTBOLISTA.** Comienza su carrera como futbolista joven, por
ejemplo a los 16 años. Tiene: nombre, edad, nacionalidad, posición, club, media
general, atributos, valor de mercado, dinero ganado, fama/idolatría,
estadísticas de temporada, historial de carrera, títulos, reputación,
potencial.

**Jugador B — REPRESENTANTE.** Comienza aproximadamente al mismo tiempo como
representante joven y novato. Su carrera también progresa. Tiene: nombre, edad,
reputación, dinero, nivel de agencia, jugadores representados, atributos
propios, historial de carrera, staff, consumibles, comisiones obtenidas.

El representante comienza representando al futbolista principal. A medida que
pasan las temporadas puede incorporar otros jugadores a su cartera.

El eje de la partida siempre debe ser la carrera del futbolista principal, pero
la carrera del representante debe evolucionar paralelamente y tener progresión
propia.

## 2. Una única partida compartida

No quiero dos partidas independientes. Debe existir un único estado de partida:
temporada actual, futbolista principal, representante, clubes, mercado, otros
jugadores, eventos, contratos, dinero, historial, relaciones.

Las dos interfaces consultan y modifican ese mismo estado.

El futbolista NO debe poder modificar directamente las estadísticas o
decisiones internas del representante. El representante NO debe poder modificar
directamente las estadísticas personales del futbolista. Cada uno tiene
información y decisiones propias.

## 3. Sistema de temporadas

La partida avanza temporada por temporada (T1: 16 → 17 años, T2: 17 → 18, etc.).

**Fase A — Pretemporada.** El futbolista puede entrenar, mejorar atributos,
elegir objetivos, tomar decisiones personales. El representante puede mejorar
sus atributos, gestionar su cartera, buscar nuevos jugadores, comprar staff,
comprar consumibles, preparar negociaciones.

**Fase B — Temporada.** El motor simula la actividad futbolística. No quiero un
simulador de FIFA ni controlar partidos manualmente. El sistema debe producir
acontecimientos y situaciones. Ejemplo: "⚽ OCASIÓN DE GOL — Tu equipo juega
contra Independiente. Tenés una oportunidad." La acción se resuelve mediante un
sistema probabilístico. Puede existir una rueda o sistema visual de azar
controlado con resultados como GOL / PALO / ATAJADA / AFUERA. La probabilidad de
cada resultado debe depender de los atributos del futbolista, contexto y otros
modificadores. El resultado modifica las estadísticas de la temporada.

## 4. Eventos narrativos

Para el futbolista: lesión, oferta de otro club, conflicto con entrenador,
mejora de rendimiento, bajón de rendimiento, rivalidad con otro jugador,
convocatoria a selección, problemas contractuales, aparición de un patrocinador,
presión de la prensa, oportunidad de convertirse en titular.

Para el representante: club interesado en un representado, jugador juvenil que
quiere ser representado, negociación contractual, club que rechaza una oferta,
oportunidad de scouting, contacto con un director deportivo, rivalidad con otro
representante, aumento de reputación, pérdida de reputación.

Claude puede utilizar IA para generar el texto narrativo, pero las reglas y
números deben estar controlados por el código, no inventados libremente por la
IA.

## 5. Conexión entre futbolista y representante

Esta es la mecánica más importante del juego. Cuando existe una situación que
afecta al futbolista y al representante, ambos deben participar.

El futbolista recibe: "📩 OFERTA DEL VALENCIA — El Valencia quiere
incorporarte." El representante recibe: "📞 NEGOCIACIÓN — Valencia ofrece €8M,
salario €2M/año, comisión X%."

El representante puede negociar. El futbolista puede expresar preferencias:
quiero aceptar / quiero quedarme / quiero otro club / quiero mejorar salario /
quiero jugar Champions. El representante puede tener una opinión diferente
("prefiero esperar porque tengo interés del Dortmund"). Esto debe generar
decisiones y consecuencias.

## 6. Sincronización

La partida debe poder jugarse de manera asincrónica. No es necesario que los dos
usuarios estén conectados simultáneamente. Cada rol puede completar sus
decisiones.

Estados posibles: `WAITING_FOR_PLAYER`, `WAITING_FOR_AGENT`, `BOTH_READY`,
`RESOLVING`, `SEASON_COMPLETE`.

La temporada solamente avanza cuando todas las decisiones necesarias estén
resueltas. También debe existir un modo donde los dos jugadores estén conectados
simultáneamente y puedan tomar decisiones juntos.

## 7. Progresión del futbolista

Atributos que puedan mejorar: definición, velocidad, potencia, resistencia,
liderazgo, pase, regate, defensa, potencial. No es necesario implementar
demasiados atributos en el MVP. El jugador obtiene puntos de progresión y decide
dónde invertirlos. La media general debe calcularse a partir de los atributos.
También debe existir valor de mercado, fama/idolatría, dinero ganado, partidos,
goles, asistencias, títulos.

## 8. Progresión del representante

Para el MVP: negociación, scouting, contactos, reputación. Opcionalmente
persuasión, marketing, gestión financiera. Estas estadísticas afectan las
probabilidades y resultados de sus situaciones (mayor negociación → mejores
contratos; mayor scouting → más probabilidad de descubrir jugadores con
potencial; mayor reputación → mejores jugadores aceptan ser representados;
mayores contactos → acceso a más clubes y oportunidades). El representante
obtiene puntos de progresión y decide dónde invertirlos.

## 9. Cartera del representante

Al comenzar tiene solamente al futbolista principal. Con el paso de las
temporadas puede descubrir y representar otros jugadores (T1: 1 jugador, T3: 3,
T6: 7, etc.). Los otros jugadores deben existir en el mundo del juego aunque
tengan una importancia secundaria. El futbolista principal sigue siendo el
centro. El representante obtiene comisiones de sus jugadores, lo que permite que
su carrera económica crezca independientemente.

## 10. Staff del representante

Mejoras permanentes que cuestan dinero y quedan activas durante la partida:
analista de mercado (mejora oportunidades comerciales), ojeador personal (mejora
descubrimiento de jóvenes talentos), abogado deportivo (mejora contratos y
reduce riesgos), especialista en marketing (mejora la fama de los
representados), director de relaciones (mejora relaciones con clubes), asistente
de agencia (permite manejar una cartera mayor).

## 11. Consumibles del representante

Duran 1 o 2 temporadas y tienen efectos temporales: informe confidencial (revela
información adicional sobre una negociación), contacto VIP (mejora una
negociación concreta), campaña de prensa (aumenta temporalmente la fama de un
representado), viaje de scouting (mejora las posibilidades de encontrar un
talento), asesoría legal exprés (reduce el riesgo de una negociación). Deben ser
recursos limitados y no simplemente bonificaciones permanentes.

## 12. Tienda

Pantalla con dos categorías: STAFF (mejoras permanentes) y CONSUMIBLES (objetos
temporales). Mostrar nombre, precio, descripción, duración, efecto y botón de
compra. El dinero del representante proviene principalmente de las comisiones de
sus jugadores.

## 13. Final de temporada

Esta pantalla es MUY importante. Al finalizar una temporada debe generarse un
resumen narrativo. Ejemplo conceptual:

> POTRERO DEPORTIVO — 2026 · TEMPORADA 1
> ¡LA COPA SE QUEDA EN CASA! Huracán campeón de la Copa Argentina.
> NOTA DE LA TEMPORADA: 5,6
> ⚽ 0 goles · 🤝 3 asistencias · 14 partidos
> Huracán terminó 8.º en Liga. 🏆 Copa Argentina.
> 🔥 Tu archirrival Damián Correa hizo 2 goles y 3 asistencias.
> 📈 El año que viene se juega la Libertadores.

Después una segunda sección:

> TU REPRESENTANTE
> 👤 1 jugador representado · 💰 Ingresos de temporada: $X
> 📈 Negociación +2 · 🔎 Scouting +1 · ⭐ Reputación: 8 → 13
> 👥 Nuevos jugadores descubiertos: 1

El resumen debe contar una pequeña historia de lo ocurrido durante el año. Debe
sentirse como un periódico deportivo / resumen de temporada. Finalmente un botón
CONTINUAR que inicia la siguiente temporada.

## 14. Mundo vivo

Debe existir un pequeño universo futbolístico. No es necesario crear miles de
jugadores en el MVP, pero sí otros clubes, otros jugadores, rivales,
competiciones, entrenadores, representantes y mercado. Los personajes
importantes pueden conservarse entre temporadas (por ejemplo, un archirrival que
sigue apareciendo durante varios años). Esto permite crear historias
recurrentes.

## 15. Filosofía del gameplay

No quiero que sea un simulador complejo. La filosofía debe ser:

EVENTO → DECISIÓN → AZAR/ESTADÍSTICAS → RESULTADO → CONSECUENCIA → PROGRESIÓN →
NUEVO EVENTO

El jugador debe sentir que cada temporada cuenta una historia diferente. Debe
haber incertidumbre, pero las estadísticas y decisiones deben influir claramente
en las probabilidades. No quiero resultados completamente aleatorios.

## 16. Diseño visual

Interfaz mobile-first. Inspiración conceptual: tarjetas grandes, fondo oscuro,
estética deportiva, tipografía fuerte, estadísticas muy visibles, botones
grandes, colores diferenciados para estados positivos/negativos, sensación de
aplicación deportiva moderna.

NO copiar exactamente logos, textos, imágenes o elementos protegidos de otros
juegos. Crear una identidad visual propia. La interfaz debe sentirse como una
mezcla entre juego de carrera deportiva, aplicación de estadísticas, periódico
deportivo y RPG de progresión.

## 17. Pantallas del MVP

1. **Crear partida** — nombre del futbolista, edad inicial, nacionalidad,
   posición, club inicial; y crear al representante: nombre, edad, atributos
   iniciales.
2. **Dashboard del futbolista** — media, edad, club, posición, atributos, valor,
   dinero, fama, estadísticas, botón "Continuar".
3. **Dashboard del representante** — reputación, dinero, atributos, jugadores
   representados, staff, consumibles, botón "Continuar".
4. **Evento** — tarjeta narrativa con título, descripción, posibles decisiones y
   consecuencias potenciales.
5. **Negociación jugador / representante** — mostrar la oferta al representante
   con sus datos, mostrar al futbolista la información que corresponde a su rol,
   permitir que ambos tomen decisiones.
6. **Tienda del representante** — staff + consumibles.
7. **Final de temporada** — resumen deportivo + resumen del representante +
   acontecimientos + progresión.

## 18. Arquitectura importante

No quiero que Claude sea responsable de almacenar la lógica de la partida.
Separar conceptualmente:

- **GAME STATE** — datos persistentes de la partida.
- **GAME ENGINE** — reglas, probabilidades, cálculos, economía y progresión.
- **AI/NARRATIVE LAYER** — Claude genera textos, eventos narrativos y
  conversaciones basándose en el estado real.
- **UI** — interfaz específica de cada rol.

La IA nunca debe poder modificar arbitrariamente dinero, edad, atributos,
contratos, estadísticas ni resultados. El motor debe decidir esos valores.
Claude puede explicar y narrar los resultados.

## 19. Objetivo de esta primera versión

No intentar construir todavía un juego completo. Un MVP que permita demostrar
este ciclo:

1. Crear futbolista. 2. Crear representante. 3. Vincularlos. 4. Jugar una primera
temporada. 5. El futbolista toma decisiones. 6. El representante toma
decisiones. 7. Aparece al menos una situación donde ambos tengan que
interactuar. 8. Se simula la temporada. 9. Se genera un resumen narrativo.
10. Ambos reciben progresión. 11. El representante puede comprar al menos un
staff y un consumible. 12. El representante puede descubrir/incorporar un
segundo jugador. 13. Comenzar la temporada 2.

La prioridad absoluta es que la partida compartida funcione y que se sienta que
estamos jugando dos carreras diferentes dentro del mismo universo.

Una vez que esto funcione, podremos ampliar progresivamente: mercado de
fichajes, contratos complejos, selección, patrocinadores, más atributos, más
competiciones, lesiones, rivalidades, prensa, agencias, empleados, jugadores
generados proceduralmente, multijugador online real, partidas persistentes,
temporadas ilimitadas.

Primero quiero una versión pequeña pero jugable, coherente y divertida.
