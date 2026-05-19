import { useStore } from './core/store'
import DevJump from './ui/DevJump'
import WelcomeScreen from './screens/WelcomeScreen'
import RoleSelectionScreen from './screens/RoleSelectionScreen'
import TransitionScreen from './screens/TransitionScreen'
import ProcessingScreen from './screens/ProcessingScreen'
import ReportIntroScreen from './screens/ReportIntroScreen'
import ReportScreen from './screens/ReportScreen'
import MentalRotationBlock from './tests/MentalRotationBlock'
import SpatialOrientationBlock from './tests/SpatialOrientationBlock'
import SpatialMemoryBlock from './tests/SpatialMemoryBlock'
import MilitaryBackground from './ui/MilitaryBackground'
import MouseGlow from './ui/MouseGlow'
import './App.css'

const MR_INSTRUCTIONS = {
  title: 'PRUEBA 1 · ROTACIÓN MENTAL',
  description: 'Se mostrará una figura 3D de referencia y cuatro opciones rotadas. Identifica cuáles dos son la misma figura.',
  items: [
    'Primero harás un ítem de práctica que no cuenta',
    'Selecciona exactamente 2 figuras que sean idénticas a la referencia (solo rotadas, no espejadas)',
    'Tienes 12 segundos por ítem',
  ],
}

const SO_INSTRUCTIONS = {
  title: 'PRUEBA 2 · ORIENTACIÓN ESPACIAL',
  description: 'Se mostrarán dos instrumentos de vuelo: el indicador de actitud (ADI) y el compás de rumbo (HSI). Identifica qué vista exterior corresponde a ambos.',
  items: [
    'Primero harás un ítem de práctica que no cuenta',
    'El ADI puede aparecer girado en pantalla — debes reorientarte para leerlo correctamente',
    'Cada opción muestra una vista exterior con su horizonte y rumbo magnético',
    'Selecciona la vista que coincide con los dos instrumentos',
  ],
}

const SM_INSTRUCTIONS = {
  title: 'PRUEBA 3 · MEMORIA ESPACIAL TÁCTICA',
  description: 'Observa un mapa táctico, luego se mostrará brevemente una versión modificada. Detecta qué ha cambiado.',
  items: [
    'Primero harás un ítem de práctica que no cuenta',
    'Memoriza el mapa durante 8 segundos',
    'Se mostrará el mapa modificado durante 3 segundos — un símbolo habrá cambiado de posición',
    'Marca la celda donde apareció el símbolo nuevo',
  ],
}

export default function App({ onPluginComplete, pluginMode = false }) {
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
    reportIntro:    <ReportIntroScreen />,
    report:         <ReportScreen onPluginComplete={onPluginComplete} />,
  }

  return (
    <div className="app-shell">
      {!pluginMode && <MilitaryBackground />}
      {!pluginMode && <MouseGlow />}
      <div className="app-content">
        {screens[phase] ?? <WelcomeScreen />}
      </div>
      {import.meta.env.VITE_DEV_JUMP === 'true' && <DevJump />}
    </div>
  )
}