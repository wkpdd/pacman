import type { ObjectKind, Unit } from '@/types'

export interface LibraryModule {
  id: string
  kind: ObjectKind
  /** displayed in tray; resolved via i18n if a key exists, falls back to fr */
  labelFr: string
  labelAr: string
  /** SVG markup string — rendered crisp at any zoom */
  iconSvg: string
  unit: Unit
  /** default tenant-overridable selling price in DZD */
  defaultPriceDZD: number
  /** factory cost basis for margin reporting (private) */
  defaultCostDZD: number
  /** default footprint in cm when dropped on canvas */
  defaultWidthCm: number
  defaultHeightCm: number
  /** description shown in properties panel */
  noteFr?: string
}

const svg = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${inner}</svg>`

/**
 * Library is intentionally compact in v1 — every entry covers a real install
 * pattern an Algerian plâtrier offers. Add SKUs later via tenant_pricing.
 */
export const FAUX_PLAFOND_LIBRARY: LibraryModule[] = [
  {
    id: 'corniche-classic-8',
    kind: 'corniche',
    labelFr: 'Corniche classique 8 cm',
    labelAr: 'كرنيش كلاسيكي 8 سم',
    unit: 'ml',
    defaultPriceDZD: 1200,
    defaultCostDZD: 650,
    defaultWidthCm: 200,
    defaultHeightCm: 8,
    iconSvg: svg(
      '<rect x="4" y="20" width="40" height="8" fill="#e2e8f0" stroke="#0f172a" stroke-width="1.5"/><path d="M4 20 L8 16 L40 16 L44 20" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.5"/>'
    ),
    noteFr: 'Périmètre plafond. Vendue au mètre linéaire.'
  },
  {
    id: 'corniche-led-12',
    kind: 'corniche',
    labelFr: 'Corniche LED 12 cm',
    labelAr: 'كرنيش LED 12 سم',
    unit: 'ml',
    defaultPriceDZD: 2200,
    defaultCostDZD: 1100,
    defaultWidthCm: 200,
    defaultHeightCm: 12,
    iconSvg: svg(
      '<rect x="4" y="18" width="40" height="12" fill="#e2e8f0" stroke="#0f172a" stroke-width="1.5"/><rect x="6" y="26" width="36" height="2" fill="#f59e0b"/>'
    ),
    noteFr: 'Corniche à gorge avec LED intégrée.'
  },
  {
    id: 'rosace-d60',
    kind: 'rosace',
    labelFr: 'Rosace plâtre Ø60',
    labelAr: 'وردة جبس Ø60',
    unit: 'unit',
    defaultPriceDZD: 4500,
    defaultCostDZD: 2200,
    defaultWidthCm: 60,
    defaultHeightCm: 60,
    iconSvg: svg(
      '<circle cx="24" cy="24" r="18" fill="#fef3c7" stroke="#0f172a" stroke-width="1.5"/><circle cx="24" cy="24" r="10" fill="none" stroke="#0f172a" stroke-width="1"/><circle cx="24" cy="24" r="3" fill="#0f172a"/>'
    )
  },
  {
    id: 'rosace-d90',
    kind: 'rosace',
    labelFr: 'Rosace plâtre Ø90',
    labelAr: 'وردة جبس Ø90',
    unit: 'unit',
    defaultPriceDZD: 8500,
    defaultCostDZD: 4000,
    defaultWidthCm: 90,
    defaultHeightCm: 90,
    iconSvg: svg(
      '<circle cx="24" cy="24" r="20" fill="#fde68a" stroke="#0f172a" stroke-width="1.5"/><circle cx="24" cy="24" r="12" fill="none" stroke="#0f172a" stroke-width="1"/><circle cx="24" cy="24" r="4" fill="#0f172a"/>'
    )
  },
  {
    id: 'spot-led-7w',
    kind: 'spotlight',
    labelFr: 'Spot LED encastré 7 W',
    labelAr: 'بقعة LED مدمجة 7 واط',
    unit: 'unit',
    defaultPriceDZD: 600,
    defaultCostDZD: 250,
    defaultWidthCm: 9,
    defaultHeightCm: 9,
    iconSvg: svg(
      '<circle cx="24" cy="24" r="10" fill="#fffbeb" stroke="#0f172a" stroke-width="1.5"/><circle cx="24" cy="24" r="5" fill="#f59e0b"/>'
    )
  },
  {
    id: 'spot-grid',
    kind: 'spotlight-grid',
    labelFr: 'Grille de spots',
    labelAr: 'شبكة بقع',
    unit: 'unit',
    defaultPriceDZD: 600,
    defaultCostDZD: 250,
    defaultWidthCm: 240,
    defaultHeightCm: 180,
    iconSvg: svg(
      '<rect x="4" y="4" width="40" height="40" fill="none" stroke="#0f172a" stroke-width="1" stroke-dasharray="2 2"/><circle cx="14" cy="14" r="3" fill="#f59e0b"/><circle cx="24" cy="14" r="3" fill="#f59e0b"/><circle cx="34" cy="14" r="3" fill="#f59e0b"/><circle cx="14" cy="24" r="3" fill="#f59e0b"/><circle cx="24" cy="24" r="3" fill="#f59e0b"/><circle cx="34" cy="24" r="3" fill="#f59e0b"/><circle cx="14" cy="34" r="3" fill="#f59e0b"/><circle cx="24" cy="34" r="3" fill="#f59e0b"/><circle cx="34" cy="34" r="3" fill="#f59e0b"/>'
    ),
    noteFr: 'Auto-réparti. Configurer lignes × colonnes dans les propriétés.'
  },
  {
    id: 'led-strip-warm',
    kind: 'led-strip',
    labelFr: 'Bande LED blanc chaud',
    labelAr: 'شريط LED أبيض دافئ',
    unit: 'ml',
    defaultPriceDZD: 800,
    defaultCostDZD: 350,
    defaultWidthCm: 200,
    defaultHeightCm: 1,
    iconSvg: svg(
      '<path d="M4 24 Q14 8 24 24 T44 24" fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>'
    ),
    noteFr: 'Longueur calculée depuis le tracé.'
  },
  {
    id: 'retombee-rect',
    kind: 'retombee',
    labelFr: 'Retombée rectangulaire',
    labelAr: 'إسقاط مستطيل',
    unit: 'm2',
    defaultPriceDZD: 3500,
    defaultCostDZD: 1800,
    defaultWidthCm: 200,
    defaultHeightCm: 200,
    iconSvg: svg(
      '<rect x="6" y="6" width="36" height="36" fill="none" stroke="#0f172a" stroke-width="1.5" stroke-dasharray="3 2"/><rect x="14" y="14" width="20" height="20" fill="#e2e8f0" stroke="#0f172a" stroke-width="1.5"/>'
    ),
    noteFr: 'Zone retombée. Hauteur configurable dans les propriétés.'
  },
  {
    id: 'multi-level-cloud',
    kind: 'multi-level',
    labelFr: 'Forme multi-niveaux nuage',
    labelAr: 'شكل سحابة متعدد المستويات',
    unit: 'm2',
    defaultPriceDZD: 4500,
    defaultCostDZD: 2300,
    defaultWidthCm: 240,
    defaultHeightCm: 160,
    iconSvg: svg(
      '<path d="M10 28 Q10 18 20 18 Q24 10 32 14 Q42 12 42 24 Q44 32 34 32 L14 32 Q6 32 10 28" fill="#e2e8f0" stroke="#0f172a" stroke-width="1.5"/>'
    )
  }
]

export function findModule(id: string): LibraryModule | undefined {
  return FAUX_PLAFOND_LIBRARY.find((m) => m.id === id)
}

export const LIBRARY_CATEGORIES: Array<{ kind: ObjectKind; labelFr: string; labelAr: string }> = [
  { kind: 'corniche', labelFr: 'Corniches', labelAr: 'كرنيش' },
  { kind: 'rosace', labelFr: 'Rosaces', labelAr: 'ورود' },
  { kind: 'spotlight', labelFr: 'Spots', labelAr: 'بقع' },
  { kind: 'spotlight-grid', labelFr: 'Grilles', labelAr: 'شبكات' },
  { kind: 'led-strip', labelFr: 'LED', labelAr: 'LED' },
  { kind: 'retombee', labelFr: 'Retombées', labelAr: 'إسقاطات' },
  { kind: 'multi-level', labelFr: 'Multi-niveaux', labelAr: 'متعدد المستويات' }
]
