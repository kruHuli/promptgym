import { Score } from '../api/client'

// 5 distinct colors: purple, green, cyan, yellow, orange — no duplicates
const CATEGORIES: { key: keyof Score; label: string; color: string; glow: string }[] = [
  { key: 'requirements_coverage', label: 'Requirements Coverage', color: '#A855F7', glow: 'rgba(168,85,247,0.4)' },
  { key: 'functional_correctness', label: 'Functional Correctness', color: '#22C55E', glow: 'rgba(34,197,94,0.4)' },
  { key: 'code_quality',           label: 'Code Quality',           color: '#06B6D4', glow: 'rgba(6,182,212,0.4)' },
  { key: 'product_taste',          label: 'Product Taste',          color: '#F59E0B', glow: 'rgba(245,158,11,0.4)' },
  { key: 'prompting_skill',        label: 'Prompting Skill',        color: '#F97316', glow: 'rgba(249,115,22,0.4)' },
]

interface ScoreBreakdownProps {
  score: Score
}

export function ScoreBreakdown({ score }: ScoreBreakdownProps) {
  return (
    <div className="space-y-4">
      {CATEGORIES.map(({ key, label, color, glow }) => {
        const val = score[key] as number
        const pct = (val / 20) * 100
        return (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-text-secondary font-mono">{label}</span>
              <span className="font-mono font-bold text-text-primary tabular-nums">{val.toFixed(1)}<span className="text-text-muted">/20</span></span>
            </div>
            <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: color,
                  boxShadow: `0 0 8px ${glow}`,
                }}
              />
            </div>
            {score.qualitative_breakdown[key] && (
              <div className="text-xs text-text-muted mt-1.5 font-mono leading-relaxed">{score.qualitative_breakdown[key]}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
