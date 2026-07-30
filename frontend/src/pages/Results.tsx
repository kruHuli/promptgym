import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, Score } from '../api/client'
import { ScoreBreakdown } from '../components/ScoreBreakdown'

export default function Results() {
  const { id } = useParams<{ id: string }>()
  const sessionId = id ? Number(id) : null
  const navigate = useNavigate()
  const [score, setScore] = useState<Score | null>(null)
  const [loading, setLoading] = useState(true)
  const [timedOut, setTimedOut] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)
  const [gradeVisible, setGradeVisible] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    let attempts = 0
    let timer: ReturnType<typeof setInterval>

    const poll = async () => {
      attempts++
      if (attempts > 60) {
        clearInterval(timer)
        setLoading(false)
        setTimedOut(true)
        return
      }
      const s = await api.getScore(sessionId)
      if (s) {
        setScore(s)
        setLoading(false)
        clearInterval(timer)
      }
    }

    poll()
    timer = setInterval(poll, 2000)
    return () => clearInterval(timer)
  }, [sessionId])

  // Animate counter once score arrives
  useEffect(() => {
    if (!score) return
    const target = Math.round(score.overall_numeric)
    let current = 0
    const steps = 48
    const stepSize = target / steps
    const interval = 1100 / steps

    const timer = setInterval(() => {
      current = Math.min(current + stepSize, target)
      setDisplayScore(Math.round(current))
      if (current >= target) {
        clearInterval(timer)
        setTimeout(() => setGradeVisible(true), 280)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [score])

  if (timedOut) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-accent-danger text-sm font-mono">grading timed out</div>
        <div className="text-text-muted text-xs font-mono">judge LLM did not respond within 2 minutes</div>
        <button className="btn-ghost mt-2" onClick={() => navigate('/')}>← back to challenges</button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-text-muted text-sm font-mono">grading your submission...</div>
        <div className="text-text-muted text-xs font-mono opacity-60">judge llm is evaluating your work</div>
      </div>
    )
  }

  if (!score) {
    return <div className="text-text-muted text-center py-20 font-mono">no score found</div>
  }

  const overall = Math.round(score.overall_numeric)
  const grade =
    overall >= 90 ? 'S' : overall >= 80 ? 'A' : overall >= 70 ? 'B' : overall >= 60 ? 'C' : overall >= 50 ? 'D' : 'F'

  const gradeColor =
    grade === 'S' || grade === 'A'
      ? 'text-accent-score text-glow-orange'
      : grade === 'B' || grade === 'C'
      ? 'text-accent-warning'
      : 'text-accent-danger'

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <button
        onClick={() => navigate('/')}
        className="text-text-muted text-sm hover:text-text-secondary mb-8 flex items-center gap-1 font-mono transition-colors"
      >
        ← back to challenges
      </button>

      {/* Score hero */}
      <div className="card-gradient mb-8 py-12 text-center">
        <div className="text-text-muted text-xs font-mono tracking-widest mb-4">FINAL SCORE</div>
        <div className="flex items-center justify-center gap-6">
          <span className="text-8xl font-bold text-text-primary tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {displayScore}
          </span>
          <div className="text-left">
            {gradeVisible ? (
              <div className={`text-5xl font-bold animate-grade-pop ${gradeColor}`}>
                {grade}
              </div>
            ) : (
              <div className="text-5xl font-bold text-transparent select-none">?</div>
            )}
            <div className="text-text-muted text-xs font-mono mt-1">/100</div>
          </div>
        </div>
        {score.qualitative_summary && gradeVisible && (
          <p className="text-text-secondary text-sm mt-6 max-w-lg mx-auto leading-relaxed">
            {score.qualitative_summary}
          </p>
        )}
      </div>

      {/* Score breakdown */}
      <div className="card mb-5">
        <h2 className="text-xs font-mono text-text-muted tracking-widest mb-4">BREAKDOWN</h2>
        <ScoreBreakdown score={score} />
      </div>

      {/* Efficiency */}
      <div className="card mb-8">
        <h2 className="text-xs font-mono text-text-muted tracking-widest mb-4">EFFICIENCY</h2>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-2xl font-mono font-bold text-text-primary">
              ${score.token_cost_total.toFixed(4)}
            </div>
            <div className="text-text-muted text-xs mt-1 font-mono">total token cost</div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-mono font-bold ${
              score.token_cost_percentile < 50 ? 'text-accent-success' : 'text-accent-warning'
            }`}>
              P{Math.round(score.token_cost_percentile)}
            </div>
            <div className="text-text-muted text-xs mt-1 font-mono">
              {score.token_cost_percentile < 50 ? 'cheaper than most' : 'more expensive than most'}
            </div>
          </div>
        </div>
        <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-primary rounded-full transition-all duration-1000"
            style={{ width: `${score.token_cost_percentile}%` }}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button className="btn-ghost flex-1" onClick={() => navigate('/dashboard')}>
          view dashboard
        </button>
        <button className="btn-primary flex-1" onClick={() => navigate('/')}>
          try another →
        </button>
      </div>
    </div>
  )
}
