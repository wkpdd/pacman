import { create } from 'zustand'
import type { Lang, Tenant } from '@/types'
import { getTenant, saveTenant } from './db'
import { newId } from '@/utils/id'

const TENANT_KEY = 'decor:active-tenant'

interface TenantState {
  tenant: Tenant | null
  loading: boolean
  load: () => Promise<void>
  update: (patch: Partial<Tenant>) => Promise<void>
  setLang: (lang: Lang) => Promise<void>
  licenseActive: () => boolean
  /** number of days until expiry, negative if expired */
  daysToExpiry: () => number | null
}

function defaultTenant(): Tenant {
  return {
    id: newId(),
    name: 'Mon Atelier',
    phone: '',
    address: '',
    city: 'Alger',
    lang: 'fr',
    currency: 'DZD',
    tier: 'solo',
    // 30-day grace on first install — owner replaces with real key
    licenseExpiry: Date.now() + 30 * 24 * 3600 * 1000
  }
}

export const useTenantStore = create<TenantState>((set, get) => ({
  tenant: null,
  loading: true,
  load: async () => {
    let id = localStorage.getItem(TENANT_KEY)
    let tenant: Tenant | undefined
    if (id) tenant = await getTenant(id)
    if (!tenant) {
      tenant = defaultTenant()
      await saveTenant(tenant)
      localStorage.setItem(TENANT_KEY, tenant.id)
      id = tenant.id
    }
    set({ tenant, loading: false })
  },
  update: async (patch) => {
    const cur = get().tenant
    if (!cur) return
    const next: Tenant = { ...cur, ...patch }
    await saveTenant(next)
    set({ tenant: next })
  },
  setLang: async (lang) => {
    await get().update({ lang })
  },
  licenseActive: () => {
    const t = get().tenant
    if (!t?.licenseExpiry) return true // no expiry set → unrestricted
    // 7-day offline grace — never lock out an active job because of signal
    return t.licenseExpiry + 7 * 24 * 3600 * 1000 > Date.now()
  },
  daysToExpiry: () => {
    const t = get().tenant
    if (!t?.licenseExpiry) return null
    return Math.floor((t.licenseExpiry - Date.now()) / (24 * 3600 * 1000))
  }
}))
