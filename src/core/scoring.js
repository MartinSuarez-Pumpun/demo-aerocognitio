const GRID_SIZE = 5

function mean(a) { return a.reduce((s, x) => s + x, 0) / a.length }
function std(a) { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length) }
function slope(xs, ys) {
  const n = xs.length, mx = mean(xs), my = mean(ys)
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
  return den === 0 ? 0 : num / den
}

export function computeMetrics({ mr, so, sm, sessionStart }) {
  const real = mr.trials.filter(t => !t.isPractice)
  const mrRTs = real.map(t => t.reactionTimeMs)
  const mr_accuracy = real.length ? real.filter(t => t.correct).length / real.length : 0
  const mr_meanReactionMs = mrRTs.length ? mean(mrRTs) : 0
  const mr_rtSlopeMsPerDeg = mrRTs.length >= 2 ? slope(real.map(t => t.rotationAngleDeg), mrRTs) : 0
  const mr_consistencyScore = mrRTs.length >= 2 ? Math.max(0, 1 - std(mrRTs) / (mean(mrRTs) || 1)) : 0

  const soT = so.trials, soRTs = soT.map(t => t.reactionTimeMs)
  const so_accuracy = soT.length ? soT.filter(t => t.correct).length / soT.length : 0
  const so_meanReactionMs = soRTs.length ? mean(soRTs) : 0
  const so_hesitationRate = soT.length ? soT.filter(t => t.answerChanges >= 1).length / soT.length : 0

  const smT = sm.trials
  const sm_changeDetectionRate = smT.length
    ? mean(smT.map(t => t.changedCellsCorrect / (t.totalChangedCells || 1)))
    : 0
  const sm_falsePositiveRate = smT.length
    ? mean(smT.map(t => t.falsePositives / (GRID_SIZE * GRID_SIZE - (t.totalChangedCells || 1))))
    : 0
  const sm_capacity = smT.length ? mean(smT.map(t => t.changedCellsCorrect)) : 0

  const totalItems = real.length + soT.length + smT.length
  const overallAccuracy = totalItems
    ? (real.filter(t => t.correct).length + soT.filter(t => t.correct).length
      + smT.reduce((s, t) => s + t.changedCellsCorrect, 0))
    / (real.length + soT.length + (smT.reduce((s, t) => s + (t.totalChangedCells || 1), 0) || 1))
    : 0
  const sessionDurationMs = Date.now() - sessionStart

  return {
    mr_accuracy, mr_meanReactionMs, mr_rtSlopeMsPerDeg, mr_consistencyScore,
    so_accuracy, so_meanReactionMs, so_hesitationRate,
    sm_changeDetectionRate, sm_falsePositiveRate, sm_capacity,
    totalItems, overallAccuracy, sessionDurationMs,
  }
}
