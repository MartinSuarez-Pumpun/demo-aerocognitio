# AeroCognitio — Arquitectura y plan de implementación

> Batería psicotécnica corta (5-7 min) para selección/orientación de personal
> de sistemas no tripulados. Demo para evento de tecnología aplicada a la
> enseñanza militar.

## Nombre de trabajo

**AeroCognitio** — funciona bien para el contexto, suena técnico, no compromete
marca. Alternativas: *Skyline Assessment*, *Centinela Cognitivo*, *Pumpún Aero*.
Elegir antes de producir.

## Objetivos de producto

1. **5-7 minutos** de duración total, incluida pantalla de informe.
2. **Tres pruebas** integradas en un solo flujo, no demos sueltas.
3. **Informe final con IA** que sintetice el rendimiento en lenguaje natural,
   modulado por el rol objetivo elegido al inicio.
4. **Aspecto militar profesional** (HUD, sobrio, tipografía técnica, paleta
   oscura con acento ámbar o verde fósforo).
5. **Autónomo en stand**: arranca con un clic, termina con informe imprimible
   o exportable, listo para el siguiente visitante.

## Stack técnico

**Frontend (todo el peso aquí):**
- React 18 + TypeScript 5 + Vite
- Three.js vía `@react-three/fiber` + `@react-three/drei`
- Tailwind CSS para layout
- Framer Motion para transiciones de bloque
- Zustand para estado global de sesión (más simple que Redux para esto)
- Zod para validar el JSON del informe IA

**Persistencia local:**
- IndexedDB (o solo localStorage) para guardar sesiones completas durante
  la feria, exportables como JSON al final del día.

**Llamada IA:**
- Opción A (rápida, demo): API de Anthropic directa desde el cliente con
  key acotada y monitorizada.
- Opción B (limpia): proxy ligero (Cloud Function, endpoint en Dify, o n8n
  webhook ya existente) que recibe métricas y devuelve informe.
  **Recomendado para producción.**

**Sin Python, sin Laravel, sin DB de servidor.** Cero infra.

## Arquitectura de carpetas (propuesta)

```
src/
├── core/
│   ├── types.ts              # tipos del esquema completo
│   ├── store.ts              # zustand store de la sesión
│   ├── telemetry.ts          # captura de pointer tracks
│   ├── scoring.ts            # cálculo de métricas derivadas
│   └── aiReport.ts           # llamada a la API + validación con zod
├── ui/
│   ├── theme.ts              # tokens (colores, tipografía)
│   ├── components/
│   │   ├── HudFrame.tsx      # marco visual HUD reutilizable
│   │   ├── ProgressBar.tsx
│   │   ├── InstructionsCard.tsx
│   │   └── PrintableReport.tsx
│   └── screens/
│       ├── WelcomeScreen.tsx
│       ├── RoleSelectionScreen.tsx
│       ├── BlockTransitionScreen.tsx
│       └── ReportScreen.tsx
├── tests/
│   ├── mental-rotation/
│   │   ├── MentalRotationBlock.tsx
│   │   ├── FigureGenerator.ts       # genera figuras procedurales
│   │   ├── FigureRenderer.tsx       # R3F component
│   │   └── trialBuilder.ts          # construye items con dificultad gradual
│   ├── spatial-orientation/
│   │   ├── SpatialOrientationBlock.tsx
│   │   ├── AircraftView.tsx         # R3F: avión en 3D
│   │   ├── AttitudeIndicator.tsx    # SVG: horizonte artificial
│   │   └── trialBuilder.ts
│   └── spatial-memory/
│       ├── SpatialMemoryBlock.tsx
│       ├── TacticalGrid.tsx
│       └── trialBuilder.ts
├── App.tsx
└── main.tsx
```

## Flujo del usuario

```
┌───────────────────────────────────────────────────────────────┐
│  0. Welcome (10s)        — "Iniciar evaluación"                │
│  1. Role Selection (15s) — elige rol objetivo                  │
│  2. Mental Rotation      — 6 items, ~2 min                     │
│     ├ Instrucciones (10s)                                      │
│     ├ Práctica (2 items, no cuentan)                           │
│     └ Ítems reales (6 items)                                   │
│  3. Spatial Orientation  — 6 items, ~2 min                     │
│  4. Spatial Memory       — 4 items, ~1.5 min                   │
│  5. Processing screen    — 3-5s con animación, llamada al LLM  │
│  6. Report screen        — dashboard + informe IA              │
│     └ Botón "Nueva sesión" para el siguiente visitante         │
└───────────────────────────────────────────────────────────────┘
```

