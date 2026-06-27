import Dexie, { type EntityTable } from 'dexie'
import type { Design, Tenant } from '@/types'

/**
 * IndexedDB store. The product is offline-first — designs live here first
 * and sync to the server when online. A simple sync_queue holds pending ops
 * so we can apply them later without losing user work.
 */
export interface SyncQueueItem {
  id?: number
  op: 'upsert-design' | 'delete-design' | 'upsert-tenant'
  entityId: string
  payload: unknown
  createdAt: number
}

export class DecorDB extends Dexie {
  designs!: EntityTable<Design, 'id'>
  tenants!: EntityTable<Tenant, 'id'>
  syncQueue!: EntityTable<SyncQueueItem, 'id'>

  constructor() {
    super('decor-studio')
    this.version(1).stores({
      designs: 'id, tenantId, status, updatedAt',
      tenants: 'id',
      syncQueue: '++id, entityId, createdAt'
    })
  }
}

export const db = new DecorDB()

export async function saveDesign(d: Design): Promise<void> {
  await db.designs.put({ ...d, updatedAt: Date.now() })
  await db.syncQueue.add({
    op: 'upsert-design',
    entityId: d.id,
    payload: d,
    createdAt: Date.now()
  })
}

export async function listDesigns(tenantId: string): Promise<Design[]> {
  return db.designs.where('tenantId').equals(tenantId).reverse().sortBy('updatedAt')
}

export async function getDesign(id: string): Promise<Design | undefined> {
  return db.designs.get(id)
}

export async function deleteDesign(id: string): Promise<void> {
  await db.designs.delete(id)
  await db.syncQueue.add({
    op: 'delete-design',
    entityId: id,
    payload: null,
    createdAt: Date.now()
  })
}

export async function getTenant(id: string): Promise<Tenant | undefined> {
  return db.tenants.get(id)
}

export async function saveTenant(t: Tenant): Promise<void> {
  await db.tenants.put(t)
  await db.syncQueue.add({
    op: 'upsert-tenant',
    entityId: t.id,
    payload: t,
    createdAt: Date.now()
  })
}
