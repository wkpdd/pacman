import { useState, useEffect, useRef } from 'react'

export interface SheetTab {
  key: string
  label: string
  /** preview line shown on the handle when this tab is active and the sheet is closed */
  preview?: React.ReactNode
  render: () => React.ReactNode
}

interface Props {
  tabs: SheetTab[]
  defaultTab?: string
}

/**
 * One sheet, many tabs. Critical because three stacked `position: fixed`
 * sheets at the same bottom would obscure each other on a phone.
 */
export function MobileBottomSheet({ tabs, defaultTab }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key)
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0]

  // Swipe-down to close (touch only). Track a single touch on the handle.
  const startY = useRef<number | null>(null)
  const onHandleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }
  const onHandleTouchEnd = (e: React.TouchEvent) => {
    if (startY.current == null) return
    const dy = e.changedTouches[0].clientY - startY.current
    if (dy > 40) setOpen(false)
    else if (dy < -40) setOpen(true)
    startY.current = null
  }

  // Close on Escape — keyboard parity for desktop testing
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className={open ? 'bottom-sheet open' : 'bottom-sheet'} role="dialog" aria-modal="false">
      <div className="sheet-handle-row" onTouchStart={onHandleTouchStart} onTouchEnd={onHandleTouchEnd}>
        <button className="sheet-grip-wrap" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className="sheet-grip" />
        </button>
        <nav className="sheet-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={tab.key === active}
              className={tab.key === active ? 'sheet-tab on' : 'sheet-tab'}
              onClick={() => {
                setActive(tab.key)
                setOpen(true)
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        {!open && activeTab?.preview && (
          <span className="sheet-preview">{activeTab.preview}</span>
        )}
      </div>
      <div className="sheet-body">{activeTab?.render()}</div>
    </div>
  )
}
