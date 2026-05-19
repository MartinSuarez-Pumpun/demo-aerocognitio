import { create } from 'zustand'

const initial = {
  phase: 'welcome', // welcome | roleSelection | mrInstructions | mr | soInstructions | so | smInstructions | sm | processing | reportIntro | report
  targetRole: null,
  sessionId: null,
  sessionStart: null,
  mr: { trials: [] },
  so: { trials: [] },
  sm: { trials: [] },
  report: null,
  reportError: false,
  reportSummary: null,
  reportAudioUrl: null,
}

export const useStore = create((set) => ({
  ...initial,
  startSession: () => set({
    sessionId: 'SES-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    sessionStart: Date.now(),
  }),
  setPhase: (phase) => set({ phase }),
  setRole: (targetRole) => set({ targetRole }),
  addMRTrial: (t) => set(s => ({ mr: { trials: [...s.mr.trials, t] } })),
  addSOTrial: (t) => set(s => ({ so: { trials: [...s.so.trials, t] } })),
  addSMTrial: (t) => set(s => ({ sm: { trials: [...s.sm.trials, t] } })),
  setReport: (report) => set({ report }),
  setReportError: (reportError) => set({ reportError }),
  setReportSummary: (reportSummary) => set({ reportSummary }),
  setReportAudioUrl: (reportAudioUrl) => set({ reportAudioUrl }),
  devJump: (phase, data = {}) => set({ ...initial, phase, ...data }),
  reset: () => set(initial),
}))