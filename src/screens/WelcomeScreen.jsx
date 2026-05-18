import { useStore } from '../core/store'
import './WelcomeScreen.css'

export default function WelcomeScreen() {
  const startSession = useStore(s => s.startSession)
  const setPhase = useStore(s => s.setPhase)

  function handleStart() {
    startSession()
    setPhase('roleSelection')
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-logo">
        <div className="welcome-brand">AEROCOGNITIO</div>
        <div className="welcome-tagline">Evaluación de aptitud para sistemas no tripulados</div>
      </div>

      <div className="welcome-divider" />

      <div className="welcome-info">
        <div className="welcome-info-title">Secuencia de evaluación</div>
        <div className="welcome-steps">
          <div className="welcome-step">
            <span className="welcome-step-num">01</span>
            <span className="welcome-step-text">Rotación Mental</span>
            <span className="welcome-step-meta">~2 min</span>
          </div>
          <div className="welcome-step">
            <span className="welcome-step-num">02</span>
            <span className="welcome-step-text">Orientación Espacial</span>
            <span className="welcome-step-meta">~2 min</span>
          </div>
          <div className="welcome-step">
            <span className="welcome-step-num">03</span>
            <span className="welcome-step-text">Memoria Espacial Táctica</span>
            <span className="welcome-step-meta">~2 min</span>
          </div>
        </div>
      </div>

      <button className="btn btn-primary" type="button" onClick={handleStart}>
        INICIAR EVALUACIÓN
      </button>

      <p className="welcome-notice">
        Duración total estimada: 5-7 minutos. Mantenga el foco durante toda la sesión.
      </p>
    </div>
  )
}