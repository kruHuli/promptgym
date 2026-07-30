import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, API_BASE, Challenge } from '../api/client'
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
  const [rightTab, setRightTab] = useState<'output' | 'preview' | 'logs'>('output')
  const [errorDismissed, setErrorDismissed] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [previewNonce, setPreviewNonce] = useState(0)

  // Serve preview from a distinct origin in prod (VITE_PREVIEW_URL) so the allow-same-origin
  // iframe can't reach the parent app. Falls back to the API origin for local dev.
  const PREVIEW_BASE = import.meta.env.VITE_PREVIEW_URL || API_BASE
  const previewUrl = sessionId ? `${PREVIEW_BASE}/sessions/${sessionId}/preview/?v=${previewNonce}` : ''

  const { messages, files, sandboxStdout, timerRemaining, sessionStatus, wsStatus, errorMsg } = useSessionWS(sessionId)
  const visibleError = errorMsg && errorMsg !== errorDismissed ? errorMsg : null

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

  // Auto-switch to output tab when a file is selected
  useEffect(() => {
    if (selectedFile) setRightTab('output')
  }, [selectedFile])

  const handleSend = async (content: string) => {
    if (!sessionId) return
    await api.sendMessage(sessionId, content)
  }

  const handleSubmit = async () => {
    if (!sessionId || submitting) return
    if (!confirm('Submit your session for grading?')) return
    setSubmitting(true)
    await api.submitSession(sessionId)
    // Results page polls for the score, so go there immediately instead of waiting for grading
    navigate(`/sessions/${sessionId}/results`)
  }

  const isDone = sessionStatus === 'submitted' || sessionStatus === 'graded'
  const isWorking = !isDone && messages.length > 0 && messages[messages.length - 1].role === 'user'

  // ponytail: challenge brief as a virtual file so it's always readable while building
  const allFiles: Record<string, string> = {
    ...files,
    'transcript.md': challenge?.brief_markdown ?? 'loading brief…',
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg-base">
      {/* Arena header */}
      <header className="flex items-center gap-3 px-4 h-11 border-b border-bg-border bg-bg-surface shrink-0">
        {/* Logo mark */}
        <span className="font-mono font-bold text-sm tracking-widest select-none">
          <span className="text-accent-primary">P</span>
          <span className="text-accent-cyan">G</span>
        </span>
        <div className="h-4 w-px bg-bg-border" />

        <Timer remainingSeconds={timerRemaining} />
        <div className="h-4 w-px bg-bg-border" />
        <TokenCounter messages={messages} />

        {challenge && (
          <>
            <div className="h-4 w-px bg-bg-border" />
            <span className="text-text-muted text-xs font-mono truncate max-w-xs">{challenge.title}</span>
          </>
        )}

        {wsStatus === 'closed' && (
          <span className="text-accent-warning text-xs font-mono animate-pulse ml-1">reconnecting…</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            className="btn-ghost text-xs px-4 py-1.5"
            onClick={() => { setRightTab('preview'); setPreviewNonce((n) => n + 1) }}
          >
            preview
          </button>
          {sessionStatus === 'active' && (
            <button
              className="btn-primary text-xs px-4 py-1.5"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'submitting…' : 'submit →'}
            </button>
          )}
          {isDone && (
            <span className="tag-score text-xs">{sessionStatus}</span>
          )}
        </div>
      </header>

      {/* Error banner */}
      {visibleError && (
        <div className="text-accent-danger text-xs px-4 py-2 bg-accent-danger/10 border-b border-accent-danger/30 flex items-center justify-between font-mono shrink-0">
          {visibleError}
          <button onClick={() => setErrorDismissed(visibleError)} className="underline ml-4 opacity-70 hover:opacity-100">dismiss</button>
        </div>
      )}

      {/* Three-column layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Column 1: Chat */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r border-bg-border min-h-0">
          <div className="text-xs font-mono text-text-muted px-3 h-8 flex items-center border-b border-bg-border tracking-widest shrink-0">
            CHAT
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatPanel
              messages={messages}
              onSend={handleSend}
              disabled={isDone}
              isWorking={isWorking}
            />
          </div>
        </div>

        {/* Column 2: File tree */}
        <div className="w-48 flex-shrink-0 flex flex-col border-r border-bg-border min-h-0">
          <FileTree files={allFiles} selected={selectedFile} onSelect={setSelectedFile} />
        </div>

        {/* Column 3: Output / Logs */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Tab bar */}
          <div className="flex items-center h-8 border-b border-bg-border px-3 gap-1 shrink-0">
            <button
              onClick={() => setRightTab('output')}
              className={`text-xs font-mono px-2 py-0.5 rounded transition-colors tracking-widest ${
                rightTab === 'output'
                  ? 'text-accent-primary bg-accent-primary/10'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              OUTPUT
            </button>
            <button
              onClick={() => { setRightTab('preview'); setPreviewNonce((n) => n + 1) }}
              className={`text-xs font-mono px-2 py-0.5 rounded transition-colors tracking-widest ${
                rightTab === 'preview'
                  ? 'text-accent-success bg-accent-success/10'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              PREVIEW
            </button>
            <button
              onClick={() => setRightTab('logs')}
              className={`text-xs font-mono px-2 py-0.5 rounded transition-colors tracking-widest ${
                rightTab === 'logs'
                  ? 'text-accent-cyan bg-accent-cyan/10'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              LOGS{sandboxStdout.length > 0 ? ' ●' : ''}
            </button>
            {rightTab === 'preview' && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setPreviewNonce((n) => n + 1)}
                  className="text-xs font-mono text-text-muted hover:text-text-secondary transition-colors"
                  title="Reload preview"
                >
                  ↻ refresh
                </button>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-text-muted hover:text-text-secondary transition-colors"
                  title="Open in new tab"
                >
                  ↗ open
                </a>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto min-h-0">
            {rightTab === 'preview' ? (
              // allow-same-origin: sandbox apps need localStorage; preview origin (:8000) ≠ app origin (:5173), so the parent stays isolated
              <iframe
                key={previewNonce}
                src={previewUrl}
                title="app preview"
                sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
                className="w-full h-full bg-white border-0"
              />
            ) : rightTab === 'output' ? (
              selectedFile && allFiles[selectedFile] ? (
                <>
                  <div className="text-xs font-mono text-text-muted px-3 py-1.5 border-b border-bg-border bg-bg-elevated sticky top-0">
                    {selectedFile}
                  </div>
                  <pre className={`text-xs font-mono text-text-primary p-4 overflow-x-auto leading-relaxed ${selectedFile === 'transcript.md' ? 'whitespace-pre-wrap max-w-3xl' : 'whitespace-pre'}`}>
                    {allFiles[selectedFile]}
                  </pre>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-text-muted text-xs font-mono">
                  select a file to view
                </div>
              )
            ) : (
              <div className="p-4">
                {sandboxStdout.length === 0 ? (
                  <div className="text-text-muted text-xs font-mono">no output yet</div>
                ) : (
                  sandboxStdout.map((line, i) => (
                    <pre key={i} className="text-xs font-mono text-accent-success mb-2 whitespace-pre-wrap leading-relaxed">
                      {line}
                    </pre>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