## Cálculo de métricas (resumen)

```
mr_accuracy = correctas / total
mr_meanReactionMs = mean(reactionTimeMs)
mr_rtSlopeMsPerDeg = regresión lineal de RT vs rotationAngleDeg
mr_consistencyScore = 1 - (std(RT por bin de ángulo) / mean(RT))

so_accuracy, so_meanReactionMs: directos
so_hesitationRate = items con >=1 answerChange / total

sm_positionRecallRate = sum(correctPositions) / sum(totalTargets)
sm_typeRecallRate = sum(correctTypes) / sum(totalTargets)
sm_capacity = mean(correctPositions por item)
```

## Diseño visual (decisiones clave)

- **Paleta base:** fondo `#0a0e14` (casi negro azulado), acento principal
  `#ffb547` (ámbar HUD), acento secundario `#5fe3b0` (verde radar), texto
  primario `#e8eef5`, alerta `#ff5252`.
- **Tipografía:** monoespaciada para datos (JetBrains Mono o Geist Mono);
  sans técnica para narrativa (Inter o Geist).
- **Marco HUD:** esquinas con corchetes [⌐ ¬], grids tenues de fondo,
  scanlines sutiles. Sin abusar: la prueba en sí debe respirar.
- **Sonido (opcional pero recomendado):** clicks sintéticos al confirmar,
  un "blip" de radar al cambiar de bloque. Subir el caché-factor del stand.

## Roadmap de implementación (orden sugerido para vibe-coding)

1. **Día 1 — Esqueleto y theme.** Vite + Tailwind + theme tokens + welcome
   screen + role selection + transición entre bloques. Sin pruebas todavía.
2. **Día 2 — Rotación mental.** FigureGenerator procedural + Renderer 3D +
   captura de telemetría + scoring. El más sólido de los tres, déjalo bien
   pulido porque marca el tono.
3. **Día 3 — Orientación espacial.** AircraftView 3D + AttitudeIndicator SVG.
   Es la prueba más militar; ojo a la coherencia pitch/roll entre vista 3D
   y el indicador.
4. **Día 4 — Memoria espacial.** Más sencilla (grid 2D + iconos tácticos),
   pero cuida la exposición/ocultación con buena animación.
5. **Día 5 — Informe IA + dashboard.** Cálculo de métricas + llamada al LLM
   + render del informe + versión imprimible.
6. **Día 6 — Pulido, sonido, modo demo continuo, fallback offline.**

## Decisiones pendientes antes de empezar

- [ ] Confirmar nombre del producto
- [ ] Elegir entre llamada directa a Anthropic o proxy (recomendado proxy)
- [ ] Logo y colores corporativos finales (Pumpún Dixital + cliente final)
- [ ] Soporte de idiomas: ¿ES solo o ES + EN para el evento?
- [ ] ¿Imprimir QR al final con el informe para llevar?

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| API IA cae en feria | Caché de 4-5 informes prefabricados por rol |
| Visitante abandona a mitad | Botón "Saltar a informe demo" con datos sintéticos |
| Pantalla touch en stand | Layout responsive + inputs grandes desde el día 1 |
| Dispositivo lento, lag en R3F | Reducir polígonos, deshabilitar shadows, perfilar |
| Sesiones se acumulan localmente | Botón export JSON + reset al final del día |

## Compromiso ético (para tener pulida la respuesta en feria)

Si alguien pregunta — y van a preguntar — *"¿esto decide si una persona
puede ser piloto?"*:

> "No. Esto es un apoyo al evaluador humano. Mide patrones de rendimiento
> en tareas específicas relacionadas con habilidades espaciales y de memoria.
> Las decisiones de selección requieren batería completa, entrevista,
> evaluación médica y la supervisión de personal cualificado. Lo que la IA
> hace aquí es leer datos cuantitativos y traducirlos a lenguaje
> interpretable para el evaluador, no sustituirlo."
