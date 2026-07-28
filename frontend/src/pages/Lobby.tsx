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
    } catch (e) {
      setError('Failed to generate challenge. Check OPENAI_API_KEY.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Challenges</h1>
          <p className="text-text-muted text-sm mt-1">Pick a brief. Direct an AI to build the app. Get graded.</p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-bg-base border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            '+ Generate Challenge'
          )}
        </button>
      </div>

      {error && (
        <div className="text-accent-danger text-sm mb-4 p-3 bg-accent-danger/10 border border-accent-danger/30 rounded flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-xs underline ml-4">Dismiss</button>
        </div>
      )}
      {loading ? (
        <div className="text-text-muted text-center py-20">Loading challenges...</div>
      ) : challenges.length === 0 ? (
        <div className="text-text-muted text-center py-20">
          No challenges yet. Generate one above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map((ch) => (
            <button
              key={ch.id}
              onClick={() => navigate(`/challenges/${ch.id}`)}
              className="card text-left hover:border-accent-primary transition-colors group"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono ${
                    ch.source === 'generated'
                      ? 'bg-accent-purple/20 text-accent-purple'
                      : 'bg-accent-primary/20 text-accent-primary'
                  }`}
                >
                  {ch.source}
                </span>
                <span className="text-xs text-text-muted font-mono">{ch.time_limit_minutes}m</span>
              </div>
              <h3 className="text-text-primary font-semibold text-sm group-hover:text-accent-primary transition-colors leading-snug">
                {ch.title}
              </h3>
              <p className="text-text-muted text-xs mt-2 line-clamp-3 font-mono leading-relaxed">
                {ch.brief_markdown.replace(/^#+\s/gm, '').slice(0, 120)}...
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
