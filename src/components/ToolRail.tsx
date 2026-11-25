import type { Tool } from '../model/types.ts'
import { TOOLS } from '../tools.ts'

interface ToolRailProps {
  tool: Tool
  onTool: (tool: Tool) => void
}

export function ToolRail({ tool, onTool }: ToolRailProps) {
  return (
    <nav className="tools" aria-label="Drawing tools">
      {TOOLS.map((t) => (
        <button key={t.tool} type="button" className="tool" aria-pressed={tool === t.tool} onClick={() => onTool(t.tool)}>
          {t.label}
          <kbd>{t.key}</kbd>
        </button>
      ))}
    </nav>
  )
}
