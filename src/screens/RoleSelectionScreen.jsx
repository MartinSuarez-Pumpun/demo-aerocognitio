import { useStore } from '../core/store'
import './RoleSelectionScreen.css'

const ROLES = [
  {
    id: 'rpas_pilot_class_ii',
    name: 'Piloto RPAS Clase II',
    desc: 'Control directo de aeronave no tripulada de mediano alcance en misiones de vigilancia e interdicción.',
    dims: [
      { label: 'Orientación espacial', weight: 'critical' },
      { label: 'Rotación mental',      weight: 'high' },
      { label: 'Memoria espacial',     weight: 'medium' },
    ],
  },
  {
    id: 'sensor_operator',
    name: 'Operador de Sensor',
    desc: 'Gestión de payload de inteligencia, vigilancia y reconocimiento (ISR) durante la misión.',
    dims: [
      { label: 'Memoria espacial',     weight: 'critical' },
      { label: 'Rotación mental',      weight: 'high' },
      { label: 'Orientación espacial', weight: 'medium' },
    ],
  },
  {
    id: 'image_analyst',
    name: 'Analista de Imagen',
    desc: 'Explotación de imágenes aéreas y satelitales para extracción de inteligencia de interés.',
    dims: [
      { label: 'Rotación mental',      weight: 'critical' },
      { label: 'Memoria espacial',     weight: 'high' },
      { label: 'Orientación espacial', weight: 'low' },
    ],
  },
  {
    id: 'mission_controller',
    name: 'Controlador de Misión',
    desc: 'Coordinación de múltiples activos aéreos y gestión del espacio aéreo en operaciones complejas.',
    dims: [
      { label: 'Memoria espacial',     weight: 'critical' },
      { label: 'Orientación espacial', weight: 'high' },
      { label: 'Rotación mental',      weight: 'medium' },
    ],
  },
]

const CHIP_LABELS = {
  critical: 'CRÍTICA',
  high: 'ALTA',
  medium: 'MEDIA',
  low: 'BAJA',
}

export default function RoleSelectionScreen() {
  const setRole = useStore(s => s.setRole)
  const setPhase = useStore(s => s.setPhase)

  function handleSelect(id) {
    setRole(id)
    setPhase('mrInstructions')
  }

  return (
    <div className="role-selection-screen">
      <div>
        <div className="role-selection-title">Configuración de sesión</div>
        <div className="role-selection-heading">Selecciona rol objetivo</div>
      </div>

      <div className="role-grid">
        {ROLES.map(role => (
          <button
            key={role.id}
            className="role-card-btn"
            type="button"
            onClick={() => handleSelect(role.id)}
          >
            <div className="role-card-id">{role.id}</div>
            <div className="role-card-name">{role.name}</div>
            <div className="role-card-desc">{role.desc}</div>
            <div className="role-card-dims">
              {role.dims.map(d => (
                <div key={d.label} className="role-dim-row">
                  <span className="role-dim-label">{d.label}</span>
                  <span className={`role-dim-chip chip-${d.weight}`}>{CHIP_LABELS[d.weight]}</span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
