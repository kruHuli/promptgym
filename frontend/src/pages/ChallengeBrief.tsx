import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, Challenge } from '../api/client'

export default function ChallengeBrief() {
  const { id } = useParams<{ id: string }>()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [starting, setStarting] = useState(false)
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
    } catch (e) {
      alert('Failed to start session')
      setStarting(false)
    }
  }

  if (!challenge) return <div className="text-text-muted text-center py-20">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <button onClick={() => navigate('/')} className="text-text-muted text-sm hover:text-text-primary mb-6 flex items-center gap-1">
        ← Back to challenges
      </button>

      <div className="flex items-center gap-3 mb-6">
        <span
          className={`text-xs px-2 py-0.5 rounded font-mono ${
            challenge.source === 'generated'
              ? 'bg-accent-purple/20 text-accent-purple'
              : 'bg-accent-primary/20 text-accent-primary'
          }`}
        >
          {challenge.source}
        </span>
        <span className="text-text-muted text-sm font-mono">{challenge.time_limit_minutes} minutes</span>
      </div>

      <h1 className="text-2xl font-bold text-text-primary mb-6">{challenge.title}</h1>

      {/* Brief rendered as terminal-style block */}
      <div className="bg-bg-surface border border-bg-border rounded-lg overflow-hidden mb-8">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-bg-border bg-bg-elevated">
          <div className="w-3 h-3 rounded-full bg-accent-danger opacity-70" />
          <div className="w-3 h-3 rounded-full bg-accent-warning opacity-70" />
          <div className="w-3 h-3 rounded-full bg-accent-success opacity-70" />
          <span className="text-text-muted text-xs font-mono ml-2">meeting-notes.txt</span>
        </div>
        <pre className="text-text-primary font-mono text-sm p-6 whitespace-pre-wrap leading-relaxed overflow-x-auto">
          {challenge.brief_markdown}
        </pre>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-text-muted text-sm">
          You'll direct an AI agent to build this. Your prompts are scored too.
        </div>
        <button
          className="btn-primary text-base px-8 py-3"
          onClick={handleStart}
          disabled={starting}
        >
          {starting ? 'Starting...' : 'Start Session →'}
        </button>
      </div>
    </div>
  )
}
