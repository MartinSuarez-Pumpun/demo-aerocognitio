import { useState } from 'react'
import { useStore } from '../core/store'
import { streamTTSToUrl } from '../core/ttsStream'

const MOCK_REPORT = {
  headline: 'Aptitud elevada para rol de operador de sensores — rendimiento superior en memoria táctica.',
  narrative: 'El sujeto ha mostrado un patrón de rendimiento consistente con las exigencias cognitivas del rol objetivo. La memoria espacial táctica, dimensión crítica para este perfil, se sitúa en rango alto, con tiempos de respuesta estables y baja tasa de error. La rotación mental presenta un rendimiento sólido, con ejecución precisa en ítems de complejidad media-alta. La orientación espacial, de peso medio en este rol, muestra resultados dentro del rango esperado.',
  dimensionScores: {
    mentalRotation:     { level: 'high',   comment: 'Precisión superior al percentil 75. Tiempos de respuesta consistentes.' },
    spatialOrientation: { level: 'medium', comment: 'Rendimiento adecuado para el rol. Sin errores sistemáticos.' },
    spatialMemory:      { level: 'high',   comment: 'Capacidad de retención táctica elevada. Tasa de acierto del 87%.' },
  },
  roleAlignment: {
    summary: 'Perfil bien alineado con las exigencias del operador de sensores.',
    strengths: ['Alta capacidad de memoria táctica', 'Rotación mental precisa', 'Consistencia en tiempos de respuesta'],
    developmentAreas: ['Optimización de tiempos en orientación espacial bajo presión'],
  },
  recommendation: 'Candidato apto para incorporación al programa de formación de operadores de sensores RPAS.',
  disclaimer: 'Esta evaluación es una demostración tecnológica. No sustituye una valoración psicotécnica profesional completa.',
}

const MOCK_SUMMARY = 'Su evaluación ha sido completada con resultados destacados. La memoria espacial táctica y la rotación mental se sitúan en rango alto, con un perfil bien alineado al rol de operador de sensores. Se recomienda su incorporación al programa de formación.'

const BASE_BTN = {
  background: 'transparent',
  border: '1px solid #2a3a2a',
  color: '#6a9a6a',
  fontFamily: 'monospace',
  fontSize: '0.65rem',
  padding: '0.2rem 0.5rem',
  cursor: 'pointer',
  letterSpacing: '0.05em',
  transition: 'border-color 0.15s, color 0.15s',
}

function Btn({ label, loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{ ...BASE_BTN, opacity: loading ? 0.5 : 1, cursor: loading ? 'wait' : 'pointer' }}
      onMouseEnter={e => { if (!loading) { e.target.style.borderColor = '#2ed95f'; e.target.style.color = '#2ed95f' } }}
      onMouseLeave={e => { e.target.style.borderColor = '#2a3a2a'; e.target.style.color = '#6a9a6a' }}
    >
      {loading ? '...' : label}
    </button>
  )
}

export default function DevJump() {
  const devJump = useStore(s => s.devJump)
  const [loading, setLoading] = useState(null) // phase key being loaded

  const mockBase = {
    sessionId: 'SES-DEV1',
    sessionStart: Date.now(),
    targetRole: 'sensor_operator',
    report: MOCK_REPORT,
    reportSummary: MOCK_SUMMARY,
  }

  async function jumpReportIntro() {
    setLoading('reportIntro')
    const audioUrl = await streamTTSToUrl(MOCK_SUMMARY)
    devJump('reportIntro', { ...mockBase, reportAudioUrl: audioUrl })
    setLoading(null)
  }

  const jumps = [
    { label: 'welcome',     action: () => devJump('welcome') },
    { label: 'roles',       action: () => devJump('roleSelection') },
    { label: 'prueba MR',   action: () => devJump('mr') },
    { label: 'prueba SO',   action: () => devJump('so') },
    { label: 'prueba SM',   action: () => devJump('sm') },
    { label: 'processing',  action: () => devJump('processing') },
    { label: 'reportIntro', action: jumpReportIntro, key: 'reportIntro' },
    { label: 'report',      action: () => devJump('report', mockBase) },
  ]

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '0.4rem',
      alignItems: 'center',
      background: 'rgba(0,0,0,0.8)',
      border: '1px solid #2a3a2a',
      borderRadius: '4px',
      padding: '0.35rem 0.6rem',
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: '0.65rem',
    }}>
      <span style={{ color: '#4a6a4a', marginRight: '0.3rem', letterSpacing: '0.1em' }}>DEV</span>
      {jumps.map(({ label, action, key }) => (
        <Btn
          key={label}
          label={label}
          loading={loading === (key ?? label)}
          onClick={action}
        />
      ))}
    </div>
  )
}
