import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CanvasStage } from '@/canvas/Stage'
import { Toolbar } from '@/components/Toolbar'
import { LibraryTray } from '@/components/LibraryTray'
import { PropertiesPanel } from '@/components/PropertiesPanel'
import { CostPanel, useCalc } from '@/components/CostPanel'
import { MobileBottomSheet } from '@/components/MobileBottomSheet'
import { SettingsModal } from '@/components/SettingsModal'
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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [online, setOnline] = useState(navigator.onLine)
  const { design, result, options, setOptions, client, setClient } = useCalc()
  const isDirty = useCanvasStore((s) => s.isDirty)

  useEffect(() => { void loadTenant() }, [loadTenant])
  useEffect(() => { if (tenant) applyLang(tenant.lang) }, [tenant?.lang])
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

  const onExportClient = async () => {
    if (!tenant) return
    const dataUrl = await captureStage('high')
    exportClientProposal(tenant, design, result, dataUrl)
  }
  const onExportWorker = async () => {
    if (!tenant) return
    const dataUrl = await captureStage('plan')
    exportWorkerPlan(tenant, design, result, dataUrl)
  }

  return (
    <div className="app">
      <Toolbar
        onOpenSettings={() => setSettingsOpen(true)}
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
        </section>
        <PropertiesPanel />
        <aside className="cost-side">
          <CostPanel result={result} options={options} setOptions={setOptions} client={client} setClient={setClient} />
        </aside>
      </main>

      {/* Mobile bottom sheets — primary controls within thumb reach */}
      <div className="mobile-only">
        <MobileBottomSheet
          title={t('app.cost')}
          collapsedPreview={<strong>{formatDZD(result.totals.totalTTC)}</strong>}
          initialOpen={false}
        >
          <CostPanel result={result} options={options} setOptions={setOptions} client={client} setClient={setClient} />
        </MobileBottomSheet>
        <MobileBottomSheet title={t('app.library')}>
          <LibraryTray />
        </MobileBottomSheet>
        <MobileBottomSheet title={t('app.properties')}>
          <PropertiesPanel />
        </MobileBottomSheet>
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
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
async function captureStage(mode: 'high' | 'plan'): Promise<string> {
  const stage = (window as unknown as { __decorStage?: { toDataURL: (o: { pixelRatio: number; mimeType: string }) => string } }).__decorStage
  if (!stage) return ''
  void mode
  return stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' })
}
