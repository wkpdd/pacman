import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FAUX_PLAFOND_LIBRARY, LIBRARY_CATEGORIES } from '@/modules/faux-plafond/library'
import { useCanvasStore } from '@/store/canvasStore'
import { useTenantStore } from '@/store/tenantStore'
import { formatDZD } from '@/utils/units'

export function LibraryTray(): React.JSX.Element {
  const [activeKind, setActiveKind] = useState(LIBRARY_CATEGORIES[0].kind)
  const addObject = useCanvasStore((s) => s.addObject)
  const lang = useTenantStore((s) => s.tenant?.lang ?? 'fr')
  const { t } = useTranslation()
  const items = FAUX_PLAFOND_LIBRARY.filter((m) => m.kind === activeKind)
  return (
    <aside className="library-tray">
      <h2 className="panel-title">{t('app.library')}</h2>
      <nav className="library-cats">
        {LIBRARY_CATEGORIES.map((c) => (
          <button
            key={c.kind}
            className={c.kind === activeKind ? 'cat on' : 'cat'}
            onClick={() => setActiveKind(c.kind)}
          >
            {lang === 'ar' ? c.labelAr : c.labelFr}
          </button>
        ))}
      </nav>
      <div className="library-items">
        {items.map((m) => (
          <button
            key={m.id}
            className="library-card"
            onClick={() => addObject(m.id)}
            title={m.noteFr}
          >
            <span className="card-icon" dangerouslySetInnerHTML={{ __html: m.iconSvg }} />
            <span className="card-label">{lang === 'ar' ? m.labelAr : m.labelFr}</span>
            <span className="card-price">{formatDZD(m.defaultPriceDZD)} / {m.unit}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
