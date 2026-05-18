import { useEffect, useRef, useState } from 'react'
import { useStore } from '../core/store'
import { computeMetrics } from '../core/scoring'
import { generateReport } from '../core/aiReport'
import './ProcessingScreen.css'

const STEPS = [
  'Compilando métricas de sesión',
  'Normalizando índices de rendimiento',
  'Consultando modelo de análisis',
  'Generando informe narrativo',
]

export default function ProcessingScreen() {
  const [activeStep, setActiveStep] = useState(0)
  const { mr, so, sm, sessionStart, targetRole, setReport, setReportError, setPhase } = useStore()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    let step = 0
    const interval = setInterval(() => {
      step += 1
      if (step < STEPS.length) setActiveStep(step)
    }, 1200)

    async function run() {
      const metrics = computeMetrics({ mr, so, sm, sessionStart })
      const report = await generateReport(targetRole, metrics)
      clearInterval(interval)
      setReport(report)
      setPhase('report')
    }

    run().catch(() => {
      clearInterval(interval)
      setReportError(true)
      setPhase('report')
    })

    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="processing-screen">
      <div className="processing-logo">AEROCOGNITIO</div>

      <div className="processing-spinner">
        <div className="processing-dot" />
        <div className="processing-dot" />
        <div className="processing-dot" />
      </div>

      <div className="processing-status">
        <span>Analizando métricas de sesión...</span>
        <div className="processing-progress-track">
          <div className="processing-progress-fill" />
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