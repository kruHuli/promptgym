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

  const tooltipStyle = {
    background: '#0D0A1A',
    border: '1px solid #2D1F5E',
    borderRadius: 6,
    fontFamily: 'Geist Mono Variable, monospace',
    fontSize: 11,
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-10">Dashboard</h1>

      {loading ? (
        <div className="text-text-muted text-center py-20 font-mono text-sm">loading...</div>
      ) : history.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-text-muted text-sm font-mono mb-4">no sessions yet</div>
          <button className="btn-primary text-sm" onClick={() => navigate('/')}>
            start a challenge →
          </button>
        </div>
      ) : (
        <>
          {graded.length >= 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="card">
                <div className="text-xs font-mono text-text-muted tracking-widest mb-4">SCORE OVER TIME</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D1F5E" />
                    <XAxis dataKey="n" tick={{ fill: '#4A3F6B', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#4A3F6B', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: '#4A3F6B' }}
                      itemStyle={{ color: '#A855F7' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#A855F7"
                      strokeWidth={2}
                      dot={{ fill: '#A855F7', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <div className="text-xs font-mono text-text-muted tracking-widest mb-4">COST OVER TIME (USD)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D1F5E" />
                    <XAxis dataKey="n" tick={{ fill: '#4A3F6B', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#4A3F6B', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: '#4A3F6B' }}
                      itemStyle={{ color: '#F97316' }}
                      formatter={(v: number) => [`$${v}`, 'cost']}
                    />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="#F97316"
                      strokeWidth={2}
                      dot={{ fill: '#F97316', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="card">
            <div className="text-xs font-mono text-text-muted tracking-widest mb-5">SESSION HISTORY</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted text-xs border-b border-bg-border">
                  <th className="pb-3 font-mono">Challenge</th>
                  <th className="pb-3 font-mono">Date</th>
                  <th className="pb-3 font-mono text-right">Score</th>
                  <th className="pb-3 font-mono text-right">Cost</th>
                  <th className="pb-3 font-mono text-right">Status</th>
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
                    <td className="py-3 text-text-muted font-mono text-xs">
                      {new Date(h.started_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right font-mono font-bold">
                      {h.overall_score !== null ? (
                        <span className={
                          h.overall_score >= 80 ? 'text-accent-score' :
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
                      <span className={`tag font-mono ${
                        h.status === 'graded' ? 'tag-cyan' :
                        h.status === 'active' ? 'tag-purple' :
                        h.status === 'submitted' ? 'tag-score' :
                        'text-text-muted text-xs'
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
