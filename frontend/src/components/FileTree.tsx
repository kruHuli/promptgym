import { useState } from 'react'

interface FileTreeProps {
  files: Record<string, string>
  selected?: string | null
  onSelect?: (path: string | null) => void
}

export function FileTree({ files, selected: controlledSelected, onSelect }: FileTreeProps) {
  const [internalSelected, setInternalSelected] = useState<string | null>(null)
  const selected = controlledSelected !== undefined ? controlledSelected : internalSelected
  const paths = Object.keys(files).sort()

  const handleSelect = (path: string) => {
    const next = selected === path ? null : path
    setInternalSelected(next)
    onSelect?.(next)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-mono text-text-muted px-3 h-8 flex items-center border-b border-bg-border tracking-widest shrink-0">
        FILES <span className="ml-1 text-text-muted opacity-50">({paths.length})</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {paths.length === 0 && (
          <div className="text-text-muted text-xs p-3 font-mono">no files yet</div>
        )}
        {paths.map((path) => (
          <button
            key={path}
            onClick={() => handleSelect(path)}
            className={`w-full text-left px-3 py-1.5 text-xs font-mono truncate transition-colors ${
              selected === path
                ? 'text-accent-primary bg-accent-primary/8'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'
            }`}
            style={selected === path ? { background: 'rgba(168,85,247,0.08)' } : undefined}
          >
            {path}
          </button>
        ))}
      </div>
      {/* Inline file content (only used when onSelect is not provided) */}
      {!onSelect && selected && files[selected] && (
        <div className="flex-1 overflow-auto border-t border-bg-border">
          <div className="text-xs text-text-muted px-3 py-1.5 border-b border-bg-border font-mono bg-bg-elevated sticky top-0">
            {selected}
          </div>
          <pre className="text-xs font-mono text-text-primary p-3 whitespace-pre overflow-x-auto leading-relaxed">
            {files[selected]}
          </pre>
        </div>
      )}
    </div>
  )
}
