import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { useStore } from '../core/store'
import './MentalRotationBlock.css'

// ── Figuras Shepard-Metzler ──────────────────────────────
const FIGURES = [
  [[0,0,0],[1,0,0],[2,0,0],[3,0,0],[3,1,0],[3,2,0],[3,2,1],[3,2,2]],
  [[0,0,0],[0,0,1],[0,0,2],[1,0,2],[2,0,2],[2,1,2],[2,2,2],[2,2,1]],
  [[0,0,0],[1,0,0],[2,0,0],[2,0,1],[2,0,2],[3,0,2],[3,1,2],[3,2,2]],
  [[0,0,0],[1,0,0],[1,1,0],[1,2,0],[2,2,0],[3,2,0],[3,2,1],[3,2,2]],
  [[0,2,0],[1,2,0],[2,2,0],[2,1,0],[2,0,0],[2,0,1],[2,0,2],[3,0,2]],
]

const TRIAL_ANGLES     = [60, 100, 140, 180, 220, 260]
const TIMEOUT_PRACTICE = 25000
const TIMEOUT_REAL     = 12000
const X_TILT           = 0.38
const ROT_SPEED    = 0.32   // rad/s

// ── Helpers ──────────────────────────────────────────────
function centerCubes(cubes) {
  const xs = cubes.map(c => c[0]), ys = cubes.map(c => c[1]), zs = cubes.map(c => c[2])
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2 + 0.5
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2 + 0.5
  const cz = (Math.max(...zs) + Math.min(...zs)) / 2 + 0.5
  return cubes.map(([x, y, z]) => [x - cx, y - cy, z - cz])
}
function mirrorFig(cubes) { return cubes.map(([x,y,z]) => [-x,y,z]) }

// ── Figura 3D animada ────────────────────────────────────
function RotatingFigure({ cubes, startY, color, emissive }) {
  const groupRef = useRef()
  const centered = centerCubes(cubes)
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * ROT_SPEED
  })
  return (
    <group ref={groupRef} rotation={[X_TILT, startY, 0]}>
      {centered.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[0.94, 0.94, 0.94]} />
          <meshStandardMaterial
            color={color}
            roughness={0.42}
            metalness={0.18}
            emissive={emissive}
            emissiveIntensity={0.45}
          />
        </mesh>
      ))}
    </group>
  )
}

function Scene({ cubes, startY, color, emissive }) {
  return (
    <>
      <OrthographicCamera makeDefault zoom={30} position={[0, 0, 20]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 10, 6]}  intensity={1.4} />
      <directionalLight position={[-4, 2, -4]} intensity={0.25} color="#3355aa" />
      <Suspense fallback={null}>
        <RotatingFigure cubes={cubes} startY={startY} color={color} emissive={emissive} />
      </Suspense>
    </>
  )
}

// ── Colores según estado ─────────────────────────────────
// ── Construcción de trials ───────────────────────────────
// 2 correctas (misma figura, distinta rotación) + 2 distractoras
function buildOptions(figIdx) {
  const fig  = FIGURES[figIdx]
  const pool = FIGURES.map((_, i) => i).filter(i => i !== figIdx).sort(() => Math.random() - 0.5)

  const items = [
    { cubes: fig,                      isCorrect: true  },
    { cubes: fig,                      isCorrect: true  },
    { cubes: mirrorFig(fig),           isCorrect: false },
    { cubes: FIGURES[pool[0]],         isCorrect: false },
  ]
  items.sort(() => Math.random() - 0.5)
  return { options: items }
}

function buildTrials() {
  const practice = [
    { isPractice: true, figIdx: 0, angle: 90, ...buildOptions(0) },
  ]
  const angles = [...TRIAL_ANGLES].sort(() => Math.random() - 0.5)
  const real = angles.map((angle, i) => {
    const figIdx = i % FIGURES.length
    return { isPractice: false, figIdx, angle, ...buildOptions(figIdx) }
  })
  return [...practice, ...real]
}

function optionColors(isSelected, revealed, isCorrect) {
  if (revealed) return isCorrect
    ? { color: '#5fe3b0', emissive: '#002a1a' }
    : { color: '#ff5252', emissive: '#2a0000' }
  if (isSelected) return { color: '#ffd07a', emissive: '#2a1500' }
  return { color: '#c8853a', emissive: '#1f0a00' }
}

// ── Componente principal ─────────────────────────────────
const LABELS = ['A', 'B', 'C', 'D']

