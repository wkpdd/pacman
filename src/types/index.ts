export type Unit = 'ml' | 'unit' | 'm2'
export type Lang = 'fr' | 'ar' | 'en'
export type PaymentMode = 'cash' | 'bank' | 'cheque'
export type DesignStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'invoiced'

export interface Point { x: number; y: number }

/** A room polygon (rectangular MVP — corners[0..3], clockwise from top-left). */
export interface Room {
  /** room width in cm */
  width: number
  /** room length in cm */
  length: number
  /** ceiling height in cm — needed for retombée drop volumetry and lighting */
  height: number
}

export type ObjectKind =
  | 'corniche'
  | 'rosace'
  | 'spotlight'
  | 'spotlight-grid'
  | 'led-strip'
  | 'retombee'
  | 'multi-level'

/** A placed object on the canvas. All coordinates in cm, origin = room top-left. */
export interface PlacedObject {
  id: string
  kind: ObjectKind
  /** library module id this object instantiates */
  moduleId: string
  /** position in cm */
  x: number
  y: number
  /** size in cm — interpretation depends on kind */
  width: number
  height: number
  rotation: number
  locked?: boolean
  /** kind-specific extras */
  data?: {
    /** for spotlight-grid */
    rows?: number
    cols?: number
    /** for led-strip — polyline points in cm relative to (x,y) */
    points?: Point[]
    /** for corniche — perimeter sides it follows ('all' or specific edges) */
    sides?: Array<'top' | 'right' | 'bottom' | 'left'>
    /** for retombée — drop in cm */
    drop?: number
  }
}

export interface ClientInfo {
  name: string
  phone?: string
  address?: string
  city?: string
}

export interface Totals {
  materialsHT: number
  laborHT: number
  subtotalHT: number
  tva: number
  timbre: number
  totalTTC: number
  marginPct: number
}

export interface Design {
  id: string
  tenantId: string
  name: string
  status: DesignStatus
  client: ClientInfo
  room: Room
  objects: PlacedObject[]
  /** per-design overrides for ratios and labor */
  options: {
    wastePct: number
    laborPerM2: number
    flatLabor?: number
    paymentMode: PaymentMode
  }
  totals?: Totals
  createdAt: number
  updatedAt: number
  syncedAt?: number
}

export interface Tenant {
  id: string
  name: string
  logoDataUrl?: string
  phone: string
  address: string
  city: string
  /** RC / NIF / NIS / AI on the PDF footer */
  legal?: { rc?: string; nif?: string; nis?: string; ai?: string }
  lang: Lang
  /** ISO currency, always DZD here but kept for future */
  currency: 'DZD'
  /** licence expiry epoch ms — gating that degrades offline */
  licenseExpiry?: number
  tier: 'free' | 'solo' | 'pro' | 'team'
}
