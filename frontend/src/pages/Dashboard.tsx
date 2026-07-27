import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { api, HistoryItem } from '../api/client'

export default function Dashboard() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.getUserHistory(1).then(setHistory).finally(() => setLoading(false))
  }, [])

  const graded = history.filter((h) => h.overall_score !== null)
  const chartData = [...graded].reverse().map((h, i) => ({
    n: i + 1,
    score: h.overall_score,
    cost: h.token_cost_total ? Number(h.token_cost_total.toFixed(4)) : null,
    title: h.challenge_title.slice(0, 20),
  }))

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-text-primary mb-8">Dashboard</h1>

      {loading ? (
        <div className="text-text-muted text-center py-20">Loading...</div>
      ) : history.length === 0 ? (
        <div className="text-text-muted text-center py-20">
          No sessions yet.{' '}
          <button className="text-accent-primary hover:underline" onClick={() => navigate('/')}>
            Start a challenge
          </button>
        </div>
      ) : (
        <>
          {graded.length >= 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="card">
                <div className="text-xs font-mono text-text-muted mb-4">SCORE OVER TIME</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey="n" tick={{ fill: '#8b949e', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#8b949e', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }}
                      labelStyle={{ color: '#8b949e' }}
                      itemStyle={{ color: '#58a6ff' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#58a6ff"
                      strokeWidth={2}
                      dot={{ fill: '#58a6ff', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <div className="text-xs font-mono text-text-muted mb-4">COST OVER TIME (USD)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey="n" tick={{ fill: '#8b949e', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }}
                      labelStyle={{ color: '#8b949e' }}
                      itemStyle={{ color: '#d29922' }}
                      formatter={(v: number) => [`$${v}`, 'cost']}
                    />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="#d29922"
                      strokeWidth={2}
                      dot={{ fill: '#d29922', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="card">
            <div className="text-xs font-mono text-text-muted mb-4">SESSION HISTORY</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted text-xs border-b border-bg-border">
                  <th className="pb-2 font-mono">Challenge</th>
                  <th className="pb-2 font-mono">Date</th>
                  <th className="pb-2 font-mono text-right">Score</th>
                  <th className="pb-2 font-mono text-right">Cost</th>
                  <th className="pb-2 font-mono text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr
                    key={h.session_id}
                    className="border-b border-bg-border hover:bg-bg-elevated cursor-pointer transition-colors"
                    onClick={() =>
                      h.overall_score !== null
                        ? navigate(`/sessions/${h.session_id}/results`)
                        : navigate(`/sessions/${h.session_id}`)
                    }
                  >
                    <td className="py-3 text-text-primary">{h.challenge_title}</td>
                    <td className="py-3 text-text-secondary font-mono text-xs">
                      {new Date(h.started_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right font-mono font-bold">
                      {h.overall_score !== null ? (
                        <span className={
                          h.overall_score >= 80 ? 'text-accent-success' :
                          h.overall_score >= 60 ? 'text-accent-warning' : 'text-accent-danger'
                        }>
                          {Math.round(h.overall_score)}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right font-mono text-text-secondary text-xs">
                      {h.token_cost_total !== null ? `$${h.token_cost_total.toFixed(4)}` : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                        h.status === 'graded' ? 'bg-accent-success/20 text-accent-success' :
                        h.status === 'active' ? 'bg-accent-primary/20 text-accent-primary' :
                        h.status === 'submitted' ? 'bg-accent-warning/20 text-accent-warning' :
                        'bg-bg-elevated text-text-muted'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
