import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CanvasStage } from '@/canvas/Stage'
import { Toolbar } from '@/components/Toolbar'
import { LibraryTray } from '@/components/LibraryTray'
import { PropertiesPanel } from '@/components/PropertiesPanel'
import { CostPanel, useCalc } from '@/components/CostPanel'
import { MobileBottomSheet } from '@/components/MobileBottomSheet'
import { SettingsModal } from '@/components/SettingsModal'
import { DesignsModal } from '@/components/DesignsModal'
import { QuickCalculator } from '@/components/QuickCalculator'
import { ShareToast } from '@/components/ShareToast'
import { useTenantStore } from '@/store/tenantStore'
import { useCanvasStore } from '@/store/canvasStore'
import { applyLang } from '@/i18n'
import { saveDesign } from '@/store/db'
import { exportClientProposal } from '@/pdf/clientProposal'
import { exportWorkerPlan } from '@/pdf/workerTechnical'
import { formatDZD } from '@/utils/units'

export default function App(): React.JSX.Element {
  const { t } = useTranslation()
  const tenant = useTenantStore((s) => s.tenant)
  const loadTenant = useTenantStore((s) => s.load)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [designsOpen, setDesignsOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const [toastOpen, setToastOpen] = useState(false)
  const setRoom = useCanvasStore((s) => s.setRoom)
  const newDesign = useCanvasStore((s) => s.newDesign)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [online, setOnline] = useState(navigator.onLine)
  const { design, result, options, setOptions, client, setClient } = useCalc()
  const isDirty = useCanvasStore((s) => s.isDirty)

  useEffect(() => { void loadTenant() }, [loadTenant])
  useEffect(() => { if (tenant) applyLang(tenant.lang) }, [tenant?.lang])
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', !!tenant?.highContrast)
  }, [tenant?.highContrast])
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  // Autosave: debounced — never lose a job to a crash, closed tab, or dead battery.
  const saveTimer = useRef<number | null>(null)
  useEffect(() => {
    if (!tenant) return
    if (!isDirty) return
    setSaveStatus('saving')
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      await saveDesign({ ...design, tenantId: tenant.id, totals: result.totals })
      setSaveStatus('saved')
    }, 500)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [design, isDirty, result.totals, tenant])

  const select = useCanvasStore((s) => s.select)
  const onExportClient = async () => {
    if (!tenant) return
    // Drop selection so transformer handles / edit handles don't appear in the render
    select(null)
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    const dataUrl = await captureStage('client')
    exportClientProposal(tenant, design, result, dataUrl)
    setToastOpen(true)
  }
  const onExportWorker = async () => {
    if (!tenant) return
    select(null)
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    const dataUrl = await captureStage('plan')
    exportWorkerPlan(tenant, design, result, dataUrl)
  }

  return (
    <div className="app">
      <Toolbar
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenDesigns={() => setDesignsOpen(true)}
        onOpenCalculator={() => setCalcOpen(true)}
        onExportClientPdf={onExportClient}
        onExportWorkerPdf={onExportWorker}
        saveStatus={saveStatus}
      />
      <main className="app-main">
        <LibraryTray />
        <section className="canvas-wrap">
          <CanvasStage />
          <span className={online ? 'net on' : 'net off'} title={online ? t('app.online') : t('app.offline')}>
            {online ? '● ' + t('app.online') : '○ ' + t('app.offline')}
          </span>
          <EmptyStateCTA />
        </section>
        <PropertiesPanel />
        <aside className="cost-side">
          <CostPanel result={result} options={options} setOptions={setOptions} client={client} setClient={setClient} />
        </aside>
      </main>

      {/* Mobile bottom sheet — one sheet, three tabs, thumb reach */}
      <div className="mobile-only">
        <MobileBottomSheet
          defaultTab="cost"
          tabs={[
            {
              key: 'cost',
              label: t('app.cost'),
              preview: <strong>{formatDZD(result.totals.totalTTC)}</strong>,
              render: () => (
                <CostPanel
                  result={result}
                  options={options}
                  setOptions={setOptions}
                  client={client}
                  setClient={setClient}
                />
              )
            },
            {
              key: 'library',
              label: t('app.library'),
              render: () => <LibraryTray />
            },
            {
              key: 'props',
              label: t('app.properties'),
              render: () => <PropertiesPanel />
            }
          ]}
        />
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {designsOpen && <DesignsModal onClose={() => setDesignsOpen(false)} />}
      {calcOpen && (
        <QuickCalculator
          onClose={() => setCalcOpen(false)}
          onPromoteToCanvas={(r) => { newDesign(); setRoom(r) }}
        />
      )}
      {toastOpen && tenant && (
        <ShareToast
          tenant={tenant}
          client={client}
          totals={result.totals}
          designName={design.name}
          onClose={() => setToastOpen(false)}
        />
      )}
    </div>
  )
}

/**
 * Grab the Konva stage as a PNG data URL. Two modes:
 * - 'high'  → client proposal (with the colored room background + objects).
 * - 'plan'  → worker plan (with dimension grid visible, dimensioned export).
 *
 * Konva's `.toDataURL({ pixelRatio })` already handles HiDPI. The actual
 * stage instance is resolved from the DOM (we expose it on a known
 * window symbol so we don't need a React context for this single use).
 */
function EmptyStateCTA(): React.JSX.Element | null {
  const hasObjects = useCanvasStore((s) => s.objects.length > 0)
  const loadSample = useCanvasStore((s) => s.loadSample)
  if (hasObjects) return null
  return (
    <div className="empty-cta">
      <h2>Commencez votre devis</h2>
      <p>Glissez un élément depuis la bibliothèque, ou chargez un salon d’exemple.</p>
      <button className="btn-primary" onClick={loadSample}>✨ Charger un exemple</button>
    </div>
  )
}

async function captureStage(mode: 'client' | 'plan'): Promise<string> {
  const w = window as unknown as {
    __decorStage?: { toDataURL: (o: { pixelRatio: number; mimeType: string }) => string }
    __decorViewMode?: (m: 'client' | 'plan') => void
  }
  if (!w.__decorStage) return ''
  // Swap the view mode (toggles grid + dimensions) before capturing.
  w.__decorViewMode?.(mode)
  // Wait one frame so React + Konva commit the toggled layers.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  const url = w.__decorStage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' })
  // Restore "plan" view (showing dims) as the user's default editor view.
  w.__decorViewMode?.('plan')
  return url
}
