function getLiveSnapshotWindowMs(snapshot, windowMinutesKey, fallbackWindowMs) {
  const windowMinutes = snapshot?.[windowMinutesKey]
  return (windowMinutes || (fallbackWindowMs / 60000)) * 60 * 1000
}

function isLiveSnapshotPercentFresh(snapshot, pctKey, windowMinutesKey, fallbackWindowMs, now = Date.now()) {
  if (snapshot?.[pctKey] == null || !snapshot?.timestamp) return false

  const windowMs = getLiveSnapshotWindowMs(snapshot, windowMinutesKey, fallbackWindowMs)
  return snapshot.timestamp >= (now - windowMs)
}

function isLiveSnapshotResetValid(snapshot, resetKey, now = Date.now()) {
  return snapshot?.[resetKey] != null && snapshot[resetKey] > now
}

function isLiveSnapshotFresh(snapshot, pctKey, resetKey, windowMinutesKey, fallbackWindowMs, now = Date.now()) {
  return (
    isLiveSnapshotPercentFresh(snapshot, pctKey, windowMinutesKey, fallbackWindowMs, now) &&
    isLiveSnapshotResetValid(snapshot, resetKey, now)
  )
}

module.exports = {
  getLiveSnapshotWindowMs,
  isLiveSnapshotPercentFresh,
  isLiveSnapshotResetValid,
  isLiveSnapshotFresh,
}
