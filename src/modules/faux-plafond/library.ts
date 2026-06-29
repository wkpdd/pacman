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
    labelFr: 'Bande LED blanc chaud (3000 K)',
    labelAr: 'شريط LED أبيض دافئ',
    unit: 'ml',
    defaultPriceDZD: 800,
    defaultCostDZD: 350,
    defaultWidthCm: 200,
    defaultHeightCm: 1,
    iconSvg: svg(
      '<path d="M4 24 Q14 8 24 24 T44 24" fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>'
    ),
    noteFr: 'Blanc chaud 3000 K. 60 LED/m, 9.6 W/m.'
  },
  {
    id: 'led-strip-cool',
    kind: 'led-strip',
    labelFr: 'Bande LED blanc froid (6000 K)',
    labelAr: 'شريط LED أبيض بارد',
    unit: 'ml',
    defaultPriceDZD: 850,
    defaultCostDZD: 380,
    defaultWidthCm: 200,
    defaultHeightCm: 1,
    iconSvg: svg(
      '<path d="M4 24 Q14 8 24 24 T44 24" fill="none" stroke="#60a5fa" stroke-width="3" stroke-linecap="round"/>'
    ),
    noteFr: 'Blanc froid 6000 K. Idéal cuisine / salle de bain.'
  },
  {
    id: 'led-strip-rgb',
    kind: 'led-strip',
    labelFr: 'Bande LED RGB',
    labelAr: 'شريط LED RGB',
    unit: 'ml',
    defaultPriceDZD: 1400,
    defaultCostDZD: 650,
    defaultWidthCm: 200,
    defaultHeightCm: 1,
    iconSvg: svg(
      '<defs><linearGradient id="rgb" x1="0" y1="0" x2="48" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ef4444"/><stop offset="0.5" stop-color="#22c55e"/><stop offset="1" stop-color="#3b82f6"/></linearGradient></defs><path d="M4 24 Q14 8 24 24 T44 24" fill="none" stroke="url(#rgb)" stroke-width="3" stroke-linecap="round"/>'
    ),
    noteFr: 'Couleur changeante. Contrôleur RGB inclus.'
  },
  {
    id: 'lamp-pendant',
    kind: 'lamp',
    labelFr: 'Suspension pendante',
    labelAr: 'مصباح معلق',
    unit: 'unit',
    defaultPriceDZD: 6500,
    defaultCostDZD: 3000,
    defaultWidthCm: 35,
    defaultHeightCm: 35,
    iconSvg: svg(
      '<line x1="24" y1="4" x2="24" y2="20" stroke="#0f172a" stroke-width="1.5"/><path d="M14 20 L34 20 L30 36 L18 36 Z" fill="#fde68a" stroke="#0f172a" stroke-width="1.5"/><circle cx="24" cy="38" r="2" fill="#f59e0b"/>'
    ),
    noteFr: 'Suspension 80 cm, 1 ampoule E27 60 W.'
  },
  {
    id: 'lamp-chandelier',
    kind: 'lamp',
    labelFr: 'Lustre chandelier',
    labelAr: 'ثريا',
    unit: 'unit',
    defaultPriceDZD: 18000,
    defaultCostDZD: 9000,
    defaultWidthCm: 80,
    defaultHeightCm: 80,
    iconSvg: svg(
      '<line x1="24" y1="4" x2="24" y2="14" stroke="#0f172a" stroke-width="1.5"/><circle cx="24" cy="22" r="6" fill="#fef3c7" stroke="#a16207" stroke-width="1.2"/><line x1="10" y1="28" x2="38" y2="28" stroke="#0f172a" stroke-width="1.5"/><circle cx="10" cy="32" r="3" fill="#fde68a"/><circle cx="24" cy="32" r="3" fill="#fde68a"/><circle cx="38" cy="32" r="3" fill="#fde68a"/>'
    ),
    noteFr: 'Lustre 5 bras, 5 × E14 40 W.'
  },
  {
    id: 'lamp-plafonnier',
    kind: 'lamp',
    labelFr: 'Plafonnier LED',
    labelAr: 'إضاءة سقفية LED',
    unit: 'unit',
    defaultPriceDZD: 3500,
    defaultCostDZD: 1600,
    defaultWidthCm: 40,
    defaultHeightCm: 40,
    iconSvg: svg(
      '<circle cx="24" cy="24" r="18" fill="#fffbeb" stroke="#0f172a" stroke-width="1.5"/><circle cx="24" cy="24" r="12" fill="#fde68a"/><circle cx="24" cy="24" r="6" fill="#fef3c7"/>'
    ),
    noteFr: 'Plafonnier circulaire 36 W LED intégré.'
  },
  {
    id: 'lamp-sconce',
    kind: 'lamp',
    labelFr: 'Applique murale',
    labelAr: 'مصباح حائط',
    unit: 'unit',
    defaultPriceDZD: 2800,
    defaultCostDZD: 1200,
    defaultWidthCm: 20,
    defaultHeightCm: 20,
    iconSvg: svg(
      '<rect x="6" y="20" width="6" height="14" fill="#0f172a"/><path d="M12 22 L40 16 L40 38 L12 32 Z" fill="#fde68a" stroke="#0f172a" stroke-width="1.5"/>'
    ),
    noteFr: 'Applique murale, 1 × E27 40 W.'
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
  },
  {
    id: 'obstacle-cheminee',
    kind: 'obstacle',
    labelFr: 'Cheminée / poteau',
    labelAr: 'مدخنة / عمود',
    unit: 'm2',
    // Obstacles subtract from billable area, but the cutout edge needs extra
    // perimeter rail. Price is for the cutout + finishing.
    defaultPriceDZD: 1500,
    defaultCostDZD: 600,
    defaultWidthCm: 60,
    defaultHeightCm: 60,
    iconSvg: svg(
      '<rect x="14" y="14" width="20" height="20" fill="#0f172a" stroke="#0f172a"/><line x1="14" y1="14" x2="34" y2="34" stroke="#f59e0b" stroke-width="2"/><line x1="34" y1="14" x2="14" y2="34" stroke="#f59e0b" stroke-width="2"/>'
    ),
    noteFr: 'Zone à découper dans le plafond. Soustraite du m² facturé.'
  },
  {
    id: 'obstacle-opening',
    kind: 'obstacle',
    labelFr: 'Trappe / spot encastré',
    labelAr: 'فتحة / بقعة مدمجة',
    unit: 'unit',
    defaultPriceDZD: 800,
    defaultCostDZD: 300,
    defaultWidthCm: 50,
    defaultHeightCm: 50,
    iconSvg: svg(
      '<rect x="14" y="14" width="20" height="20" fill="none" stroke="#0f172a" stroke-width="1.5" stroke-dasharray="3 2"/><circle cx="24" cy="24" r="4" fill="#0f172a"/>'
    )
  },
  {
    id: 'cloison-standard',
    kind: 'cloison',
    labelFr: 'Cloison BA13 (72 mm)',
    labelAr: 'حاجز BA13 (72 مم)',
    unit: 'm2',
    // Per m² of wall surface — includes rail+stud profiles + plaques both sides
    defaultPriceDZD: 3200,
    defaultCostDZD: 1600,
    defaultWidthCm: 300,
    defaultHeightCm: 7,
    iconSvg: svg(
      '<rect x="6" y="20" width="36" height="8" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.5"/><line x1="12" y1="20" x2="12" y2="28" stroke="#94a3b8"/><line x1="20" y1="20" x2="20" y2="28" stroke="#94a3b8"/><line x1="28" y1="20" x2="28" y2="28" stroke="#94a3b8"/><line x1="36" y1="20" x2="36" y2="28" stroke="#94a3b8"/>'
    ),
    noteFr: 'Cloison de séparation. Plaques des deux côtés + montants 48.'
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
  { kind: 'multi-level', labelFr: 'Multi-niveaux', labelAr: 'متعدد المستويات' },
  { kind: 'obstacle', labelFr: 'Obstacles', labelAr: 'عوائق' },
  { kind: 'cloison', labelFr: 'Cloisons', labelAr: 'حواجز' },
  { kind: 'lamp', labelFr: 'Lampes', labelAr: 'مصابيح' }
]

