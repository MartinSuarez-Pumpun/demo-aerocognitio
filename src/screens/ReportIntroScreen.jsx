import { useEffect, useRef, useState } from 'react'
import { useStore } from '../core/store'
import PlasmaSphere from '../ui/PlasmaSphere'
import './ReportIntroScreen.css'

const DEBUG = new URLSearchParams(location.search).has('debug')

export default function ReportIntroScreen() {
  const { reportSummary, reportAudioUrl, setPhase } = useStore()

  const [displayedChars, setDisplayedChars] = useState(0)
  const [isSpeaking, setIsSpeaking]         = useState(false)
  const [speakIntensity, setSpeakIntensity] = useState(0)
  const [status, setStatus]                 = useState('Iniciando síntesis...')
  const [showPlayBtn, setShowPlayBtn]       = useState(false)
  const [debugLogs, setDebugLogs]           = useState([])

  const cancelledRef   = useRef(false)
  const isSpeakingRef  = useRef(false)
  const audioRef       = useRef(null)
  const audioCtxRef    = useRef(null)
  const analyserRafRef = useRef(null)
  const typewriterRef  = useRef(null)
  const freqDataRef    = useRef(null)   // Uint8Array — raw frequency bins, read by PlasmaSphere

  function dbg(msg) {
    const line = `${new Date().toISOString().slice(11,23)} ${msg}`
    console.log('[ReportIntro]', line)
    if (DEBUG) setDebugLogs(l => [...l.slice(-18), line])
  }

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
    analyser.fftSize = 256                                 // 128 usable bins
    const data = new Uint8Array(analyser.frequencyBinCount)
    function loop() {
      if (cancelledRef.current) return
      analyser.getByteFrequencyData(data)
      freqDataRef.current = data                          // share raw bins with PlasmaSphere
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
    dbg(`playAudio start — url=${url ? 'ok' : 'null'} textLen=${text?.length}`)

    const audio = new Audio(url)
    audioRef.current = audio

    audio.addEventListener('loadedmetadata', () => {
      dbg(`loadedmetadata — duration=${audio.duration?.toFixed(2)}s`)
      startTypewriter(text, audio.duration * 1000)
    }, { once: true })

    audio.addEventListener('play', () => {
      if (cancelledRef.current) return
      dbg('event: play')
      setIsSpeaking(true)
      isSpeakingRef.current = true
      setStatus('AEROCOGNITIO · SÍNTESIS ORAL')
    }, { once: true })

    audio.addEventListener('ended', () => {
      dbg('event: ended')
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

    audio.addEventListener('error', (e) => {
      dbg(`event: error — code=${audio.error?.code} msg=${audio.error?.message}`)
    }, { once: true })

    // Play first — iOS requires audio.play() before any AudioContext setup
    try {
      dbg('calling audio.play()...')
      await audio.play()
      dbg('audio.play() resolved OK')
      setShowPlayBtn(false)
    } catch (err) {
      dbg(`audio.play() threw — ${err?.name}: ${err?.message}`)
      setStatus('Toca para escuchar la síntesis')
      setShowPlayBtn(true)
      return
    }

    // Analyser is optional: enhances orb animation but must not block audio
    try {
      const ctx      = new AudioContext()
      audioCtxRef.current = ctx
      dbg(`AudioContext state=${ctx.state}`)
      const source   = ctx.createMediaElementSource(audio)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      analyser.connect(ctx.destination)
      await ctx.resume()
      dbg(`AudioContext resumed — state=${ctx.state}`)
      startAnalyser(analyser)
    } catch (err) {
      dbg(`AudioContext setup failed — ${err?.name}: ${err?.message}`)
    }
  }

  // ── Fallback when TTS API failed ─────────────────────────────────────────
  function fallbackSpeech(text) {
    if (cancelledRef.current) return
    dbg('fallbackSpeech called')

    if (import.meta.env.DEV) {
      console.error('[TTS] xAI TTS failed — audio disabled in dev mode. Use "Continuar al informe →".')
      setStatus('TTS no disponible — continúa manualmente')
      setDisplayedChars(text.length)
      return
    }

    if (!window.speechSynthesis) { dbg('no speechSynthesis — skip to report'); setPhase('report'); return }

    setStatus('Síntesis de voz (sistema)')
    startTypewriter(text, null)

    const utter  = new SpeechSynthesisUtterance(text)
    utter.lang   = 'es-ES'
    utter.rate   = 0.88
    utter.onstart = () => {
      dbg('speechSynthesis: start')
      if (!cancelledRef.current) {
        setIsSpeaking(true)
        isSpeakingRef.current = true
        setStatus('AEROCOGNITIO · SÍNTESIS ORAL')
      }
    }
    utter.onend = () => {
      dbg('speechSynthesis: end')
      if (cancelledRef.current) return
      clearInterval(typewriterRef.current)
      setDisplayedChars(text.length)
      setIsSpeaking(false)
      setStatus('Accediendo al informe completo...')
      setTimeout(() => { if (!cancelledRef.current) setPhase('report') }, 1400)
    }
    utter.onerror = (e) => { dbg(`speechSynthesis: error — ${e.error}`); if (!cancelledRef.current) setPhase('report') }
    window.speechSynthesis.speak(utter)
  }

  // ── Mount: everything is already prepared in ProcessingScreen ────────────
  useEffect(() => {
    cancelledRef.current = false
    const text = reportSummary
    const url  = reportAudioUrl

    dbg(`mount — summaryLen=${text?.length ?? 0} audioUrl=${url ? 'ok' : 'null'}`)

    if (!text) { dbg('no text — skip to report'); setPhase('report'); return }

    if (url) {
      playAudio(url, text).catch((err) => { dbg(`playAudio threw — ${err}`); fallbackSpeech(text) })
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
        <PlasmaSphere speakIntensity={speakIntensity} freqDataRef={freqDataRef} />
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

      {DEBUG && debugLogs.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.85)', color: '#0f0', fontFamily: 'monospace',
          fontSize: '11px', padding: '8px', zIndex: 9999,
          maxHeight: '40vh', overflowY: 'auto',
        }}>
          {debugLogs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  )
}
