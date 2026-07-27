import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, Challenge } from '../api/client'
import { useSessionWS } from '../hooks/useSessionWS'
import { Timer } from '../components/Timer'
import { TokenCounter } from '../components/TokenCounter'
import { ChatPanel } from '../components/ChatPanel'
import { FileTree } from '../components/FileTree'

export default function LiveBuild() {
  const { id } = useParams<{ id: string }>()
  const sessionId = id ? Number(id) : null
  const navigate = useNavigate()

  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'logs'>('chat')

  const { messages, files, sandboxStdout, timerRemaining, sessionStatus } = useSessionWS(sessionId)

  useEffect(() => {
    if (!sessionId) return
    api.getSession(sessionId).then((sess) => {
      api.getChallenge(sess.challenge_id).then(setChallenge)
    })
  }, [sessionId])

  useEffect(() => {
    if (sessionStatus === 'graded' && sessionId) {
      navigate(`/sessions/${sessionId}/results`)
    }
  }, [sessionStatus, sessionId, navigate])

  const handleSend = async (content: string) => {
    if (!sessionId) return
    await api.sendMessage(sessionId, content)
  }

  const handleSubmit = async () => {
    if (!sessionId || submitting) return
    if (!confirm('Submit your session for grading?')) return
    setSubmitting(true)
    await api.submitSession(sessionId)
  }

  const isDone = sessionStatus === 'submitted' || sessionStatus === 'graded'

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-bg-border bg-bg-surface shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-xs font-mono">TIMER</span>
          <Timer remainingSeconds={timerRemaining} />
        </div>
        <div className="h-4 w-px bg-bg-border" />
        <TokenCounter messages={messages} />
        <div className="h-4 w-px bg-bg-border" />
        {challenge && (
          <span className="text-text-secondary text-xs truncate max-w-xs">{challenge.title}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {sessionStatus === 'active' && (
            <button
              className="bg-accent-success hover:opacity-90 text-bg-base font-semibold px-4 py-1.5 rounded text-sm transition-opacity disabled:opacity-50"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit →'}
            </button>
          )}
          {isDone && (
            <span className="text-accent-warning text-xs font-mono px-3 py-1.5 border border-accent-warning rounded">
              {sessionStatus.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Main 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chat */}
        <div className="w-80 shrink-0 flex flex-col border-r border-bg-border bg-bg-base overflow-hidden">
          <div className="flex border-b border-bg-border">
            {(['chat', 'files', 'logs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-mono uppercase transition-colors ${
                  activeTab === tab
                    ? 'text-accent-primary border-b-2 border-accent-primary bg-bg-surface'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' && (
              <ChatPanel messages={messages} onSend={handleSend} disabled={isDone} />
            )}
            {activeTab === 'files' && (
              <FileTree files={files} />
            )}
            {activeTab === 'logs' && (
              <div className="overflow-y-auto h-full p-3">
                {sandboxStdout.length === 0 && (
                  <div className="text-text-muted text-xs">No output yet</div>
                )}
                {sandboxStdout.map((line, i) => (
                  <pre key={i} className="text-xs font-mono text-accent-success mb-2 whitespace-pre-wrap leading-relaxed">
                    {line}
                  </pre>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle: File tree (always visible on larger screens) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Challenge brief strip */}
          {challenge && (
            <div className="border-b border-bg-border bg-bg-surface px-4 py-2 shrink-0">
              <details>
                <summary className="text-xs text-text-muted font-mono cursor-pointer hover:text-text-secondary">
                  Brief: {challenge.title}
                </summary>
                <pre className="text-xs font-mono text-text-secondary mt-2 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {challenge.brief_markdown}
                </pre>
              </details>
            </div>
          )}

          {/* File viewer / preview area */}
          <div className="flex-1 flex overflow-hidden">
            {/* File tree panel */}
            <div className="w-64 shrink-0 border-r border-bg-border overflow-hidden">
              <FileTree files={files} />
            </div>

            {/* Preview / placeholder */}
            <div className="flex-1 flex flex-col items-center justify-center bg-bg-base text-text-muted">
              <div className="text-center space-y-3">
                <div className="text-4xl opacity-30">⬜</div>
                <div className="text-sm">Sandbox Preview</div>
                <div className="text-xs font-mono">
                  {Object.keys(files).length} files · {sandboxStdout.length} log entries
                </div>
                {Object.keys(files).length > 0 && (
                  <div className="mt-4 text-xs text-text-muted font-mono space-y-1">
                    {Object.keys(files).slice(0, 8).map((f) => (
                      <div key={f} className="text-accent-success">✓ {f}</div>
                    ))}
                    {Object.keys(files).length > 8 && (
                      <div className="text-text-muted">+{Object.keys(files).length - 8} more</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
