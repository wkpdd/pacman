import { useState } from 'react'

interface Props {
  title: string
  children: React.ReactNode
  initialOpen?: boolean
  /** show a small preview row in the collapsed handle */
  collapsedPreview?: React.ReactNode
}

export function MobileBottomSheet({ title, children, initialOpen = false, collapsedPreview }: Props): React.JSX.Element {
  const [open, setOpen] = useState(initialOpen)
  return (
    <div className={open ? 'bottom-sheet open' : 'bottom-sheet'}>
      <button className="sheet-handle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="sheet-grip" />
        <span className="sheet-title">{title}</span>
        {!open && collapsedPreview && <span className="sheet-preview">{collapsedPreview}</span>}
        <span className="sheet-caret">{open ? '▼' : '▲'}</span>
      </button>
      <div className="sheet-body">{children}</div>
    </div>
  )
}
