// ============================================================================
// AEROCOGNITIO — Batería psicotécnica para selección RPAS
// Esquema de datos completo (TypeScript)
// ============================================================================

// ---------- Configuración inicial ----------
export type TargetRole =
  | 'rpas_pilot_class_ii'    // Piloto RPAS Clase II (vuelo táctico)
  | 'sensor_operator'        // Operador de sensores / cámara
  | 'image_analyst'          // Analista de imágenes / inteligencia
  | 'mission_controller';    // Controlador de misión

export interface SessionConfig {
  sessionId: string;          // UUID generado en cliente
  evaluatorCode?: string;     // Código del evaluado (opcional, anónimo OK)
  targetRole: TargetRole;
  startedAt: string;          // ISO timestamp
  deviceInfo: {
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
    pixelRatio: number;
    inputType: 'mouse' | 'touch' | 'pen';
  };
}

// ---------- Eventos de telemetría comunes ----------
export interface PointerSample {
  t: number;       // ms desde inicio del ítem
  x: number;       // px relativos al canvas/contenedor
  y: number;
  pressure?: number; // si touch/pen lo soporta
}

export interface AnswerChange {
  t: number;
  from: string | number | null;
  to: string | number;
}

// ---------- Test 1: Rotación mental 3D ----------
export interface MentalRotationItem {
  itemId: string;
  // Figura procedural: array de coordenadas de cubos en grid 3D
  figureSeed: number;               // semilla para regenerar la figura
  cubeCount: number;                // 7-10 cubos típicamente
  rotationAxis: 'x' | 'y' | 'z' | 'xy';
  rotationAngleDeg: number;         // 40, 80, 120, 160 — variable clave
  isMirror: boolean;                // ground truth
  presentedAt: number;              // ms desde inicio del bloque
}

export interface MentalRotationResponse {
  itemId: string;
  answer: 'same' | 'mirror';
  correct: boolean;
  reactionTimeMs: number;           // desde presentación a primera decisión
  confirmationTimeMs: number;       // tiempo extra hasta confirmar
  answerChanges: AnswerChange[];
  pointerTrack: PointerSample[];    // muestreo 30Hz
  rotationInteractions?: number;    // si permitimos rotar la figura, cuántas veces lo hizo
}

export interface MentalRotationBlock {
  blockType: 'mental_rotation';
  startedAt: number;
  finishedAt: number;
  items: MentalRotationItem[];
  responses: MentalRotationResponse[];
}

// ---------- Test 2: Orientación espacial (horizonte artificial) ----------
export interface SpatialOrientationItem {
  itemId: string;
  // Vista 3D del avión: pitch + roll + yaw aplicados
  aircraftPitchDeg: number;         // -60 a +60
  aircraftRollDeg: number;          // -90 a +90
  aircraftYawDeg: number;           // 0 a 360
  // 4 opciones de horizonte artificial, una correcta
  choices: Array<{
    id: 'A' | 'B' | 'C' | 'D';
    pitchDeg: number;
    rollDeg: number;
  }>;
  correctChoiceId: 'A' | 'B' | 'C' | 'D';
}

export interface SpatialOrientationResponse {
  itemId: string;
  answer: 'A' | 'B' | 'C' | 'D';
  correct: boolean;
  reactionTimeMs: number;
  answerChanges: AnswerChange[];
  pointerTrack: PointerSample[];
}

export interface SpatialOrientationBlock {
  blockType: 'spatial_orientation';
  startedAt: number;
  finishedAt: number;
  items: SpatialOrientationItem[];
  responses: SpatialOrientationResponse[];
}

// ---------- Test 3: Memoria espacial táctica ----------
export interface SpatialMemoryItem {
  itemId: string;
  gridSize: number;                 // 6x6, 8x8
  exposureMs: number;               // 4000-8000 ms
  targets: Array<{
    row: number;
    col: number;
    type: 'ally' | 'hostile' | 'objective';
  }>;
}

export interface SpatialMemoryResponse {
  itemId: string;
  recalled: Array<{
    row: number;
    col: number;
    type: 'ally' | 'hostile' | 'objective';
  }>;
  correctPositions: number;
  correctTypes: number;             // posición correcta Y tipo correcto
  totalTargets: number;
  reactionTimeMs: number;           // tiempo total de respuesta
}

export interface SpatialMemoryBlock {
  blockType: 'spatial_memory';
  startedAt: number;
  finishedAt: number;
  items: SpatialMemoryItem[];
  responses: SpatialMemoryResponse[];
}

// ---------- Sesión completa ----------
export interface CompletedSession {
  config: SessionConfig;
  blocks: [MentalRotationBlock, SpatialOrientationBlock, SpatialMemoryBlock];
  finishedAt: string;
  totalDurationMs: number;
}

// ---------- Métricas derivadas (lo que enviamos al LLM) ----------
export interface DimensionMetrics {
  // Rotación mental
  mr_accuracy: number;              // 0-1
  mr_meanReactionMs: number;
  mr_rtSlopeMsPerDeg: number;       // pendiente RT vs ángulo (Shepard's law)
  mr_consistencyScore: number;      // 0-1, inversa de varianza intra-dificultad

  // Orientación espacial
  so_accuracy: number;
  so_meanReactionMs: number;
  so_hesitationRate: number;        // % de respuestas con cambios

  // Memoria espacial
  sm_positionRecallRate: number;
  sm_typeRecallRate: number;
  sm_capacity: number;              // ~objetos recordados correctamente promedio
}

export interface ReportPayload {
  targetRole: TargetRole;
  metrics: DimensionMetrics;
  rawSessionSummary: {
    sessionDurationMs: number;
    totalItems: number;
    overallAccuracy: number;
  };
}
