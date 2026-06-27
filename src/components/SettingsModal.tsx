import { useTranslation } from 'react-i18next'
import { useTenantStore } from '@/store/tenantStore'
import { useState, useEffect } from 'react'
import type { Tenant } from '@/types'

interface Props { onClose: () => void }

export function SettingsModal({ onClose }: Props): React.JSX.Element | null {
  const { t } = useTranslation()
  const tenant = useTenantStore((s) => s.tenant)
  const update = useTenantStore((s) => s.update)
  const days = useTenantStore((s) => s.daysToExpiry())
  const active = useTenantStore((s) => s.licenseActive())
  const [draft, setDraft] = useState<Tenant | null>(tenant)
  useEffect(() => setDraft(tenant), [tenant])
  if (!draft) return null

  const onLogo = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setDraft({ ...draft, logoDataUrl: reader.result as string })
    reader.readAsDataURL(file)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{t('tenant.title')}</h2>
          <button onClick={onClose}>✕</button>
        </header>
        <div className="modal-body">
          <Field label={t('tenant.name')} value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
          <Field label={t('tenant.phone')} value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
          <Field label={t('tenant.address')} value={draft.address} onChange={(v) => setDraft({ ...draft, address: v })} />
          <Field label={t('tenant.city')} value={draft.city} onChange={(v) => setDraft({ ...draft, city: v })} />
          <div className="field">
            <span>{t('tenant.logo')}</span>
            <input type="file" accept="image/*" onChange={(e) => onLogo(e.target.files?.[0] ?? null)} />
            {draft.logoDataUrl && <img src={draft.logoDataUrl} alt="" className="logo-preview" />}
          </div>
          <div className="row-grid">
            <Field label={t('tenant.rc')} value={draft.legal?.rc ?? ''} onChange={(v) => setDraft({ ...draft, legal: { ...draft.legal, rc: v } })} />
            <Field label={t('tenant.nif')} value={draft.legal?.nif ?? ''} onChange={(v) => setDraft({ ...draft, legal: { ...draft.legal, nif: v } })} />
            <Field label={t('tenant.nis')} value={draft.legal?.nis ?? ''} onChange={(v) => setDraft({ ...draft, legal: { ...draft.legal, nis: v } })} />
            <Field label={t('tenant.ai')} value={draft.legal?.ai ?? ''} onChange={(v) => setDraft({ ...draft, legal: { ...draft.legal, ai: v } })} />
          </div>
          <div className="field">
            <span>{t('tenant.license')}</span>
            <strong className={active ? 'ok' : 'warn'}>
              {active && days !== null
                ? t('tenant.expiresIn', { days })
                : t('tenant.expired')}
            </strong>
          </div>
        </div>
        <footer className="modal-footer">
          <button className="btn-primary" onClick={async () => { await update(draft); onClose() }}>
            {t('tenant.save')}
          </button>
        </footer>
      </div>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
