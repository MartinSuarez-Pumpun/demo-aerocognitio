import './TransitionScreen.css'

export default function TransitionScreen({ title, description, items, onReady }) {
  return (
    <div className="transition-screen">
      <div className="transition-header">
        <div className="transition-label">Instrucciones</div>
        <div className="transition-title">{title}</div>
      </div>

      <p className="transition-desc">{description}</p>

      {items && items.length > 0 && (
        <div className="transition-items">
          {items.map((item, i) => (
            <div key={i} className="transition-item">
              <span className="transition-item-bullet">▸</span>
              <span className="transition-item-text">{item}</span>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-primary" type="button" onClick={onReady}>
        LISTO
      </button>
    </div>
  )
}
