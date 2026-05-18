import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../core/store'
import './SpatialOrientationBlock.css'

const PITCH_OPTIONS = [-20, -10, 0, 10, 20]
const ROLL_OPTIONS = [-45, -30, -15, 0, 15, 30, 45]
const NUM_TRIALS = 6
const TIMEOUT_PRACTICE = 25000
const TIMEOUT_REAL     = 10000

function getRandDiff(arr, exclude) {
  const filtered = arr.filter(v => v !== exclude)
  return filtered[Math.floor(Math.random() * filtered.length)]
}

// ADI (Attitude Direction Indicator) SVG
function AdiDisplay({ pitch, roll, size = 120 }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 4
  // pitch shifts the horizon line: positive pitch = horizon goes down (you see more sky)
  const pitchShift = (pitch / 30) * (r * 0.6)
  const rollRad = (roll * Math.PI) / 180

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <clipPath id={`adi-clip-${size}`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      {/* Background circle */}
      <circle cx={cx} cy={cy} r={r} fill="#1a2840" />

      {/* Sky + ground rotated group */}
      <g clipPath={`url(#adi-clip-${size})`}>
        <g transform={`rotate(${roll}, ${cx}, ${cy})`}>
          {/* Sky half */}
          <rect
            x={cx - r * 2}
            y={cy - r * 2 + pitchShift}
            width={r * 4}
            height={r * 2}
            fill="#1e3a5f"
          />
          {/* Ground half */}
          <rect
            x={cx - r * 2}
            y={cy + pitchShift}
            width={r * 4}
            height={r * 2}
            fill="#5c3b1a"
          />
          {/* Horizon line */}
          <line
            x1={cx - r * 2}
            y1={cy + pitchShift}
            x2={cx + r * 2}
            y2={cy + pitchShift}
            stroke="#e8eef5"
            strokeWidth="2"
          />
        </g>
      </g>

      {/* Fixed aircraft reference */}
      <line x1={cx - 28} y1={cy} x2={cx - 8} y2={cy} stroke="#ffb547" strokeWidth="3" strokeLinecap="round" />
      <line x1={cx + 8} y1={cy} x2={cx + 28} y2={cy} stroke="#ffb547" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={3} fill="#ffb547" />

      {/* Border */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2d42" strokeWidth="2" />
    </svg>
  )
}

// Small horizon option (exterior view SVG)
function HorizonOption({ pitch, roll, size = 100 }) {
  const W = size, H = size * 0.65
  const cx = W / 2, cy = H / 2
  const pitchShift = (pitch / 30) * (H * 0.3)
  const rollRad = (roll * Math.PI) / 180
  const len = W * 0.7
  const x1 = cx - Math.cos(rollRad) * len / 2
  const y1 = cy + pitchShift - Math.sin(rollRad) * len / 2
  const x2 = cx + Math.cos(rollRad) * len / 2
  const y2 = cy + pitchShift + Math.sin(rollRad) * len / 2

  // Fill above horizon = sky, below = ground
  const pts = `0,0 ${W},0 ${x2},${y2} ${x1},${y1}`
  const ptsGround = `${x1},${y1} ${x2},${y2} ${W},${H} 0,${H}`

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#1a2840" rx="3" />
      <polygon points={pts} fill="#1e3a5f" />
      <polygon points={ptsGround} fill="#5c3b1a" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e8eef5" strokeWidth="2" />
    </svg>
  )
}

function makeTrial(isPractice = false) {
  const pitch = PITCH_OPTIONS[Math.floor(Math.random() * PITCH_OPTIONS.length)]
  const roll  = ROLL_OPTIONS[Math.floor(Math.random() * ROLL_OPTIONS.length)]
  const distractors = []
  while (distractors.length < 3) {
    const dp = getRandDiff(PITCH_OPTIONS, pitch)
    const dr = getRandDiff(ROLL_OPTIONS, roll)
    if (!distractors.find(d => d.pitch === dp && d.roll === dr))
      distractors.push({ pitch: dp, roll: dr })
  }
  const correctIdx = Math.floor(Math.random() * 4)
  const options = [...distractors]
  options.splice(correctIdx, 0, { pitch, roll })
  return { pitch, roll, options, correctIdx, isPractice }
}

function buildTrials() {
  return [
    makeTrial(true),
    ...Array.from({ length: NUM_TRIALS }, () => makeTrial(false)),
  ]
}

