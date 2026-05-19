import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../core/store'
import './SpatialOrientationBlock.css'

const PITCH_OPTIONS   = [-20, -10, 0, 10, 20]
const ROLL_OPTIONS    = [-45, -30, -15, 0, 15, 30, 45]
const HEADING_OPTIONS  = [0, 45, 90, 135, 180, 225, 270, 315]
const HEADING_LABELS   = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const FRAME_ROTATIONS  = [-35, -20, -10, 10, 20, 35]
const NUM_TRIALS       = 6
const TIMEOUT_PRACTICE = 25000
const TIMEOUT_REAL     = 10000

function getRandDiff(arr, exclude) {
  const filtered = arr.filter(v => v !== exclude)
  return filtered[Math.floor(Math.random() * filtered.length)]
}

function AdiDisplay({ pitch, roll, size = 120, frameRotation = 0 }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 4
  const pitchShift = (pitch / 30) * (r * 0.6)

  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ transform: `rotate(${frameRotation}deg)`, display: 'block' }}
    >
      <defs>
        <clipPath id={`adi-clip-${size}`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="#1a2840" />
      <g clipPath={`url(#adi-clip-${size})`}>
        <g transform={`rotate(${roll}, ${cx}, ${cy})`}>
          <rect x={cx - r * 2} y={cy - r * 2 + pitchShift} width={r * 4} height={r * 2} fill="#1e3a5f" />
          <rect x={cx - r * 2} y={cy + pitchShift} width={r * 4} height={r * 2} fill="#5c3b1a" />
          <line x1={cx - r * 2} y1={cy + pitchShift} x2={cx + r * 2} y2={cy + pitchShift} stroke="#e8eef5" strokeWidth="2" />
        </g>
      </g>
      <line x1={cx - 28} y1={cy} x2={cx - 8} y2={cy} stroke="#ffb547" strokeWidth="3" strokeLinecap="round" />
      <line x1={cx + 8} y1={cy} x2={cx + 28} y2={cy} stroke="#ffb547" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={3} fill="#ffb547" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2d42" strokeWidth="2" />
    </svg>
  )
}

function HsiDisplay({ heading, size = 120 }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 4
  const cardRotation = -heading

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <clipPath id={`hsi-clip-${size}`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="#1a2840" />

      <g transform={`rotate(${cardRotation}, ${cx}, ${cy})`} clipPath={`url(#hsi-clip-${size})`}>
        {HEADING_LABELS.map((label, i) => {
          const angleDeg = i * 45 - 90
          const angleRad = angleDeg * Math.PI / 180
          const outerR = r - 6
          const innerR = r - 16
          const labelR = r - 28
          const isNorth = label === 'N'
          return (
            <g key={label}>
              <line
                x1={cx + innerR * Math.cos(angleRad)}
                y1={cy + innerR * Math.sin(angleRad)}
                x2={cx + outerR * Math.cos(angleRad)}
                y2={cy + outerR * Math.sin(angleRad)}
                stroke={isNorth ? '#ff5252' : '#8ca0b8'}
                strokeWidth={isNorth ? 2.5 : 1.5}
              />
              <text
                x={cx + labelR * Math.cos(angleRad)}
                y={cy + labelR * Math.sin(angleRad)}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isNorth ? '#ff5252' : '#8ca0b8'}
                fontSize={isNorth ? 12 : 9}
                fontFamily="monospace"
                fontWeight={isNorth ? 'bold' : 'normal'}
              >{label}</text>
            </g>
          )
        })}
      </g>

      {/* Fixed lubber line — aircraft heading pointer */}
      <polygon
        points={`${cx},${cy - r + 6} ${cx - 5},${cy - r + 18} ${cx + 5},${cy - r + 18}`}
        fill="#ffb547"
      />

      <circle cx={cx} cy={cy} r={3} fill="#ffb547" />
      <text x={cx} y={cy + 16} textAnchor="middle" fill="#ffb547" fontSize={12} fontFamily="monospace">
        {String(heading).padStart(3, '0')}°
      </text>

      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2d42" strokeWidth="2" />
    </svg>
  )
}