export default function MentalRotationBlock() {
  const addMRTrial = useStore(s => s.addMRTrial)
  const setPhase   = useStore(s => s.setPhase)

  const [trials]    = useState(() => buildTrials())
  const [idx, setIdx]        = useState(0)
  const [timeLeft, setTL]    = useState(TIMEOUT_PRACTICE)
  const [selected, setSel]   = useState(new Set()) // índices seleccionados
  const [revealed, setRev]   = useState(false)
  const [startYs]  = useState(() =>
    Array.from({ length: 4 }, () => Math.random() * Math.PI * 2))
  const [refStartY] = useState(() => Math.random() * Math.PI * 2)

  const startRef = useRef(Date.now())
  const timerRef = useRef(null)

  const trial         = trials[idx]
  const totalTrials   = trials.length
  const practiceCount = trials.filter(t => t.isPractice).length
  const realCount     = trials.filter(t => !t.isPractice).length
  const currentPrac   = trials.slice(0, idx + 1).filter(t => t.isPractice).length
  const currentReal   = trials.slice(0, idx + 1).filter(t => !t.isPractice).length

  const advance = useCallback(() => {
    if (idx + 1 >= totalTrials) {
      setPhase('soInstructions')
    } else {
      setIdx(i => i + 1)
      setSel(new Set())
      setRev(false)
      setTL(trials[idx + 1]?.isPractice ? TIMEOUT_PRACTICE : TIMEOUT_REAL)
      startRef.current = Date.now()
    }
  }, [idx, totalTrials, setPhase, trials])

  const toggleOption = useCallback((optIdx) => {
    if (revealed) return
    setSel(prev => {
      const next = new Set(prev)
      next.has(optIdx) ? next.delete(optIdx) : next.add(optIdx)
      return next
    })
  }, [revealed])

  const handleConfirm = useCallback(() => {
    if (revealed || selected.size === 0) return
    setRev(true)
    clearInterval(timerRef.current)

    const rt = Date.now() - startRef.current
    // Correcto solo si seleccionó exactamente las 2 correctas
    const correctIndices = new Set(trial.options.map((o, i) => o.isCorrect ? i : -1).filter(i => i >= 0))
    const correct = selected.size === 2 &&
      [...selected].every(i => trial.options[i].isCorrect) &&
      [...correctIndices].every(i => selected.has(i))

    addMRTrial({ isPractice: trial.isPractice, rotationAngleDeg: trial.angle, correct, reactionTimeMs: rt })
    setTimeout(advance, 1000)
  }, [revealed, selected, trial, addMRTrial, advance])

  // Timer — duración según tipo de trial
  const trialTimeout = trial?.isPractice ? TIMEOUT_PRACTICE : TIMEOUT_REAL
  useEffect(() => {
    startRef.current = Date.now()
    setTL(trialTimeout)
    timerRef.current = setInterval(() => {
      setTL(prev => {
        if (prev <= 100) {
          clearInterval(timerRef.current)
          setRev(true)
          addMRTrial({ isPractice: trial.isPractice, rotationAngleDeg: trial.angle, correct: false, reactionTimeMs: trialTimeout })
          setTimeout(advance, 1000)
          return 0
        }
        return prev - 100
      })
    }, 100)
    return () => clearInterval(timerRef.current)
  }, [idx]) // eslint-disable-line

  if (!trial) return null
  const pct      = (timeLeft / trialTimeout) * 100
  const secsLeft = Math.ceil(timeLeft / 1000)

  return (
    <div className="mr-screen">
      <div className="mr-header">
        <div className="mr-label">Prueba 1 · Rotación Mental</div>
        <div className="mr-progress">
          {trial.isPractice
            ? `Práctica ${currentPrac}/${practiceCount}`
            : `Ítem ${currentReal}/${realCount}`}
        </div>
      </div>

      {trial.isPractice && <div className="mr-practice-badge">PRÁCTICA</div>}

      <div className="mr-timer-row">
        <div className="mr-timer-track">
          <div className={`mr-timer-fill ${pct < 30 ? 'danger' : ''}`} style={{ width: `${pct}%` }} />
        </div>
        <div className={`mr-timer-secs ${pct < 30 ? 'danger' : ''}`}>
          {secsLeft}s {trial.isPractice && <span className="mr-timer-hint">· práctica sin límite de presión</span>}
        </div>
      </div>

      <div className="mr-layout">
        {/* Referencia */}
        <div className="mr-ref-wrap">
          <div className="mr-canvas-label">REFERENCIA</div>
          <div className="mr-canvas mr-canvas--ref">
            <Canvas gl={{ antialias: true, alpha: false }} style={{ background: '#0f1520' }}>
              <Scene
                cubes={FIGURES[trial.figIdx]}
                startY={refStartY}
                color="#ffb547"
                emissive="#2a1200"
              />
            </Canvas>
          </div>
        </div>

        {/* Separador */}
        <div className="mr-divider">
          <span>¿Cuál es la misma figura?</span>
        </div>

        {/* 4 opciones */}
        <div className="mr-options-wrap">
          <div className="mr-options">
            {trial.options.map((opt, i) => {
              const isSel = selected.has(i)
              const { color, emissive } = optionColors(isSel, revealed, opt.isCorrect)
              const isWrong   = revealed && isSel && !opt.isCorrect
              const isCorrect = revealed && opt.isCorrect
              return (
                <button
                  key={i}
                  type="button"
                  className={`mr-option ${isSel ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                  onClick={() => toggleOption(i)}
                  disabled={revealed}
                >
                  <div className="mr-option-label">{LABELS[i]}</div>
                  <div className="mr-canvas mr-canvas--opt">
                    <Canvas gl={{ antialias: true, alpha: false }} style={{ background: '#0a0e14' }}>
                      <Scene cubes={opt.cubes} startY={startYs[i]} color={color} emissive={emissive} />
                    </Canvas>
                  </div>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className={`mr-confirm ${selected.size === 0 || revealed ? 'disabled' : ''}`}
            onClick={handleConfirm}
            disabled={selected.size === 0 || revealed}
          >
            {revealed ? '—' : `Confirmar (${selected.size}/2)`}
          </button>
        </div>
      </div>
    </div>
  )
}