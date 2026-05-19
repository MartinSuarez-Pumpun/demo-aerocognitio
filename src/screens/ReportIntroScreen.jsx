import { useEffect, useRef, useState } from 'react'
import { useStore } from '../core/store'
import PlasmaSphere from '../ui/PlasmaSphere'
import './ReportIntroScreen.css'

export default function ReportIntroScreen() {
  const { reportSummary, reportAudioUrl, setPhase } = useStore()

  const [displayedChars, setDisplayedChars] = useState(0)
  const [isSpeaking, setIsSpeaking]         = useState(false)
  const [speakIntensity, setSpeakIntensity] = useState(0)
  const [status, setStatus]                 = useState('Iniciando síntesis...')
  const [showPlayBtn, setShowPlayBtn]       = useState(false)

  const cancelledRef   = useRef(false)
  const isSpeakingRef  = useRef(false)
  const audioRef       = useRef(null)
  const audioCtxRef    = useRef(null)
  const analyserRafRef = useRef(null)
  const typewriterRef  = useRef(null)

  function cleanup() {
    cancelledRef.current = true
    cancelAnimationFrame(analyserRafRef.current)
    clearInterval(typewriterRef.current)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {})
  }

  const advance = () => { cleanup(); setPhase('report') }

  // ── Typewriter ────────────────────────────────────────────────────────────
  function startTypewriter(text, durationMs) {
    clearInterval(typewriterRef.current)
    const msPerChar = durationMs ? (durationMs * 0.92) / text.length : 60
    let i = 0
    typewriterRef.current = setInterval(() => {
      if (cancelledRef.current) { clearInterval(typewriterRef.current); return }
      i++
      setDisplayedChars(Math.min(i, text.length))
      if (i >= text.length) clearInterval(typewriterRef.current)
    }, msPerChar)
  }

  // ── Web Audio analyser loop ───────────────────────────────────────────────
  function startAnalyser(analyser) {
    const data = new Uint8Array(analyser.frequencyBinCount)
    function loop() {
      if (cancelledRef.current) return
      analyser.getByteFrequencyData(data)
      const slice = data.slice(0, Math.floor(data.length * 0.4))
      const avg   = slice.reduce((a, b) => a + b, 0) / slice.length
      setSpeakIntensity(Math.min(avg / 60, 1))
      analyserRafRef.current = requestAnimationFrame(loop)
    }
    loop()
  }

  // ── Play prepared blob URL ────────────────────────────────────────────────
  async function playAudio(url, text) {
    if (cancelledRef.current) return

    const audio = new Audio(url)
    audioRef.current = audio

    const ctx      = new AudioContext()
    audioCtxRef.current = ctx
    const source   = ctx.createMediaElementSource(audio)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 128
    source.connect(analyser)
    analyser.connect(ctx.destination)

    audio.addEventListener('loadedmetadata', () => {
      startTypewriter(text, audio.duration * 1000)
    }, { once: true })

    audio.addEventListener('play', () => {
      if (cancelledRef.current) return
      setIsSpeaking(true)
      isSpeakingRef.current = true
      setStatus('AEROCOGNITIO · SÍNTESIS ORAL')
      startAnalyser(analyser)
    }, { once: true })

    audio.addEventListener('ended', () => {
      if (cancelledRef.current) return
      cancelAnimationFrame(analyserRafRef.current)
      clearInterval(typewriterRef.current)
      setDisplayedChars(text.length)
      setSpeakIntensity(0)
      setIsSpeaking(false)
      isSpeakingRef.current = false
      setStatus('Accediendo al informe completo...')
      setTimeout(() => { if (!cancelledRef.current) setPhase('report') }, 1400)
    }, { once: true })

    try {
      await ctx.resume()
      await audio.play()
      setShowPlayBtn(false)
    } catch {
      setStatus('Toca para escuchar la síntesis')
      setShowPlayBtn(true)
    }
  }

  // ── Fallback when TTS API failed ─────────────────────────────────────────
  function fallbackSpeech(text) {
    if (cancelledRef.current) return

    if (import.meta.env.DEV) {
      // In dev: no audio, just show text and wait for manual continue
      console.error('[TTS] xAI TTS failed — audio disabled in dev mode. Use "Continuar al informe →".')
      setStatus('TTS no disponible — continúa manualmente')
      setDisplayedChars(text.length)
      return
    }

    if (!window.speechSynthesis) { setPhase('report'); return }

    setStatus('Síntesis de voz (sistema)')
    startTypewriter(text, null)

    const utter  = new SpeechSynthesisUtterance(text)
    utter.lang   = 'es-ES'
    utter.rate   = 0.88
    utter.onstart = () => {
      if (!cancelledRef.current) {
        setIsSpeaking(true)
        isSpeakingRef.current = true
        setStatus('AEROCOGNITIO · SÍNTESIS ORAL')
      }
    }
    utter.onend = () => {
      if (cancelledRef.current) return
      clearInterval(typewriterRef.current)
      setDisplayedChars(text.length)
      setIsSpeaking(false)
      setStatus('Accediendo al informe completo...')
      setTimeout(() => { if (!cancelledRef.current) setPhase('report') }, 1400)
    }
    utter.onerror = () => { if (!cancelledRef.current) setPhase('report') }
    window.speechSynthesis.speak(utter)
  }

  // ── Mount: everything is already prepared in ProcessingScreen ────────────
  useEffect(() => {
    cancelledRef.current = false   // reset in case StrictMode ran cleanup on prior mount
    const text = reportSummary
    const url  = reportAudioUrl

    if (!text) { setPhase('report'); return }

    if (url) {
      playAudio(url, text).catch(() => fallbackSpeech(text))
    } else {
      fallbackSpeech(text)
    }

    return cleanup
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleText = (reportSummary ?? '').slice(0, displayedChars)
  const showCursor  = reportSummary && displayedChars < reportSummary.length

  return (
    <div className="report-intro-screen">
      <div className="report-intro-header">
        <span className="report-intro-brand">AEROCOGNITIO</span>
        <span className="report-intro-separator">·</span>
        <span className="report-intro-status">{status}</span>
        {isSpeaking && <span className="report-intro-speaking-dot" />}
      </div>

      <div className="report-intro-sphere-wrap">
        <PlasmaSphere speakIntensity={speakIntensity} />
      </div>

      {reportSummary && (
        <div className={`report-intro-summary${isSpeaking ? ' speaking' : ''}`}>
          <p>
            {visibleText}
            {showCursor && <span className="report-intro-cursor">█</span>}
          </p>
        </div>
      )}

      {showPlayBtn && (
        <button
          className="report-intro-play-btn"
          onClick={() => { setShowPlayBtn(false); playAudio(reportAudioUrl, reportSummary).catch(() => {}) }}
        >
          ▶ Escuchar síntesis oral
        </button>
      )}

      <button className="report-intro-skip" onClick={advance}>
        Continuar al informe →
      </button>
    </div>
  )
}
