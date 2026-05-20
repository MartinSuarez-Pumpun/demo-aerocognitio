const SYSTEM = `Eres el sistema de síntesis oral de AeroCognitio, plataforma de evaluación psicotécnica militar.
Genera un resumen oral conciso (máximo 3 frases, entre 40 y 60 palabras) del informe de evaluación.
El texto será leído en voz alta. Usa segunda persona ("Su evaluación..."), tono formal y directo.
No uses listas, puntos ni formato. Solo texto corrido que suene natural al ser leído en voz alta.
Devuelve ÚNICAMENTE el texto del resumen, sin comillas ni formato adicional.`

export async function generateSpokenSummary(report, targetRole) {
  const prompt = `Rol evaluado: ${targetRole ?? 'no especificado'}.
Título del informe: ${report.headline}.
Recomendación: ${report.recommendation}.
Genera el resumen oral.`

  try {
    const res = await fetch('/api/xai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-fast-non-reasoning',
        max_tokens: 150,
        temperature: 0.35,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!res.ok) return buildFallback(report)
    const data = await res.json()
    return data.choices[0].message.content.trim()
  } catch {
    return buildFallback(report)
  }
}

function buildFallback(report) {
  return `${report.headline}. ${report.recommendation}`
}
