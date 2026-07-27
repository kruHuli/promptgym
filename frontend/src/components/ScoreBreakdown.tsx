import { Score } from '../api/client'

const CATEGORIES: { key: keyof Score; label: string; color: string }[] = [
  { key: 'requirements_coverage', label: 'Requirements Coverage', color: 'bg-accent-primary' },
  { key: 'functional_correctness', label: 'Functional Correctness', color: 'bg-accent-success' },
  { key: 'code_quality', label: 'Code Quality', color: 'bg-accent-purple' },
  { key: 'product_taste', label: 'Product Taste', color: 'bg-accent-warning' },
  { key: 'prompting_skill', label: 'Prompting Skill', color: 'bg-accent-danger' },
]

interface ScoreBreakdownProps {
  score: Score
}

export function ScoreBreakdown({ score }: ScoreBreakdownProps) {
  return (
    <div className="space-y-3">
      {CATEGORIES.map(({ key, label, color }) => {
        const val = score[key] as number
        const pct = (val / 20) * 100
        return (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-secondary">{label}</span>
              <span className="font-mono font-bold text-text-primary">{val.toFixed(1)}/20</span>
            </div>
            <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {score.qualitative_breakdown[key] && (
              <div className="text-xs text-text-muted mt-1">{score.qualitative_breakdown[key]}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
