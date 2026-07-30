interface TimerProps {
  remainingSeconds: number | null
}

export function Timer({ remainingSeconds }: TimerProps) {
  if (remainingSeconds === null) {
    return <span className="text-text-muted font-mono text-sm tabular-nums">--:--</span>
  }

  const m = Math.floor(remainingSeconds / 60)
  const s = remainingSeconds % 60
  const isCritical = remainingSeconds < 120  // < 2 min
  const isLow = remainingSeconds < 300       // < 5 min

  return (
    <span
      className={`font-mono text-sm font-bold tabular-nums transition-colors ${
        isCritical
          ? 'text-accent-danger animate-pulse'
          : isLow
          ? 'text-accent-warning'
          : 'text-text-primary'
      }`}
      style={isCritical ? { textShadow: '0 0 12px rgba(239, 68, 68, 0.6)' } : undefined}
    >
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}
