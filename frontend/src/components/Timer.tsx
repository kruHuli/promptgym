interface TimerProps {
  remainingSeconds: number | null
}

export function Timer({ remainingSeconds }: TimerProps) {
  if (remainingSeconds === null) return <span className="text-text-muted font-mono text-sm">--:--</span>

  const m = Math.floor(remainingSeconds / 60)
  const s = remainingSeconds % 60
  const isLow = remainingSeconds < 300 // < 5 min

  return (
    <span className={`font-mono text-sm font-bold tabular-nums ${isLow ? 'text-accent-danger' : 'text-text-primary'}`}>
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}
