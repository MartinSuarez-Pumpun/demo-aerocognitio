import { useStore } from '../core/store'
import { computeMetrics } from '../core/scoring'
import './ReportScreen.css'

const LEVEL_LABELS = { high: 'ALTO', medium: 'MEDIO', low: 'BAJO' }
const DIM_LABELS = {
  mentalRotation: 'Rotación mental',
  spatialOrientation: 'Orientación espacial',
  spatialMemory: 'Memoria espacial',
}

const ROLE_NAMES = {
  rpas_pilot_class_ii: 'Piloto RPAS Clase II',
  sensor_operator: 'Operador de Sensor RPAS',
  image_analyst: 'Analista de Imagen',
  mission_controller: 'Controlador de Misión',
}

function DimCard({ id, data }) {
  return (
    <div className="dim-card">
      <div className="dim-label">{DIM_LABELS[id]}</div>
      <div className={`dim-level level-${data.level}`}>{LEVEL_LABELS[data.level]}</div>
      <div className="dim-bar-track">
        <div className={`dim-bar-fill fill-${data.level}`} />
      </div>
      <div className="dim-comment">{data.comment}</div>
    </div>
  )
}

export default function ReportScreen({ onPluginComplete }) {
  const { report, reportError, sessionId, targetRole, mr, so, sm, sessionStart, reset, setPhase } = useStore()

  function handleNewSession() {
    reset()
    setPhase('welcome')
  }

  function handleReturnToSystem() {
    const metrics = computeMetrics({ mr, so, sm, sessionStart })
    const result = { type: 'aerocognitio', sessionId, role: targetRole, metrics, report }
    reset()
    onPluginComplete?.(result)
  }

  function handleExport() {
    const metrics = computeMetrics({ mr, so, sm, sessionStart })
    const payload = { sessionId, targetRole, metrics, report }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sessionId ?? 'aerocognitio'}-report.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const now = new Date()
  const ts = now.toISOString().slice(0, 16).replace('T', ' · ')

  if (!report && !reportError) {
    return (
      <div className="report-screen" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100svh' }}>
        <div className="hud-label">Sin datos de informe</div>
        {onPluginComplete
          ? <button className="btn btn-primary" onClick={handleReturnToSystem}>Obtener mi informe</button>
          : <button className="btn btn-primary" onClick={handleNewSession}>Nueva sesión</button>
        }
      </div>
    )
  }

  const data = report ?? {
    headline: 'Error al generar el informe.',
    narrative: 'No se pudo obtener el análisis. Los datos de sesión han sido capturados.',
    dimensionScores: {
      mentalRotation: { level: 'medium', comment: 'Error en análisis.' },
      spatialOrientation: { level: 'medium', comment: 'Error en análisis.' },
      spatialMemory: { level: 'medium', comment: 'Error en análisis.' },
    },
    roleAlignment: {
      summary: 'No disponible.',
      strengths: [],
      developmentAreas: [],
    },
    recommendation: 'Reintentar con conexión activa.',
    disclaimer: 'Esta evaluación es una demostración tecnológica.',
  }

  return (
    <div className="report-screen">
      {/* Header */}
      <header className="hud-header">
        <span className="brand">AEROCOGNITIO</span>
        <div className="meta">
          <span><span className="status-dot" />INFORME GENERADO</span>
          {sessionId && <span>SES-<strong>{sessionId.replace('SES-', '')}</strong></span>}
          <span>{ts} UTC</span>
        </div>
      </header>

      {/* Headline */}
      <div className="headline-card">
        <div>
          <div className="label">Síntesis IA · Análisis de aptitud</div>
          <h1>{data.headline}</h1>
        </div>
      </div>

      {/* Dimension scores */}
      <div className="dim-grid">
        {Object.entries(data.dimensionScores).map(([id, dimData]) => (
          <DimCard key={id} id={id} data={dimData} />
        ))}
      </div>

      {/* Narrative + Role alignment */}
      <div className="two-col">
        <div className="narrative-card">
          <div className="card-title">Informe narrativo</div>
          {Array.isArray(data.narrative)
            ? data.narrative.map((p, i) => <p key={i}>{p}</p>)
            : <p>{data.narrative}</p>
          }
        </div>

        <div className="role-card">
          <div className="card-title">Alineación con rol objetivo</div>
          {targetRole && (
            <div className="role-name">{(ROLE_NAMES[targetRole] ?? targetRole).toUpperCase()}</div>
          )}
          <p className="role-summary">{data.roleAlignment.summary}</p>

          {data.roleAlignment.strengths.length > 0 && (
            <div className="tag-list">
              <div className="card-title" style={{ borderBottom: 'none', paddingBottom: 0 }}>Fortalezas</div>
              {data.roleAlignment.strengths.map((s, i) => (
                <div key={i} className="tag-row">
                  <span className="bullet bullet-green">▸</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}

          {data.roleAlignment.developmentAreas.length > 0 && (
            <div className="tag-list">
              <div className="card-title" style={{ borderBottom: 'none', paddingBottom: 0 }}>Áreas de desarrollo</div>
              {data.roleAlignment.developmentAreas.map((a, i) => (
                <div key={i} className="tag-row">
                  <span className="bullet bullet-red">▸</span>
                  <span>{a}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommendation */}
      <div className="rec-card">
        <div className="card-title">Recomendación operativa</div>
        <p>{data.recommendation}</p>
      </div>

      {/* Disclaimer */}
      <div className="disclaimer">{data.disclaimer}</div>

      {/* Actions */}
      <div className="actions">
        {onPluginComplete
          ? (
            <button className="btn btn-primary" type="button" onClick={handleReturnToSystem}>
              Obtener mi informe — Ver QR
            </button>
          ) : (
            <>
              <button className="btn btn-ghost" type="button" onClick={handleExport}>Exportar JSON</button>
              <button className="btn btn-primary" type="button" onClick={handleNewSession}>Nueva sesión</button>
            </>
          )
        }
      </div>
    </div>
  )
}