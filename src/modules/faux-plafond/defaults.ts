/**
 * Algerian market baseline material catalog + ratios. Every value is
 * tenant-overridable — these are the "first-run" defaults the contractor
 * tunes once.
 *
 * Prices reflect typical Alger / Oran wholesale 2025 levels. They WILL
 * drift; treat them as anchors, not gospel.
 */

export interface MaterialDefault {
  id: string
  labelFr: string
  labelAr: string
  /** purchasable unit on the supplier invoice */
  unit: 'plaque' | 'ml' | 'sac' | 'unit' | 'rouleau' | 'paquet'
  unitPriceDZD: number
  /** physical size of one purchasable unit for rounding (in m, m², or units of 1) */
  unitSize?: number
}

export const MATERIAL_DEFAULTS = {
  plaqueBA13: {
    id: 'ba13',
    labelFr: 'Plaque BA13 (1.20 × 2.50 m)',
    labelAr: 'لوح جبس BA13 (1.20 × 2.50 م)',
    unit: 'plaque',
    unitPriceDZD: 950,
    unitSize: 3 // m² per plaque
  },
  fourrureF530: {
    id: 'f530',
    labelFr: 'Fourrure F530',
    labelAr: 'حامل F530',
    unit: 'ml',
    unitPriceDZD: 180
  },
  cornierePerimetrique: {
    id: 'corniere',
    labelFr: 'Cornière périmétrique',
    labelAr: 'زاوية محيطية',
    unit: 'ml',
    unitPriceDZD: 120
  },
  suspente: {
    id: 'suspente',
    labelFr: 'Suspente',
    labelAr: 'معلاق',
    unit: 'unit',
    unitPriceDZD: 60
  },
  visTTPC: {
    id: 'vis',
    labelFr: 'Vis TTPC 25 mm (boîte de 1000)',
    labelAr: 'براغي 25 مم (علبة 1000)',
    unit: 'paquet',
    unitPriceDZD: 1100,
    unitSize: 1000
  },
  bandeJoint: {
    id: 'bande',
    labelFr: 'Bande à joint (rouleau 75 m)',
    labelAr: 'شريط لصق (لفة 75 م)',
    unit: 'rouleau',
    unitPriceDZD: 400,
    unitSize: 75
  },
  enduitJoint: {
    id: 'enduit',
    labelFr: 'Enduit joint (sac 25 kg)',
    labelAr: 'معجون جبس (كيس 25 كغ)',
    unit: 'sac',
    unitPriceDZD: 1800,
    unitSize: 25
  },
  driverLED: {
    id: 'driver-led',
    labelFr: 'Driver LED (par 5 m)',
    labelAr: 'محول LED (لكل 5 م)',
    unit: 'unit',
    unitPriceDZD: 1600,
    unitSize: 5
  },
  driverSpot: {
    id: 'driver-spot',
    labelFr: 'Driver spot (par 6 spots)',
    labelAr: 'محول بقع (لكل 6 بقع)',
    unit: 'unit',
    unitPriceDZD: 900,
    unitSize: 6
  }
} as const satisfies Record<string, MaterialDefault>

/** Coverage ratios per m² of ceiling — tenant-overridable. */
export const RATIOS = {
  /** waste percentage on plaques and profiles */
  wastePct: 0.1,
  /** linear m of F530 fourrure per m² (≈ 60 cm spacing) */
  fourrurePerM2: 2.7,
  /** suspentes per m² (≈ 1 every 0.7 m²) */
  suspentePerM2: 1.4,
  /** screws per m² */
  visPerM2: 20,
  /** joint band linear m per m² (rule of thumb for BA13) */
  bandeJointPerM2: 2.5,
  /** enduit kg per m² */
  enduitKgPerM2: 0.8,
  /** default labor price per m² */
  laborPerM2: 1200
} as const
