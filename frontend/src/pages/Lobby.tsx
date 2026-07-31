import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, Challenge } from '../api/client'

export default function Lobby() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.getChallenges().then(setChallenges).finally(() => setLoading(false))
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const ch = await api.generateChallenge()
      setChallenges((prev) => [ch, ...prev])
    } catch {
      setError('Failed to generate challenge. Check OPENAI_API_KEY.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Challenges</h1>
          <p className="text-text-muted text-sm mt-1 font-mono">
            pick a brief · direct an ai · get graded
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2 text-sm"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              generating...
            </>
          ) : (
            '+ generate'
          )}
        </button>
      </div>

      {error && (
        <div className="text-accent-danger text-sm mb-6 p-3 bg-accent-danger/10 border border-accent-danger/30 rounded flex items-center justify-between font-mono">
          {error}
          <button onClick={() => setError(null)} className="text-xs underline ml-4 opacity-60 hover:opacity-100">dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card-gradient animate-pulse h-36">
              <div className="h-3 w-16 bg-bg-elevated rounded mb-4" />
              <div className="h-4 w-3/4 bg-bg-elevated rounded mb-3" />
              <div className="h-3 w-full bg-bg-elevated rounded" />
            </div>
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-text-muted text-sm font-mono mb-4">no challenges yet</div>
          <button className="btn-primary text-sm" onClick={handleGenerate} disabled={generating}>
            + generate one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map((ch) => (
            <button
              key={ch.id}
              onClick={() => navigate(`/challenges/${ch.id}`)}
              className="card-gradient text-left group"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={ch.source === 'generated' ? 'tag-purple' : 'tag-cyan'}>
                  {ch.source}
                </span>
                <span className="tag-score">{ch.time_limit_minutes}m</span>
              </div>
              <h3 className="text-white font-semibold text-sm leading-snug mb-2 group-hover:underline">
                {ch.title}
              </h3>
              <p className="text-white/60 text-xs font-mono leading-relaxed line-clamp-3">
                {ch.brief_markdown.replace(/^#+\s/gm, '').slice(0, 120)}…
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