export default function SpatialOrientationBlock() {
  const addSOTrial = useStore(s => s.addSOTrial)
  const setPhase = useStore(s => s.setPhase)

  const [trials] = useState(() => buildTrials())
  const [trialIdx, setTrialIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [clickCount, setClickCount] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_PRACTICE)

  const startTimeRef = useRef(Date.now())
  const timerRef = useRef(null)

  const trial = trials[trialIdx]

  const handleConfirm = useCallback((answerIdx, isTimeout = false) => {
    if (answered) return
    setAnswered(true)
    clearInterval(timerRef.current)

    const rt = Date.now() - startTimeRef.current
    const correct = answerIdx === trial.correctIdx
    setFeedback(correct ? 'correct' : 'incorrect')

    if (!trial.isPractice) {
      addSOTrial({
        pitch: trial.pitch,
        roll: trial.roll,
        correct,
        reactionTimeMs: rt,
        answerChanges: Math.max(0, clickCount - 1),
      })
    }

    setTimeout(() => {
      if (trialIdx + 1 >= trials.length) {
        setPhase('smInstructions')
      } else {
        setTrialIdx(i => i + 1)
        setSelected(null)
        setClickCount(0)
        setAnswered(false)
        setFeedback(null)
        setTimeLeft(trials[trialIdx + 1]?.isPractice ? TIMEOUT_PRACTICE : TIMEOUT_REAL)
        startTimeRef.current = Date.now()
      }
    }, 500)
  }, [answered, trial, clickCount, addSOTrial, trialIdx, trials.length, setPhase])

  const trialTimeout = trial?.isPractice ? TIMEOUT_PRACTICE : TIMEOUT_REAL
  useEffect(() => {
    startTimeRef.current = Date.now()
    setTimeLeft(trial?.isPractice ? TIMEOUT_PRACTICE : TIMEOUT_REAL)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          clearInterval(timerRef.current)
          handleConfirm(selected ?? -1, true)
          return 0
        }
        return prev - 100
      })
    }, 100)
    return () => clearInterval(timerRef.current)
  }, [trialIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect(idx) {
    if (answered) return
    setSelected(idx)
    setClickCount(c => c + 1)
  }

  function handleConfirmClick() {
    if (selected === null || answered) return
    handleConfirm(selected)
  }

  if (!trial) return null

  const timerPct  = (timeLeft / trialTimeout) * 100
  const secsLeft  = Math.ceil(timeLeft / 1000)

  return (
    <div className="so-screen">
      <div className="so-header">
        <div className="so-label">Prueba 2 · Orientación Espacial</div>
        <div className="so-progress">
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

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 340 }}>
        <div style={{ width: '100%', height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: timerPct < 30 ? 'var(--red)' : 'var(--accent)',
            width: `${timerPct}%`, transition: 'width 0.1s linear', borderRadius: 2
          }} />
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: timerPct < 30 ? 'var(--red)' : 'var(--text)', opacity: 0.8 }}>
          {secsLeft}s
          {trial.isPractice && <span style={{ marginLeft: 8, opacity: 0.5 }}>· práctica sin límite de presión</span>}
        </div>
      </div>

      <div className="so-instruction">
        Identifica la vista exterior que corresponde al indicador
      </div>

      <div className="so-adi-wrap">
        <div className="so-adi-label">Indicador de actitud</div>
        <AdiDisplay pitch={trial.pitch} roll={trial.roll} size={140} />
      </div>

      <div className="so-options">
        {trial.options.map((opt, i) => {
          let cls = 'so-option-btn'
          if (answered) {
            if (i === trial.correctIdx) cls += ' correct-reveal'
            else if (i === selected) cls += ' wrong-reveal'
          } else if (i === selected) {
            cls += ' selected'
          }
          return (
            <button
              key={i}
              className={cls}
              type="button"
              onClick={() => handleSelect(i)}
              disabled={answered}
            >
              <HorizonOption pitch={opt.pitch} roll={opt.roll} size={110} />
              <div className="so-option-label">Opción {String.fromCharCode(65 + i)}</div>
            </button>
          )
        })}
      </div>

      <div className="so-confirm-row">
        <button
          className="btn btn-primary"
          type="button"
          onClick={handleConfirmClick}
          disabled={selected === null || answered}
        >
          CONFIRMAR
        </button>
        <div className={`so-feedback ${feedback ?? ''}`}>
          {feedback === 'correct' && '✓ CORRECTO'}
          {feedback === 'incorrect' && '✗ INCORRECTO'}
        </div>
      </div>
    </div>
  )
}