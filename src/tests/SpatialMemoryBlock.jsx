import { useState, useEffect, useRef } from 'react'
import { useStore } from '../core/store'
import './SpatialMemoryBlock.css'

const GRID_SIZE = 5
const NUM_TARGETS = 4
const NUM_TRIALS = 4
const MEMORIZE_PRACTICE = 10
const MEMORIZE_REAL     = 5

const SYMBOL_TYPES = ['infantry', 'armor', 'air', 'hostile', 'waypoint']

function SymbolSVG({ type, size = 28 }) {
  const s = size
  const c = s / 2
  switch (type) {
    case 'infantry':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <circle cx={c} cy={c} r={c - 3} fill="none" stroke="#5fe3b0" strokeWidth="2" />
        </svg>
      )
    case 'armor':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <polygon points={`${c},3 ${s - 3},${c} ${c},${s - 3} 3,${c}`} fill="none" stroke="#ffb547" strokeWidth="2" />
        </svg>
      )
    case 'air':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <polygon points={`${c},3 ${s - 3},${s - 3} 3,${s - 3}`} fill="none" stroke="#8ca0b8" strokeWidth="2" />
        </svg>
      )
    case 'hostile':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <line x1={4} y1={4} x2={s - 4} y2={s - 4} stroke="#ff5252" strokeWidth="2.5" strokeLinecap="round" />
          <line x1={s - 4} y1={4} x2={4} y2={s - 4} stroke="#ff5252" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )
    case 'waypoint':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <polygon
            points={Array.from({ length: 5 }, (_, i) => {
              const angle = (i * 72 - 90) * Math.PI / 180
              const ro = c - 3, ri = c * 0.45
              const outerX = c + ro * Math.cos(angle)
              const outerY = c + ro * Math.sin(angle)
              const innerAngle = angle + 36 * Math.PI / 180
              const innerX = c + ri * Math.cos(innerAngle)
              const innerY = c + ri * Math.sin(innerAngle)
              return `${outerX},${outerY} ${innerX},${innerY}`
            }).join(' ')}
            fill="none"
            stroke="#e8eef5"
            strokeWidth="1.5"
          />
        </svg>
      )
    default:
      return null
  }
}

function randomPositions(n, gridSize) {
  const all = []
  for (let r = 0; r < gridSize; r++)
    for (let c = 0; c < gridSize; c++)
      all.push(r * gridSize + c)
  const shuffled = all.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function makeTrial(isPractice = false) {
  const positions = randomPositions(NUM_TARGETS, GRID_SIZE)
  const types = Array.from({ length: NUM_TARGETS }, () =>
    SYMBOL_TYPES[Math.floor(Math.random() * SYMBOL_TYPES.length)]
  )
  return { positions, types, isPractice }
}

function buildTrials() {
  return [
    makeTrial(true),
    ...Array.from({ length: NUM_TRIALS }, () => makeTrial(false)),
  ]
}

export default function SpatialMemoryBlock() {
  const addSMTrial = useStore(s => s.addSMTrial)
  const setPhase = useStore(s => s.setPhase)

  const [trials] = useState(() => buildTrials())
  const [trialIdx, setTrialIdx] = useState(0)
  const [phase, setLocalPhase] = useState('memorize') // memorize | recall | result
  const [countdown, setCountdown] = useState(MEMORIZE_PRACTICE)
  const [userSelected, setUserSelected] = useState(new Set())
  const [score, setScore] = useState(null)

  const timerRef = useRef(null)
  const trial = trials[trialIdx]

  // Memorization countdown
  useEffect(() => {
    if (phase !== 'memorize') return
    setCountdown(trials[trialIdx]?.isPractice ? MEMORIZE_PRACTICE : MEMORIZE_REAL)
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setLocalPhase('recall')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [trialIdx, phase])

  function toggleCell(idx) {
    if (phase !== 'recall') return
    setUserSelected(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  function handleConfirm() {
    if (phase !== 'recall') return
    const correctPositions = trial.positions.filter(p => userSelected.has(p)).length
    const result = {
      correctPositions,
      correctTypes: correctPositions, // simplified: position = type match
      totalTargets: NUM_TARGETS,
    }
    setScore(correctPositions)
    if (!trial.isPractice) addSMTrial(result)
    setLocalPhase('result')

    setTimeout(() => {
      if (trialIdx + 1 >= trials.length) {
        setPhase('processing')
      } else {
        setTrialIdx(i => i + 1)
        setUserSelected(new Set())
        setScore(null)
        setLocalPhase('memorize')
      }
    }, 1200)
  }

  if (!trial) return null

  const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i)

  return (
    <div className="sm-screen">
      <div className="sm-header">
        <div className="sm-label">Prueba 3 · Memoria Espacial Táctica</div>
        <div className="sm-progress">
          {trial.isPractice
            ? 'Práctica 1/1'
            : `Ítem ${trialIdx}/${trials.length - 1}`}
        </div>
      </div>

      {trial.isPractice && (
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em',
          textTransform: 'uppercase', padding: '3px 10px',
          border: '1px solid var(--accent-border)', borderRadius: 3,
          color: 'var(--accent)', background: 'var(--accent-dim)',
        }}>PRÁCTICA</div>
      )}

      {phase === 'memorize' && (
        <>
          <div className="sm-phase-label">
            Memoriza las posiciones
            {trial.isPractice
              ? <span className="sm-time-hint"> · {MEMORIZE_PRACTICE}s (práctica)</span>
              : <span className="sm-time-hint"> · {MEMORIZE_REAL}s</span>}
          </div>
          <div className="sm-countdown">{countdown}</div>
          <div className="sm-grid">
            {cells.map(idx => {
              const posIdx = trial.positions.indexOf(idx)
              return (
                <div key={idx} className="sm-cell">
                  {posIdx !== -1 && <SymbolSVG type={trial.types[posIdx]} />}
                </div>
              )
            })}
          </div>
          <div className="sm-instruction">Observa y memoriza las posiciones de los símbolos</div>
        </>
      )}

      {phase === 'recall' && (
        <>
          <div className="sm-phase-label">Indica dónde estaban los símbolos</div>
          <div className="sm-grid">
            {cells.map(idx => (
              <div
                key={idx}
                className={`sm-cell clickable ${userSelected.has(idx) ? 'user-selected' : ''}`}
                onClick={() => toggleCell(idx)}
              />
            ))}
          </div>
          <div className="sm-instruction">Selecciona {NUM_TARGETS} celdas</div>
          <div className="sm-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleConfirm}
              disabled={userSelected.size === 0}
            >
              CONFIRMAR
            </button>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>
              {userSelected.size}/{NUM_TARGETS} seleccionadas
            </span>
          </div>
        </>
      )}

      {phase === 'result' && (
        <>
          <div className="sm-phase-label">Resultado</div>
          <div className="sm-grid">
            {cells.map(idx => {
              const isTarget = trial.positions.includes(idx)
              const isSelected = userSelected.has(idx)
              let cls = 'sm-cell'
              if (isTarget && isSelected) cls += ' correct-pos'
              else if (!isTarget && isSelected) cls += ' wrong-pos'
              else if (isTarget) cls += ' correct-pos' // show where they were
              return (
                <div key={idx} className={cls}>
                  {isTarget && (() => {
                    const posIdx = trial.positions.indexOf(idx)
                    return <SymbolSVG type={trial.types[posIdx]} size={22} />
                  })()}
                </div>
              )
            })}
          </div>
          <div className="sm-score">
            {score}/{NUM_TARGETS} correctas
          </div>
        </>
      )}
    </div>
  )
}