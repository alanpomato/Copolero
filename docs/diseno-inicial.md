# Copero cooperativo — jugador y representante

Documento de diseño inicial. Proyecto de Alan y Bebo.

---

## 1. Qué es

Un juego de carrera de futbolista para **dos personas**, jugado entre ellos dos.
Un rol es el **futbolista**, el otro es su **representante**. Los roles se reparten
al empezar la partida (cualquiera puede ser cualquiera).

Referencia principal: **El Ídolo**, de Potrero Fútbol
(https://www.potrerofutbol.ar/el-idolo).

Lo que se toma de El Ídolo:

- Motor de eventos, no simulador de partidos. Se presenta una situación, se elige
  entre opciones, se actualizan variables de estado, siguiente evento.
- Carrera completa desde el Ascenso hasta el retiro.
- Pantalla final de retiro con resumen, logros y puntaje.
- Corre en navegador, sin instalar nada.

Lo que se agrega: el segundo jugador humano en el rol de representante.

---

## 2. Restricción técnica

Debe correr en un servidor web accesible por los dos, no solo en la PC de Bebo
(abrir puerto y exponer la máquina quedó descartado por incómodo).

A favor: el juego es **por turnos y asincrónico**, así que no hace falta tiempo
real, ni websockets, ni que los dos estén conectados a la vez. Alcanza con
persistir el estado de la partida y que cada uno entre cuando pueda.

---

## 3. Estructura de juego

### Estado compartido

Hay **un solo futbolista** y un solo estado de partida:

- Edad, stats deportivas, forma, moral
- Fama, relación con la hinchada, relación con el DT
- Club actual, contrato (monto, años restantes)
- Confianza jugador ↔ representante (ver sección 5)

### La temporada como ronda

Cada temporada se resuelve en **3 fases**. En cada fase los dos deciden en
paralelo y **la fase no avanza hasta que ambos cerraron sus decisiones**.

**Fase 1 — Pretemporada**

| Futbolista                                      | Representante                      |
| ----------------------------------------------- | ---------------------------------- |
| Plan de entrenamiento                           | A qué clubes visita                |
| Vida personal (tatuaje, fiestas, dieta, pareja) | Con qué dirigentes y colegas habla |
| Objetivos declarados de la temporada            | Qué exige al club actual           |

**Fase 2 — Temporada**

Se simula el año. Salen eventos, y **cada evento cae en la bandeja de uno u
otro**: lesión, clásico, pelea con el DT y minutos van al futbolista; sondeo de
un club, nota de prensa, oferta informal y contactos van al representante.

**Fase 3 — Mercado**

Ofertas, renovación, pases, y la negociación del salario del representante.
Es la fase donde los intereses de los dos chocan.

---

## 4. Los dos puntajes

Cada uno tiene su propio puntaje. **No compiten entre sí**: los dos suben si al
futbolista le va bien. Pero puntúan por cosas distintas.

**Futbolista**: goles, asistencias, títulos, minutos, legado, ser ídolo de un
club, comparación final con una figura histórica.

**Representante**: dinero acumulado (salario + porcentaje de pases), calidad de
los contratos cerrados, prestigio en el ambiente, red de contactos.

La tensión estructural: **el representante cobra por movimiento, el futbolista
puntúa por permanencia.** Un pase al exterior puede ser el mejor negocio del
representante y el peor año del futbolista. Eso es lo que hace que haya algo que
negociar de verdad, sin que sea competencia.

---

## 5. Información oculta y confianza

Es el mecanismo central. Sin esto, el juego son dos partidas solitarias en la
misma pantalla.

- Cada uno ve **solo su pantalla**. Las decisiones se hablan por afuera (WhatsApp,
  en persona), pero nada obliga a contar todo.
- Algunas acciones se pueden marcar como **ocultas**: negociar con otro club por
  atrás, aceptar un sobre, rechazar una oferta sin avisar, entrenar de menos,
  declarar algo a la prensa.
- Toda acción oculta tiene **probabilidad de filtrarse**: prensa, un dirigente que
  habla de más, un familiar del jugador.

**Confianza** es la variable que le da peso a todo eso:

- Alta: el otro acepta propuestas sin resistencia, bonus de moral y de
  rendimiento, mejores condiciones en las negociaciones.
- Baja: se rechazan pases, cae el rendimiento, aparecen malas declaraciones.
- En el piso: el futbolista **cambia de representante**. Es el game over del
  representante.

Con esto, "jugar agresivo" o "jugar profesional" deja de ser un modo declarado y
pasa a ser una apuesta con riesgo real.

---

## 6. Lo que falta definir

- Duración de la carrera: cuántas temporadas, edad de retiro, ritmo real (¿una
  temporada por día?).
- Tabla de eventos: cuántos, cómo se ponderan, cuáles son exclusivos de cada rol.
- Fórmula concreta de los dos puntajes.
- Cómo se formaliza la negociación del salario del representante dentro del juego
  (¿oferta/contraoferta en pantalla, o se acuerda hablando y solo se carga el
  número?).
- Modelo de datos y stack.
- Qué pasa si uno de los dos deja de jugar a mitad de carrera.
