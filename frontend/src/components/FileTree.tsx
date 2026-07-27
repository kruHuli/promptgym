import { useState } from 'react'

interface FileTreeProps {
  files: Record<string, string>
}

export function FileTree({ files }: FileTreeProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const paths = Object.keys(files).sort()

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-mono text-text-muted px-3 py-2 border-b border-bg-border">
        FILES ({paths.length})
      </div>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="overflow-y-auto border-b border-bg-border" style={{ maxHeight: '40%' }}>
          {paths.length === 0 && (
            <div className="text-text-muted text-xs p-3">No files yet</div>
          )}
          {paths.map((path) => (
            <button
              key={path}
              onClick={() => setSelected(selected === path ? null : path)}
              className={`w-full text-left px-3 py-1.5 text-xs font-mono truncate hover:bg-bg-elevated transition-colors ${
                selected === path ? 'bg-bg-elevated text-accent-primary' : 'text-text-secondary'
              }`}
            >
              {path}
            </button>
          ))}
        </div>
        {selected && files[selected] && (
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
