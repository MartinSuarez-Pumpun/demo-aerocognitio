import { z } from 'zod'

const Schema = z.object({
  headline: z.string(),
  narrative: z.string(),
  dimensionScores: z.object({
    mentalRotation: z.object({ level: z.enum(['low', 'medium', 'high']), comment: z.string() }),
    spatialOrientation: z.object({ level: z.enum(['low', 'medium', 'high']), comment: z.string() }),
    spatialMemory: z.object({ level: z.enum(['low', 'medium', 'high']), comment: z.string() }),
  }),
  roleAlignment: z.object({
    summary: z.string(),
    strengths: z.array(z.string()),
    developmentAreas: z.array(z.string()),
  }),
  recommendation: z.string(),
  disclaimer: z.string(),
})

const SYSTEM = `Eres un evaluador especializado en selección de personal aeronáutico y de sistemas no tripulados (RPAS) para Fuerzas Armadas. Tu función es interpretar los resultados de una batería psicotécnica corta (3 pruebas: rotación mental 3D, orientación espacial con actitud y rumbo magnético, detección de cambios en mapa táctico) y emitir un informe descriptivo de aptitud para un rol objetivo específico.

REGLAS INNEGOCIABLES:

1. NO INVENTES PUNTUACIONES. Solo puedes usar las métricas que recibes en el payload.
2. NO DIAGNOSTIQUES. No emplees términos clínicos ni psicopatológicos.
3. SOLO DESCRIBES PATRONES OBSERVADOS en las pruebas administradas.
4. SIEMPRE INCLUYE ESTA SALVAGUARDA al final: "Esta evaluación es una demostración tecnológica de aproximadamente 5-7 minutos. No sustituye una valoración psicotécnica profesional completa ni puede usarse como criterio único de selección. Los resultados deben interpretarse como indicativos del rendimiento del sujeto en esta sesión y bajo estas condiciones."
5. TONO: profesional, sobrio, técnico militar. Nada de marketing, emojis ni florituras.
6. Responde SOLO con JSON válido, sin markdown ni fences.

Esquema de salida:
{"headline":"string","narrative":"string","dimensionScores":{"mentalRotation":{"level":"low|medium|high","comment":"string"},"spatialOrientation":{"level":"low|medium|high","comment":"string"},"spatialMemory":{"level":"low|medium|high","comment":"string"}},"roleAlignment":{"summary":"string","strengths":["string"],"developmentAreas":["string"]},"recommendation":"string","disclaimer":"string"}

Roles y pesos: rpas_pilot_class_ii (orientación CRÍTICA, rotación ALTA, memoria MEDIA), sensor_operator (memoria CRÍTICA, rotación ALTA, orientación MEDIA), image_analyst (rotación CRÍTICA, memoria ALTA, orientación BAJA), mission_controller (memoria CRÍTICA, orientación ALTA, rotación MEDIA).`

const FALLBACK = {
  headline: 'Evaluación completada — informe generado en modo sin conexión.',
  narrative: 'El sistema ha generado este informe en modo fallback por ausencia de conexión con el servicio de análisis. Los datos de la sesión han sido capturados correctamente y pueden ser enviados para análisis posterior.',
  dimensionScores: {
    mentalRotation: { level: 'medium', comment: 'Datos capturados. Análisis pendiente de conexión.' },
    spatialOrientation: { level: 'medium', comment: 'Datos capturados. Análisis pendiente de conexión.' },
    spatialMemory: { level: 'medium', comment: 'Datos capturados. Análisis pendiente de conexión.' },
  },
  roleAlignment: {
    summary: 'Análisis de alineación de rol no disponible en modo offline.',
    strengths: ['Sesión completada correctamente'],
    developmentAreas: ['Requiere análisis con conexión activa'],
  },
  recommendation: 'Exportar sesión y procesar con conexión activa para obtener informe completo.',
  disclaimer: 'Esta evaluación es una demostración tecnológica de aproximadamente 5-7 minutos. No sustituye una valoración psicotécnica profesional completa ni puede usarse como criterio único de selección.',
}

function buildPrompt(role, m) {
  return `Evalúa la siguiente sesión:

Rol objetivo: ${role}

Métricas observadas:
- Rotación mental: precisión ${m.mr_accuracy.toFixed(2)}, RT media ${Math.round(m.mr_meanReactionMs)} ms, pendiente RT/ángulo ${m.mr_rtSlopeMsPerDeg.toFixed(1)} ms/grado, consistencia ${m.mr_consistencyScore.toFixed(2)}
- Orientación espacial (actitud + rumbo): precisión ${m.so_accuracy.toFixed(2)}, RT media ${Math.round(m.so_meanReactionMs)} ms, tasa de vacilación ${m.so_hesitationRate.toFixed(2)}
- Memoria espacial (detección de cambios en mapa táctico): tasa de detección ${m.sm_changeDetectionRate.toFixed(2)}, tasa de falsos positivos ${m.sm_falsePositiveRate.toFixed(2)}, capacidad media ${m.sm_capacity.toFixed(1)} cambios detectados

Resumen global: ${m.totalItems} ítems, precisión global ${m.overallAccuracy.toFixed(2)}, duración ${m.sessionDurationMs} ms.

Genera el informe en JSON siguiendo el esquema obligatorio.`
}

export async function generateReport(role, metrics) {
  try {
    const res = await fetch('/api/xai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-fast-non-reasoning',
        max_tokens: 1500,
        temperature: 0.4,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user',   content: buildPrompt(role, metrics) },
        ],
      }),
    })
    if (!res.ok) throw new Error(res.status)
    const data = await res.json()
    return Schema.parse(JSON.parse(data.choices[0].message.content))
  } catch {
    return FALLBACK
  }
}