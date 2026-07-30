import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, Challenge } from '../api/client'

export default function ChallengeBrief() {
  const { id } = useParams<{ id: string }>()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (id) api.getChallenge(Number(id)).then(setChallenge)
  }, [id])

  const handleStart = async () => {
    if (!challenge) return
    setStarting(true)
    try {
      const session = await api.createSession(challenge.id)
      navigate(`/sessions/${session.id}`)
    } catch {
      setError('Failed to start session. Is the backend running?')
      setStarting(false)
    }
  }

  if (!challenge) return (
    <div className="text-text-muted text-center py-20 font-mono text-sm">loading...</div>
  )

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <button
        onClick={() => navigate('/')}
        className="text-text-muted text-sm hover:text-text-secondary mb-8 flex items-center gap-1 font-mono transition-colors"
      >
        ← back
      </button>

      <div className="flex items-center gap-3 mb-5">
        <span className={challenge.source === 'generated' ? 'tag-purple' : 'tag-cyan'}>
          {challenge.source}
        </span>
        <span className="tag-score">{challenge.time_limit_minutes}m</span>
      </div>

      <h1 className="text-2xl font-bold text-text-primary mb-8 leading-tight">{challenge.title}</h1>

      {/* Terminal-style brief block */}
      <div className="bg-bg-surface rounded-lg overflow-hidden mb-8" style={{ border: '1px solid #2D1F5E' }}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-bg-border bg-bg-elevated">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-danger opacity-60" />
          <div className="w-2.5 h-2.5 rounded-full bg-accent-warning opacity-60" />
          <div className="w-2.5 h-2.5 rounded-full bg-accent-success opacity-60" />
          <span className="text-text-muted text-xs font-mono ml-2 opacity-60">brief.md</span>
        </div>
        <pre className="text-text-primary font-mono text-sm p-6 whitespace-pre-wrap leading-relaxed overflow-x-auto">
          {challenge.brief_markdown}
        </pre>
      </div>

      {error && (
        <div className="text-accent-danger text-sm mb-5 p-3 bg-accent-danger/10 border border-accent-danger/30 rounded flex items-center justify-between font-mono">
          {error}
          <button onClick={() => setError(null)} className="text-xs underline ml-4 opacity-60 hover:opacity-100">dismiss</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-text-muted text-sm max-w-xs">
          direct an ai agent to build this · your prompts are scored too
        </p>
        <button
          className="btn-primary text-sm px-8 py-3"
          onClick={handleStart}
          disabled={starting}
        >
          {starting ? 'starting...' : 'start session →'}
        </button>
      </div>
    </div>
  )
}
