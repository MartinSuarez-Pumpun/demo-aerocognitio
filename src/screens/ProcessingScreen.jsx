import { useEffect, useRef, useState } from 'react'
import { useStore } from '../core/store'
import { computeMetrics } from '../core/scoring'
import { generateReport } from '../core/aiReport'
import { generateSpokenSummary } from '../core/aiSummary'
import { streamTTSToUrl } from '../core/ttsStream'
import './ProcessingScreen.css'

const STEPS = [
  'Compilando métricas de sesión',
  'Normalizando índices de rendimiento',
  'Consultando modelo de análisis',
  'Generando informe narrativo',
  'Preparando síntesis oral',
]

const STEP_PROGRESS = [8, 25, 45, 65, 83]

export default function ProcessingScreen() {
  const [activeStep, setActiveStep] = useState(0)
  const [progress,   setProgress]   = useState(STEP_PROGRESS[0])
  const [exiting,    setExiting]     = useState(false)
  const {
    mr, so, sm, sessionStart, targetRole,
    setReport, setReportError, setReportSummary, setReportAudioUrl, setPhase,
  } = useStore()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    let step = 0
    const interval = setInterval(() => {
      step += 1
      if (step < STEPS.length) {
        setActiveStep(step)
        setProgress(STEP_PROGRESS[step])
      }
    }, 1200)

    async function run() {
      // — Steps 0-3: generate text report —
      const metrics = computeMetrics({ mr, so, sm, sessionStart })
      const report  = await generateReport(targetRole, metrics)
      setReport(report)

      // — Step 4: generate spoken summary + stream TTS audio —
      clearInterval(interval)
      setActiveStep(4)
      setProgress(STEP_PROGRESS[4])

      const summaryText = await generateSpokenSummary(report, targetRole)
      setReportSummary(summaryText)

      const audioUrl = await streamTTSToUrl(summaryText)
      setReportAudioUrl(audioUrl) // null if TTS failed — ReportIntroScreen handles fallback

      // Bar to 100%, brief hold, then fade out
      setProgress(100)
      await new Promise(r => setTimeout(r, 900))
      setExiting(true)
      await new Promise(r => setTimeout(r, 420))
      setPhase('reportIntro')
    }

    run().catch(() => {
      clearInterval(interval)
      setReportError(true)
      setPhase('report')
    })

    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`processing-screen${exiting ? ' exiting' : ''}`}>
      <div className="processing-logo">AEROCOGNITIO</div>

      <div className="processing-spinner">
        <div className="processing-dot" />
        <div className="processing-dot" />
        <div className="processing-dot" />
      </div>

      <div className="processing-status">
        <span>Analizando métricas de sesión...</span>
        <div className="processing-progress-track">
          <div className="processing-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="processing-steps">
        {STEPS.map((step, i) => (
          <div key={i} className={`processing-step-row ${i <= activeStep ? 'active' : ''}`}>
            <div className="processing-step-icon">
              {i < activeStep ? '✓' : i === activeStep ? '▶' : '○'}
            </div>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
