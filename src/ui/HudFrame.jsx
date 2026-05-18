import './HudFrame.css'

export function HudFrame({ title, subtitle, children, phase, total }) {
  return (
    <div className="hud-frame">
      <div className="hud-corners">
        <span className="corner tl" /><span className="corner tr" />
        <span className="corner bl" /><span className="corner br" />
      </div>
      {title && (
        <div className="hud-top-bar">
          <span className="hud-title">{title}</span>
          {subtitle && <span className="hud-subtitle">{subtitle}</span>}
          {phase != null && <span className="hud-phase">{phase}/{total}</span>}
        </div>
      )}
      <div className="hud-content">{children}</div>
    </div>
  )
}