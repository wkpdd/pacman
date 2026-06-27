import { useTranslation } from 'react-i18next'
import { useCanvasStore } from '@/store/canvasStore'
import { useTenantStore } from '@/store/tenantStore'
import { applyLang } from '@/i18n'
import type { Lang } from '@/types'

interface Props {
  onOpenSettings: () => void
  onOpenDesigns: () => void
  onExportClientPdf: () => void
  onExportWorkerPdf: () => void
  saveStatus: 'idle' | 'saving' | 'saved'
}

export function Toolbar({ onOpenSettings, onOpenDesigns, onExportClientPdf, onExportWorkerPdf, saveStatus }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const undo = useCanvasStore((s) => s.undo)
  const redo = useCanvasStore((s) => s.redo)
  const canUndo = useCanvasStore((s) => s.canUndo())
  const canRedo = useCanvasStore((s) => s.canRedo())
  const newDesign = useCanvasStore((s) => s.newDesign)
  const designName = useCanvasStore((s) => s.designName)
  const setName = useCanvasStore((s) => s.setName)
  const tenant = useTenantStore((s) => s.tenant)
  const setLang = useTenantStore((s) => s.setLang)

  const changeLang = (l: Lang) => {
    void setLang(l)
    applyLang(l)
  }

  return (
    <header className="toolbar">
      <div className="toolbar-left">
        <button className="btn-primary" onClick={newDesign} title={t('app.new')}>
          ＋
        </button>
        <button onClick={onOpenDesigns} title={t('app.open')}>📂</button>
        <input
          className="design-name"
          value={designName}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="toolbar-center">
        <button onClick={undo} disabled={!canUndo} title={t('app.undo')}>↶</button>
        <button onClick={redo} disabled={!canRedo} title={t('app.redo')}>↷</button>
      </div>
      <div className="toolbar-right">
        <span className={`save-status save-${saveStatus}`}>
          {saveStatus === 'saving' ? t('app.saving') : t('app.saved')}
        </span>
        <button onClick={onExportClientPdf} className="btn-export">📄 {t('pdf.client')}</button>
        <button onClick={onExportWorkerPdf} className="btn-export">🛠 {t('pdf.worker')}</button>
        <select
          value={tenant?.lang ?? 'fr'}
          onChange={(e) => changeLang(e.target.value as Lang)}
          className="lang-select"
        >
          <option value="fr">FR</option>
          <option value="ar">عر</option>
          <option value="en">EN</option>
        </select>
        <button onClick={onOpenSettings} title={t('app.settings')}>⚙</button>
      </div>
    </header>
  )
}
