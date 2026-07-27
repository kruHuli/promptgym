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
  const [polling, setPolling] = useState(true)

  useEffect(() => {
    if (!sessionId) return
    let timer: ReturnType<typeof setInterval>

    const poll = async () => {
      const s = await api.getScore(sessionId)
      if (s) {
        setScore(s)
        setLoading(false)
        setPolling(false)
        clearInterval(timer)
      }
    }

    poll()
    timer = setInterval(poll, 2000)
    return () => clearInterval(timer)
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-text-muted text-sm">Grading your submission...</div>
        <div className="text-text-muted text-xs font-mono">Judge LLM is evaluating your work</div>
      </div>
    )
  }

  if (!score) {
    return <div className="text-text-muted text-center py-20">No score found</div>
  }

  const overall = Math.round(score.overall_numeric)
  const grade =
    overall >= 90 ? 'S' : overall >= 80 ? 'A' : overall >= 70 ? 'B' : overall >= 60 ? 'C' : overall >= 50 ? 'D' : 'F'
  const gradeColor =
    grade === 'S' || grade === 'A'
      ? 'text-accent-success'
      : grade === 'B' || grade === 'C'
      ? 'text-accent-warning'
      : 'text-accent-danger'

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <button onClick={() => navigate('/')} className="text-text-muted text-sm hover:text-text-primary mb-6 flex items-center gap-1">
        ← Back to challenges
      </button>

      {/* Score hero */}
      <div className="card mb-8 text-center py-10">
        <div className="text-text-muted text-sm font-mono mb-2">FINAL SCORE</div>
        <div className="flex items-center justify-center gap-4">
          <span className="text-7xl font-bold text-text-primary tabular-nums">{overall}</span>
          <div className="text-left">
            <div className={`text-4xl font-bold ${gradeColor}`}>{grade}</div>
            <div className="text-text-muted text-xs">/100</div>
          </div>
        </div>
        {score.qualitative_summary && (
          <p className="text-text-secondary text-sm mt-6 max-w-lg mx-auto leading-relaxed">
            {score.qualitative_summary}
          </p>
        )}
      </div>

      {/* Score breakdown */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4 font-mono">BREAKDOWN</h2>
        <ScoreBreakdown score={score} />
      </div>

      {/* Token cost */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-3 font-mono">EFFICIENCY</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-mono font-bold text-text-primary">
              ${score.token_cost_total.toFixed(4)}
            </div>
            <div className="text-text-muted text-xs mt-1">total token cost</div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-mono font-bold ${
              score.token_cost_percentile < 50 ? 'text-accent-success' : 'text-accent-warning'
            }`}>
              P{Math.round(score.token_cost_percentile)}
            </div>
            <div className="text-text-muted text-xs mt-1">
              {score.token_cost_percentile < 50 ? 'cheaper than most' : 'more expensive than most'}
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 bg-bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-primary rounded-full"
            style={{ width: `${score.token_cost_percentile}%` }}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button className="btn-ghost flex-1" onClick={() => navigate('/dashboard')}>
          View Dashboard
        </button>
        <button className="btn-primary flex-1" onClick={() => navigate('/')}>
          Try Another Challenge
        </button>
      </div>
    </div>
  )
}
