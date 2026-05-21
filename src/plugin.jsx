import { useEffect } from 'react'
import './plugin.css'
import App from './App'
import { useStore } from './core/store'

/**
 * AeroCognitio — Plugin entry point for INNOVADEF-2026.
 *
 * The wrapper div (.aerocognitio-plugin) scopes the CSS custom properties
 * (--accent, --border, etc.) that index.css normally puts on :root.
 * pluginMode={true} disables MilitaryBackground and MouseGlow, which
 * conflict with INNOVADEF-2026's own fixed-position layers.
 *
 * onComplete(result) is called when the user clicks "Volver al sistema":
 *   { type: 'aerocognitio', sessionId, role, metrics, report }
 */
export default function AeroCognitioPlugin({ onComplete }) {
  const reset = useStore(s => s.reset)

  useEffect(() => () => reset(), []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="aerocognitio-plugin">
      <App onPluginComplete={onComplete} pluginMode={true} />
    </div>
  )
}
