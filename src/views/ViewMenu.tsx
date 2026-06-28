import { VIEW_SPECS, viewUrl, type ViewMode } from './viewMode'

interface Props { onClose: () => void }

const OPEN_AS_NEW_WINDOW: Exclude<ViewMode, 'designer'>[] = ['client', 'placo', 'deco', '3d']

/**
 * Picker that opens each view in a separate browser window. The new
 * window receives the design via BroadcastChannel + a cached snapshot
 * in localStorage, so it paints immediately and stays in sync.
 */
export function ViewMenu({ onClose }: Props): React.JSX.Element {
  const open = (mode: ViewMode) => {
    const url = viewUrl(mode)
    const features = 'noopener=no,width=1200,height=900,menubar=no,toolbar=no,location=yes'
    window.open(url, `decor-${mode}`, features)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal views-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Ouvrir une vue</h2>
          <button onClick={onClose}>✕</button>
        </header>
        <div className="modal-body">
          <p className="muted">
            Chaque vue s'ouvre dans une nouvelle fenêtre, en lecture seule, et reste
            synchronisée avec ce designer en temps réel. Idéal pour montrer la vue
            client sur une tablette pendant que vous travaillez sur votre téléphone.
          </p>
          <div className="views-grid">
            {OPEN_AS_NEW_WINDOW.map((mode) => {
              const v = VIEW_SPECS[mode]
              return (
                <button key={mode} className="view-card" onClick={() => open(mode)}>
                  <span className="view-icon">{v.icon}</span>
                  <span className="view-label">{v.labelFr}</span>
                  <span className="view-audience">{audienceLabel(v.audience)}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function audienceLabel(a: string): string {
  return {
    'designer': 'Vous',
    'client': 'Le client',
    'worker-placo': 'L\'équipe placo',
    'worker-deco': 'L\'équipe déco'
  }[a] ?? a
}
