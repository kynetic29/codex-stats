function getLiveSnapshotWindowMs(snapshot, windowMinutesKey, fallbackWindowMs) {
  const windowMinutes = snapshot?.[windowMinutesKey]
  return (windowMinutes || (fallbackWindowMs / 60000)) * 60 * 1000
}

function isLiveSnapshotFresh(snapshot, pctKey, resetKey, windowMinutesKey, fallbackWindowMs, now = Date.now()) {
  if (snapshot?.[pctKey] == null || !snapshot?.[resetKey] || !snapshot?.timestamp) return false

  const windowMs = getLiveSnapshotWindowMs(snapshot, windowMinutesKey, fallbackWindowMs)
  return snapshot[resetKey] > now && snapshot.timestamp >= (now - windowMs)
}

module.exports = {
  getLiveSnapshotWindowMs,
  isLiveSnapshotFresh,
}
