import { useStore } from './core/store'
import WelcomeScreen from './screens/WelcomeScreen'
import RoleSelectionScreen from './screens/RoleSelectionScreen'
import TransitionScreen from './screens/TransitionScreen'
import ProcessingScreen from './screens/ProcessingScreen'
import ReportScreen from './screens/ReportScreen'
import MentalRotationBlock from './tests/MentalRotationBlock'
import SpatialOrientationBlock from './tests/SpatialOrientationBlock'
import SpatialMemoryBlock from './tests/SpatialMemoryBlock'
import './App.css'

const MR_INSTRUCTIONS = {
  title: 'PRUEBA 1 · ROTACIÓN MENTAL',
  description: 'Se mostrarán dos figuras. Indica si son la misma figura rotada o una figura diferente.',
  items: [
    'Primero harás un ítem de práctica que no cuenta',
    'Selecciona las 2 figuras que son la misma que la referencia (solo rotadas)',
    'Tienes 12 segundos por ítem',
  ],
}

const SO_INSTRUCTIONS = {
  title: 'PRUEBA 2 · ORIENTACIÓN ESPACIAL',
  description: 'Se mostrará un indicador de actitud de vuelo. Selecciona la imagen que corresponde a la vista exterior.',
  items: [
    'Primero harás un ítem de práctica que no cuenta',
    'Lee el indicador de horizonte artificial e identifica pitch y roll',
    'Selecciona la vista exterior correcta entre 4 opciones',
  ],
}

const SM_INSTRUCTIONS = {
  title: 'PRUEBA 3 · MEMORIA ESPACIAL TÁCTICA',
  description: 'Memoriza la posición de elementos tácticos en el grid. Después deberás recordar dónde estaban.',
  items: [
    'Primero harás un ítem de práctica que no cuenta',
    'Memoriza las posiciones de los elementos durante 5 segundos',
    'Indica en qué celdas había elementos',
  ],
}

export default function App() {
  const phase = useStore(s => s.phase)
  const setPhase = useStore(s => s.setPhase)

  const screens = {
    welcome:        <WelcomeScreen />,
    roleSelection:  <RoleSelectionScreen />,
    mrInstructions: <TransitionScreen {...MR_INSTRUCTIONS} onReady={() => setPhase('mr')} />,
    mr:             <MentalRotationBlock />,
    soInstructions: <TransitionScreen {...SO_INSTRUCTIONS} onReady={() => setPhase('so')} />,
    so:             <SpatialOrientationBlock />,
    smInstructions: <TransitionScreen {...SM_INSTRUCTIONS} onReady={() => setPhase('sm')} />,
    sm:             <SpatialMemoryBlock />,
    processing:     <ProcessingScreen />,
    report:         <ReportScreen />,
  }

  return (
    <div className="app-shell">
      {screens[phase] ?? <WelcomeScreen />}
    </div>
  )
}