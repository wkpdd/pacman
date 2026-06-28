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
  | 'obstacle'
  | 'cloison'

/** BA13 plaque variants — different per-m² prices and use cases. */
export type PlaqueType = 'standard' | 'hydrofuge' | 'ignifuge' | 'phonique'

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
    /** for led-strip — render as a smooth curve through the points */
    curved?: boolean
    /** for corniche — perimeter mode: follows the room edges flagged in `sides` */
    perimeter?: boolean
    sides?: Array<'top' | 'right' | 'bottom' | 'left'>
    /** for retombée — drop in cm */
    drop?: number
    /** for obstacles — text label (e.g. "cheminée", "poutre") */
    label?: string
    /** for cloison — wall thickness in cm */
    thickness?: number
    /** for cloison — height in cm (full wall by default = room height) */
    wallHeight?: number
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
    /** plaque type — affects unit price + label on worker plan */
    plaqueType?: PlaqueType
    /** double layer ceiling (BA13 + BA13 = BA25). Doubles plaques + screws +
     *  joint band. Profiles unchanged. */
    doubleLayer?: boolean
  }
  totals?: Totals
  /** assigned when the design is converted to a facture */
  invoiceNumber?: string
  invoicedAt?: number
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
  licenseKey?: string
  tier: 'free' | 'solo' | 'pro' | 'team'
  /** outdoor / direct-sunlight readability mode */
  highContrast?: boolean
}