function HorizonOption({ pitch, roll, heading, size = 100 }) {
  const W = size, H = size * 0.65
  const badgeH = 18
  const cx = W / 2, cy = H / 2
  const pitchShift = (pitch / 30) * (H * 0.3)
  const rollRad = (roll * Math.PI) / 180
  const len = W * 0.7
  const x1 = cx - Math.cos(rollRad) * len / 2
  const y1 = cy + pitchShift - Math.sin(rollRad) * len / 2
  const x2 = cx + Math.cos(rollRad) * len / 2
  const y2 = cy + pitchShift + Math.sin(rollRad) * len / 2

  const pts       = `0,0 ${W},0 ${x2},${y2} ${x1},${y1}`
  const ptsGround = `${x1},${y1} ${x2},${y2} ${W},${H} 0,${H}`

  const headingIdx   = HEADING_OPTIONS.indexOf(heading)
  const headingLabel = headingIdx >= 0 ? HEADING_LABELS[headingIdx] : `${heading}°`

  return (
    <svg width={W} height={H + badgeH} viewBox={`0 0 ${W} ${H + badgeH}`}>
      <rect width={W} height={H} fill="#1a2840" rx="3" />
      <polygon points={pts} fill="#1e3a5f" />
      <polygon points={ptsGround} fill="#5c3b1a" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e8eef5" strokeWidth="2" />
      {/* Heading badge */}
      <rect x={0} y={H} width={W} height={badgeH} fill="#0c1a2e" />
      <text
        x={W / 2} y={H + badgeH / 2}
        textAnchor="middle" dominantBaseline="central"
        fill="#ffb547" fontSize={9} fontFamily="monospace" letterSpacing="0.06em"
      >
        {headingLabel} · {String(heading).padStart(3, '0')}°
      </text>
    </svg>
  )
}

function makeTrial(isPractice = false) {
  const pitch   = PITCH_OPTIONS[Math.floor(Math.random() * PITCH_OPTIONS.length)]
  const roll    = ROLL_OPTIONS[Math.floor(Math.random() * ROLL_OPTIONS.length)]
  const heading = HEADING_OPTIONS[Math.floor(Math.random() * HEADING_OPTIONS.length)]

  // Distractor 1: wrong heading only (same attitude) — isolates heading dimension
  const d1 = { pitch, roll, heading: getRandDiff(HEADING_OPTIONS, heading) }
  // Distractor 2: wrong pitch+roll, same heading
  const d2 = { pitch: getRandDiff(PITCH_OPTIONS, pitch), roll: getRandDiff(ROLL_OPTIONS, roll), heading }
  // Distractor 3: wrong everything
  const d3 = {
    pitch:   getRandDiff(PITCH_OPTIONS, pitch),
    roll:    getRandDiff(ROLL_OPTIONS, roll),
    heading: getRandDiff(HEADING_OPTIONS, heading),
  }

  const correctIdx  = Math.floor(Math.random() * 4)
  const options = [d1, d2, d3]
  options.splice(correctIdx, 0, { pitch, roll, heading })

  // Rotate the reference instruments to force mental reorientation (practice stays upright)
  const frameRotation = isPractice
    ? 0
    : FRAME_ROTATIONS[Math.floor(Math.random() * FRAME_ROTATIONS.length)]

  return { pitch, roll, heading, options, correctIdx, frameRotation, isPractice }
}

function buildTrials() {
  return [
    makeTrial(true),
    ...Array.from({ length: NUM_TRIALS }, () => makeTrial(false)),
  ]
}

export default function SpatialOrientationBlock() {
  const addSOTrial = useStore(s => s.addSOTrial)
  const setPhase   = useStore(s => s.setPhase)

  const [trials]                    = useState(() => buildTrials())
  const [trialIdx, setTrialIdx]     = useState(0)
  const [selected, setSelected]     = useState(null)
  const [clickCount, setClickCount] = useState(0)
  const [answered, setAnswered]     = useState(false)
  const [feedback, setFeedback]     = useState(null)
  const [timeLeft, setTimeLeft]     = useState(TIMEOUT_PRACTICE)

  const startTimeRef = useRef(Date.now())
  const timerRef     = useRef(null)

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
        heading: trial.heading,
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

  const timerPct = (timeLeft / trialTimeout) * 100
  const secsLeft = Math.ceil(timeLeft / 1000)

  return (
    <div className="so-screen">
      <div className="so-header">
        <div className="so-label">Prueba 2 · Orientación Espacial</div>
        <div className="so-progress">
          {trial.isPractice ? 'Práctica 1/1' : `Ítem ${trialIdx}/${trials.length - 1}`}
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
            width: `${timerPct}%`, transition: 'width 0.1s linear', borderRadius: 2,
          }} />
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 16, color: timerPct < 30 ? 'var(--red)' : 'var(--text)', opacity: 0.8 }}>
          {secsLeft}s
          {trial.isPractice && <span style={{ marginLeft: 8, opacity: 0.5 }}>· práctica sin límite de presión</span>}
        </div>
      </div>

      <div className="so-instruction">
        Identifica la vista exterior que corresponde a los indicadores
      </div>

      <div className="so-instruments-row">
        <div className="so-adi-wrap">
          <div className="so-adi-label">Actitud</div>
          <AdiDisplay pitch={trial.pitch} roll={trial.roll} size={130} frameRotation={trial.frameRotation} />
        </div>
        <div className="so-adi-wrap">
          <div className="so-adi-label">Rumbo</div>
          <HsiDisplay heading={trial.heading} size={130} />
        </div>
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
              <HorizonOption pitch={opt.pitch} roll={opt.roll} heading={opt.heading} size={110} />
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
