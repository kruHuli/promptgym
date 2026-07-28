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
      <div className="text-xs font-mono text-text-muted px-3 py-2 border-b border-bg-border">
        FILES ({paths.length})
      </div>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="overflow-y-auto border-b border-bg-border" style={{ maxHeight: onSelect ? '100%' : '40%' }}>
          {paths.length === 0 && (
            <div className="text-text-muted text-xs p-3">No files yet</div>
          )}
          {paths.map((path) => (
            <button
              key={path}
              onClick={() => handleSelect(path)}
              className={`w-full text-left px-3 py-1.5 text-xs font-mono truncate hover:bg-bg-elevated transition-colors ${
                selected === path ? 'bg-bg-elevated text-accent-primary' : 'text-text-secondary'
              }`}
            >
              {path}
            </button>
          ))}
        </div>
        {!onSelect && selected && files[selected] && (
          <div className="flex-1 overflow-auto">
            <div className="text-xs text-text-muted px-3 py-1 border-b border-bg-border font-mono bg-bg-elevated">
              {selected}
            </div>
            <pre className="text-xs font-mono text-text-primary p-3 whitespace-pre overflow-x-auto leading-relaxed">
              {files[selected]}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
