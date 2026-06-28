import type { ObjectKind } from '@/types'

export type ViewMode = 'designer' | 'client' | 'placo' | 'deco' | '3d'

export interface ViewSpec {
  /** URL slug & query value */
  slug: ViewMode
  labelFr: string
  labelAr: string
  /** which audience this view serves */
  audience: 'designer' | 'client' | 'worker-placo' | 'worker-deco'
  /** object kinds visible in this view (undefined = all) */
  visibleKinds?: ObjectKind[]
  /** show the BA13 plaque layout overlay */
  showPlaqueLayout: boolean
  /** show the F530 + suspentes support skeleton */
  showSupportGrid: boolean
  /** show the cm grid */
  showGrid: boolean
  /** show dimension arrows */
  showDimensions: boolean
  /** allow the user to edit (false = read-only window) */
  editable: boolean
  /** icon emoji for the toolbar */
  icon: string
}

export const VIEW_SPECS: Record<ViewMode, ViewSpec> = {
  designer: {
    slug: 'designer',
    labelFr: 'Designer',
    labelAr: 'مصمم',
    audience: 'designer',
    showPlaqueLayout: false,
    showSupportGrid: false,
    showGrid: true,
    showDimensions: true,
    editable: true,
    icon: '✎'
  },
  client: {
    slug: 'client',
    labelFr: 'Vue client',
    labelAr: 'عرض الزبون',
    audience: 'client',
    visibleKinds: ['corniche', 'rosace', 'spotlight', 'spotlight-grid', 'led-strip', 'retombee', 'multi-level'],
    showPlaqueLayout: false,
    showSupportGrid: false,
    showGrid: false,
    showDimensions: false,
    editable: false,
    icon: '🎨'
  },
  placo: {
    slug: 'placo',
    labelFr: 'Plan placo',
    labelAr: 'مخطط الجبس',
    audience: 'worker-placo',
    visibleKinds: ['obstacle', 'cloison', 'retombee'],
    showPlaqueLayout: true,
    showSupportGrid: true,
    showGrid: true,
    showDimensions: true,
    editable: false,
    icon: '🔨'
  },
  deco: {
    slug: 'deco',
    labelFr: 'Plan déco',
    labelAr: 'مخطط الديكور',
    audience: 'worker-deco',
    visibleKinds: ['corniche', 'rosace', 'spotlight', 'spotlight-grid', 'led-strip', 'multi-level'],
    showPlaqueLayout: false,
    showSupportGrid: false,
    showGrid: true,
    showDimensions: true,
    editable: false,
    icon: '💡'
  },
  '3d': {
    slug: '3d',
    labelFr: 'Vue 3D',
    labelAr: 'منظر ثلاثي الأبعاد',
    audience: 'client',
    showPlaqueLayout: false,
    showSupportGrid: false,
    showGrid: false,
    showDimensions: false,
    editable: false,
    icon: '⬢'
  }
}

/** Read the view from `?view=...`; defaults to designer. */
export function readView(): ViewMode {
  if (typeof window === 'undefined') return 'designer'
  const param = new URLSearchParams(window.location.search).get('view') as ViewMode | null
  return param && param in VIEW_SPECS ? param : 'designer'
}

/** Build a URL pointing at a specific view, preserving path. */
export function viewUrl(mode: ViewMode): string {
  if (typeof window === 'undefined') return `?view=${mode}`
  const u = new URL(window.location.href)
  if (mode === 'designer') u.searchParams.delete('view')
  else u.searchParams.set('view', mode)
  return u.toString()
}
