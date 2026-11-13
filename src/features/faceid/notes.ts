import { create } from 'zustand'

export interface NoteValue {
  note: string
  reason: string | null
}
interface NoteState {
  /** key: `${employeeId}|${date}` */
  notes: Record<string, NoteValue>
  set: (key: string, value: NoteValue) => void
  seed: (map: Record<string, { reason: string | null; note: string | null }>) => void
}

/** Managers' notes on late / absent days. Live: mirrors the server; sample: lives in memory only. */
export const useNotes = create<NoteState>((set) => ({
  notes: {},
  set: (key, value) => set((s) => ({ notes: { ...s.notes, [key]: value } })),
  seed: (map) =>
    set((s) => {
      const next = { ...s.notes }
      let changed = false
      for (const [k, v] of Object.entries(map)) {
        const cur = next[k]
        if (!cur || cur.note !== (v.note ?? '') || cur.reason !== v.reason) {
          next[k] = { note: v.note ?? '', reason: v.reason }
          changed = true
        }
      }
      return changed ? { notes: next } : s
    }),
}))
