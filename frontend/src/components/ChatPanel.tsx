import { useEffect, useRef, useState } from 'react'
import { WSMessage } from '../hooks/useSessionWS'

interface ChatPanelProps {
  messages: WSMessage[]
  onSend: (content: string) => void
  disabled?: boolean
  isWorking?: boolean
}

export function ChatPanel({ messages, onSend, disabled, isWorking }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-text-muted text-xs text-center mt-10 font-mono">
            start by describing what you want to build
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className="text-xs text-text-muted font-mono capitalize">{msg.role}</div>
            <div
              className={`max-w-[88%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap font-mono leading-relaxed ${
                msg.role === 'user'
                  ? 'text-white'
                  : msg.role === 'system'
                  ? 'bg-bg-elevated text-text-muted border border-bg-border'
                  : 'bg-bg-elevated text-text-primary border border-bg-border'
              }`}
              style={msg.role === 'user' ? {
                background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                boxShadow: '0 0 14px rgba(168, 85, 247, 0.25)',
              } : undefined}
            >
              {msg.content}
            </div>
            {msg.cost_usd ? (
              <div className="text-xs text-text-muted font-mono opacity-60">
                ${msg.cost_usd.toFixed(4)} · {msg.tokens?.input}in/{msg.tokens?.output}out
              </div>
            ) : null}
          </div>
        ))}
        {isWorking && (
          <div className="flex flex-col gap-1 items-start">
            <div className="text-xs text-text-muted font-mono">agent</div>
            <div className="bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-xs font-mono text-accent-cyan flex items-center gap-0.5">
              <span>working</span>
              <span className="animate-bounce ml-1" style={{ animationDelay: '0ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-bg-border p-3 shrink-0">
        <div className="flex gap-2">
          <textarea
            className="input resize-none text-xs font-mono"
            rows={3}
            placeholder={disabled ? 'session ended' : 'tell the agent what to build…'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button
            className="btn-primary self-end px-3 py-2 text-xs"
            onClick={handleSend}
            disabled={disabled || !input.trim()}
          >
            send
          </button>
        </div>
        <div className="text-xs text-text-muted mt-1.5 font-mono opacity-50">↵ send · shift+↵ newline</div>
      </div>
    </div>
  )
}