/** Color swatches for canvas + layer panel kind stripe. */
export const KIND_COLOR: Record<ObjectKind, string> = {
  corniche: '#cbd5e1',
  rosace: '#a16207',
  spotlight: '#f59e0b',
  'spotlight-grid': '#f59e0b',
  'led-strip': '#fbbf24',
  retombee: '#94a3b8',
  'multi-level': '#94a3b8',
  obstacle: '#0f172a',
  cloison: '#475569',
  lamp: '#a855f7'
}

/** Default LED metadata for a given color. */
export const LED_COLOR_INFO: Record<import('@/types').LedColor, { hex: string; emissive: string; labelFr: string; pricePerM: number }> = {
  warm:    { hex: '#fbbf24', emissive: '#f59e0b', labelFr: 'Blanc chaud 3000 K',  pricePerM: 800 },
  neutral: { hex: '#fef3c7', emissive: '#fde68a', labelFr: 'Blanc neutre 4000 K', pricePerM: 820 },
  cool:    { hex: '#bfdbfe', emissive: '#60a5fa', labelFr: 'Blanc froid 6000 K',  pricePerM: 850 },
  rgb:     { hex: '#ec4899', emissive: '#ec4899', labelFr: 'RGB',                 pricePerM: 1400 },
  rgbw:    { hex: '#f472b6', emissive: '#f472b6', labelFr: 'RGBW',                pricePerM: 1700 }
}

/** Per-type unit-price multipliers for BA13 plaques. Tenants can override. */
export const PLAQUE_TYPE: Record<import('@/types').PlaqueType, { labelFr: string; labelAr: string; priceMultiplier: number; color: string }> = {
  standard:  { labelFr: 'BA13 standard',  labelAr: 'BA13 عادي',   priceMultiplier: 1.0, color: '#e2e8f0' },
  hydrofuge: { labelFr: 'BA13 hydrofuge', labelAr: 'BA13 مقاوم للماء', priceMultiplier: 1.45, color: '#a7f3d0' },
  ignifuge:  { labelFr: 'BA13 ignifuge',  labelAr: 'BA13 مقاوم للحريق', priceMultiplier: 1.65, color: '#fecaca' },
  phonique:  { labelFr: 'BA13 phonique',  labelAr: 'BA13 عازل صوت',    priceMultiplier: 1.55, color: '#bae6fd' }
}
