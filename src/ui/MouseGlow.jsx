import { useEffect, useState } from 'react'

const ACCENT = '#00FF41'

export default function MilitaryCursor() {
  const [pos, setPos]     = useState({ x: -100, y: -100 })
  const [fired, setFired] = useState(false)
  const [shots, setShots] = useState([])

  useEffect(() => {
    const move  = (e) => setPos({ x: e.clientX, y: e.clientY })
    const click = (e) => {
      const id = Date.now()
      setFired(true)
      setShots(s => [...s, { id, x: e.clientX, y: e.clientY }])
      setTimeout(() => setFired(false), 180)
      setTimeout(() => setShots(s => s.filter(sh => sh.id !== id)), 700)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('click', click)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('click', click)
    }
  }, [])

  const s = fired ? 48 : 39

  return (
    <>
      <div style={{
        position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
        pointerEvents: 'none',
        transform: 'translate(-50%,-50%)',
        transition: 'width 0.08s, height 0.08s',
      }}>
        <svg width={s * 2} height={s * 2} style={{
          display: 'block',
          filter: fired
            ? `drop-shadow(0 0 0.74vmin ${ACCENT})`
            : `drop-shadow(0 0 3px ${ACCENT})`,
        }}>
          <circle cx={s} cy={s} r={s - 3} fill="none" stroke={ACCENT}
            strokeWidth={fired ? 2.25 : 1.5} strokeDasharray="6 9"
            opacity={fired ? 1 : 0.85} />
          <line x1={s} y1={3}        x2={s}        y2={s - 9}      stroke={ACCENT} strokeWidth={fired ? 2.25 : 1.5} />
          <line x1={s} y1={s + 9}    x2={s}        y2={s * 2 - 3}  stroke={ACCENT} strokeWidth={fired ? 2.25 : 1.5} />
          <line x1={3} y1={s}        x2={s - 9}    y2={s}          stroke={ACCENT} strokeWidth={fired ? 2.25 : 1.5} />
          <line x1={s + 9} y1={s}    x2={s * 2 - 3} y2={s}         stroke={ACCENT} strokeWidth={fired ? 2.25 : 1.5} />
          <circle cx={s} cy={s} r={fired ? 4.5 : 3} fill={ACCENT} opacity={fired ? 1 : 0.7} />
          <circle cx={s} cy={s} r={9} fill="none" stroke={ACCENT}
            strokeWidth={1.2} opacity={fired ? 0.9 : 0.5} />
        </svg>
      </div>

      {shots.map(sh => (
        <div key={sh.id} style={{
          position: 'fixed', left: sh.x, top: sh.y, zIndex: 9998,
          pointerEvents: 'none',
          transform: 'translate(-50%,-50%)',
        }}>
          <svg width="120" height="120" style={{ animation: 'shotFade 0.65s ease-out forwards' }}>
            <circle cx="60" cy="60" r="12" fill="none" stroke={ACCENT} strokeWidth="2.25"
              style={{ animation: 'ripple1 0.65s ease-out forwards' }} />
            <circle cx="60" cy="60" r="24" fill="none" stroke={ACCENT} strokeWidth="1.5"
              style={{ animation: 'ripple2 0.65s ease-out forwards' }} />
            <circle cx="60" cy="60" r="42" fill="none" stroke={ACCENT} strokeWidth="0.9"
              style={{ animation: 'ripple3 0.65s ease-out forwards' }} />
            {[0,45,90,135,180,225,270,315].map(angle => {
              const rad = angle * Math.PI / 180
              return (
                <line key={angle}
                  x1={60 + Math.cos(rad) * 15} y1={60 + Math.sin(rad) * 15}
                  x2={60 + Math.cos(rad) * 45} y2={60 + Math.sin(rad) * 45}
                  stroke={ACCENT} strokeWidth="1.2"
                  style={{ animation: 'rayFade 0.5s ease-out forwards' }}
                />
              )
            })}
            <circle cx="60" cy="60" r="4.5" fill={ACCENT}
              style={{ animation: 'coreFade 0.4s ease-out forwards' }} />
          </svg>
        </div>
      ))}

      <style>{`
        * { cursor: none !important; }
        @keyframes shotFade { 0%{opacity:1}   100%{opacity:0} }
        @keyframes ripple1  { 0%{r:6;opacity:1}    100%{r:27;opacity:0} }
        @keyframes ripple2  { 0%{r:12;opacity:0.8} 100%{r:42;opacity:0} }
        @keyframes ripple3  { 0%{r:21;opacity:0.5} 100%{r:60;opacity:0} }
        @keyframes rayFade  { 0%{opacity:1;stroke-width:2.25} 100%{opacity:0;stroke-width:0.45} }
        @keyframes coreFade { 0%{r:6;opacity:1} 100%{r:1.5;opacity:0} }
      `}</style>
    </>
  )
}
