import { useEffect } from 'react'
import { CanvasStage } from '@/canvas/Stage'
import { useDesignSync } from './useDesignSync'
import { VIEW_SPECS, type ViewMode } from './viewMode'
import { useCanvasStore } from '@/store/canvasStore'
import { useCalc, CostPanel } from '@/components/CostPanel'
import { formatDZD } from '@/utils/units'

interface Props { mode: Exclude<ViewMode, 'designer' | '3d'> }

/**
 * A standalone read-only window for one role's view of the design.
 * Stays in sync with the designer window via BroadcastChannel.
 */
export function ViewWindow({ mode }: Props): React.JSX.Element {
  useDesignSync('receiver')
  const spec = VIEW_SPECS[mode]
  const { result, options, setOptions, client, setClient } = useCalc()
  const designName = useCanvasStore((s) => s.designName)

  useEffect(() => {
    document.title = `${spec.labelFr} — ${designName}`
  }, [spec.labelFr, designName])

  return (
    <div className="view-window">
      <header className="view-window-header">
        <span className="view-window-tag">{spec.icon} {spec.labelFr}</span>
        <strong className="view-window-name">{designName}</strong>
        {mode === 'client' && <span className="view-window-total">{formatDZD(result.totals.totalTTC)}</span>}
      </header>
      <main className="view-window-main">
        <section className="canvas-wrap">
          <CanvasStage onContextRequest={() => undefined} viewSpec={spec} />
        </section>
        {mode === 'placo' && (
          <aside className="view-window-aside">
            <CostPanel result={result} options={options} setOptions={setOptions} client={client} setClient={setClient} />
          </aside>
        )}
      </main>
    </div>
  )
}
