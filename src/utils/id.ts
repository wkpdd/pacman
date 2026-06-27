import { ulid } from 'ulid'

/** Stable, time-sortable IDs for every entity. */
export function newId(): string {
  return ulid()
}
