import { WSMessage } from '../hooks/useSessionWS'

interface TokenCounterProps {
  messages: WSMessage[]
}

export function TokenCounter({ messages }: TokenCounterProps) {
  const totalInput = messages.reduce((sum, m) => sum + (m.tokens?.input ?? 0), 0)
  const totalOutput = messages.reduce((sum, m) => sum + (m.tokens?.output ?? 0), 0)
  const totalCost = messages.reduce((sum, m) => sum + (m.cost_usd ?? 0), 0)

  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      <span className="text-text-muted">
        in: <span className="text-text-secondary">{totalInput.toLocaleString()}</span>
      </span>
      <span className="text-text-muted">
        out: <span className="text-text-secondary">{totalOutput.toLocaleString()}</span>
      </span>
      <span className="text-text-muted">
        cost: <span className="text-accent-warning">${totalCost.toFixed(4)}</span>
      </span>
    </div>
  )
}
