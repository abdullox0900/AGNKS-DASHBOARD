import { useState } from 'react'
import { MapPin, Pencil, Plus, ScanLine, Trash2 } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { Drawer } from '@/shared/ui/Drawer'
import { useToast } from '@/shared/ui/Toast'
import { useStations, useTerminals } from '@/shared/api/hooks'
import { apiCreateStation, apiCreateTerminal, apiDeleteStation, apiUpdateStation, apiUpdateTerminal } from '@/shared/api/client'
import { ApiError } from '@/shared/api/errors'
import { usePermission } from '@/shared/lib/permissions'
import type { Station, Terminal } from '@/entities/models'

export function StationsPage() {
  const { data: stations, isLoading, mutate } = useStations()
  const [selected, setSelected] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)}>
          <Plus size={15} /> Filial qo'shish
        </Button>
      </div>

      {isLoading ? (
        <p className="text-[13px] text-[var(--color-ink-tertiary)]">Yuklanmoqda…</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {stations?.map((s) => (
            <Card key={s.id} className="cursor-pointer" >
              <div onClick={() => setSelected(s.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={16} className="mt-0.5 text-[var(--color-primary)]" />
                    <div>
                      <p className="text-[14px] font-semibold text-[var(--color-ink)]">{s.name}</p>
                      <p className="text-[12.5px] text-[var(--color-ink-tertiary)]">{s.address}</p>
                    </div>
                  </div>
                  <Badge tone={s.status === 'active' ? 'success' : 'neutral'}>{s.status === 'active' ? 'Faol' : s.status}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Filial va terminallar" width={480}>
        {selected && (
          <StationDetail
            station={stations?.find((s) => s.id === selected) ?? null}
            stationId={selected}
            onUpdated={() => mutate()}
            onDeleted={() => {
              setSelected(null)
              mutate()
            }}
          />
        )}
      </Drawer>

      <Drawer open={formOpen} onClose={() => setFormOpen(false)} title="Yangi filial">
        <StationForm
          onCreated={() => {
            setFormOpen(false)
            mutate()
          }}
        />
      </Drawer>
    </div>
  )
}

function StationForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await apiCreateStation({ name, address })
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Nomi" value={name} onChange={setName} />
      <Field label="Manzil" value={address} onChange={setAddress} />
      <Button type="submit" className="w-full" loading={submitting} disabled={!name || !address}>
        Yaratish
      </Button>
    </form>
  )
}

function Field({ label, value, onChange, mono }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)] ${mono ? 'font-mono' : ''}`}
      />
    </div>
  )
}

function StationDetail({
  station,
  stationId,
  onUpdated,
  onDeleted,
}: {
  station: Station | null
  stationId: string
  onUpdated: () => void
  onDeleted: () => void
}) {
  const canEdit = usePermission('stations.delete')
  const { data: terminals, mutate } = useTerminals(stationId)
  const { show } = useToast()
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null)

  async function handleAddTerminal(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await apiCreateTerminal(stationId, { code, label })
      setCode('')
      setLabel('')
      mutate()
      onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik')
    }
  }

  async function handleScan() {
    // Uses the browser's native BarcodeDetector where available (most Android/desktop
    // Chrome); on unsupported browsers (notably iOS Safari) we fall back to manual entry.
    const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (v: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector
    if (!BarcodeDetectorCtor) {
      show("Bu qurilmada QR skaneri qo'llab-quvvatlanmaydi — kodni qo'lda kiriting", 'warning')
      return
    }
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] })

      const deadline = Date.now() + 15000
      while (Date.now() < deadline) {
        const codes = await detector.detect(video)
        if (codes.length > 0) {
          const url = new URL(codes[0].rawValue)
          const t = url.searchParams.get('t')
          if (t) setCode(t)
          break
        }
        await new Promise((r) => setTimeout(r, 300))
      }
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      show("Kameraga ruxsat berilmadi", 'warning')
    } finally {
      setScanning(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await apiDeleteStation(stationId)
      onDeleted()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "O'chirib bo'lmadi")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      {canEdit && station && (
        <EditStationForm station={station} onUpdated={onUpdated} />
      )}

      <div>
        <p className="mb-2 text-[13px] font-semibold text-[var(--color-ink)]">Terminallar</p>
        <p className="mb-2 text-[11.5px] text-[var(--color-ink-tertiary)]">
          Kod — chekdagi "FM ID" (yoki QR'dagi t=... qiymati). Aynan shu kod orqali chek shu filialga tegishli deb aniqlanadi.
        </p>
        <div className="space-y-1.5">
          {terminals?.map((t) =>
            editingTerminal?.id === t.id ? (
              <EditTerminalForm
                key={t.id}
                terminal={t}
                onSaved={() => {
                  setEditingTerminal(null)
                  mutate()
                }}
                onCancel={() => setEditingTerminal(null)}
              />
            ) : (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2">
                <div>
                  <p className="text-[13px] text-[var(--color-ink)]">{t.label}</p>
                  <p className="font-mono text-[11px] text-[var(--color-ink-tertiary)]">{t.code}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={t.active ? 'success' : 'neutral'}>{t.active ? 'Faol' : 'Faol emas'}</Badge>
                  {canEdit && (
                    <button onClick={() => setEditingTerminal(t)} className="text-[var(--color-ink-tertiary)]">
                      <Pencil size={13} />
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      await apiUpdateTerminal(t.id, { active: !t.active })
                      mutate()
                    }}
                    className="text-[12px] font-medium text-[var(--color-primary)]"
                  >
                    {t.active ? "O'chirish" : 'Yoqish'}
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      <form onSubmit={handleAddTerminal} className="space-y-2 border-t border-[var(--color-border)] pt-4">
        <p className="text-[13px] font-semibold text-[var(--color-ink)]">Yangi terminal</p>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Terminal kodi (FM ID)" className="h-10 flex-1 rounded-lg border border-[var(--color-border)] px-3 text-[13px] font-mono outline-none focus:border-[var(--color-primary)]" />
          <Button type="button" variant="ghost" onClick={handleScan} loading={scanning}>
            <ScanLine size={15} />
          </Button>
        </div>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nomi (masalan: Kassa 1)" className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]" />
        {error && <p className="text-[12px] font-medium text-[var(--color-danger)]">{error}</p>}
        <Button type="submit" className="w-full" disabled={!code || !label}>
          Qo'shish
        </Button>
      </form>

      {canEdit && (
        <div className="border-t border-[var(--color-border)] pt-4">
          {deleteError && <p className="mb-2 text-[12px] font-medium text-[var(--color-danger)]">{deleteError}</p>}
          <Button variant="danger" className="w-full" loading={deleting} onClick={handleDelete}>
            <Trash2 size={15} /> Filialni butunlay o'chirish
          </Button>
        </div>
      )}
    </div>
  )
}

function EditTerminalForm({ terminal, onSaved, onCancel }: { terminal: Terminal; onSaved: () => void; onCancel: () => void }) {
  const [code, setCode] = useState(terminal.code)
  const [label, setLabel] = useState(terminal.label)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSave() {
    setSubmitting(true)
    setError(null)
    try {
      await apiUpdateTerminal(terminal.id, { code, label })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-[var(--color-primary)] px-3 py-2.5">
      <Field label="Kod (FM ID)" value={code} onChange={setCode} mono />
      <Field label="Nomi" value={label} onChange={setLabel} />
      {error && <p className="text-[11px] font-medium text-[var(--color-danger)]">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" className="flex-1" onClick={onCancel}>
          Bekor qilish
        </Button>
        <Button size="sm" className="flex-1" loading={submitting} disabled={!code || !label} onClick={handleSave}>
          Saqlash
        </Button>
      </div>
    </div>
  )
}

function EditStationForm({ station, onUpdated }: { station: Station; onUpdated: () => void }) {
  const [name, setName] = useState(station.name)
  const [address, setAddress] = useState(station.address)
  const [submitting, setSubmitting] = useState(false)

  async function handleSave() {
    setSubmitting(true)
    try {
      await apiUpdateStation(station.id, { name, address })
      onUpdated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-2 border-b border-[var(--color-border)] pb-4">
      <p className="text-[13px] font-semibold text-[var(--color-ink)]">Filialni tahrirlash</p>
      <Field label="Nomi" value={name} onChange={setName} />
      <Field label="Manzil" value={address} onChange={setAddress} />
      <Button size="sm" className="w-full" loading={submitting} onClick={handleSave} disabled={!name || !address}>
        Saqlash
      </Button>
    </div>
  )
}
