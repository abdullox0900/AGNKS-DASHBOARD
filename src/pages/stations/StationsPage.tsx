import { useState } from 'react'
import { ExternalLink, MapPin, Pencil, Plus, ScanLine, Trash2 } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { Drawer } from '@/shared/ui/Drawer'
import { useToast } from '@/shared/ui/Toast'
import { useStations, useTerminals } from '@/shared/api/hooks'
import { apiCreateStation, apiCreateTerminal, apiDeleteStation, apiDeleteTerminal, apiUpdateStation, apiUpdateTerminal } from '@/shared/api/client'
import { ApiError } from '@/shared/api/errors'
import { usePermission } from '@/shared/lib/permissions'
import type { Station, Terminal } from '@/entities/models'
import { useI18n } from '@/app/providers/I18nProvider'
import { apiErrorMessage } from '@/shared/api/errors'
import { hasCoords, mapUrl, parseCoord, splitPastedPair } from '@/shared/lib/coords'

export function StationsPage() {
  const { t } = useI18n()
  const canEditCoords = usePermission('stations.delete')
  const canManage = usePermission('stations.manage')
  const { data: stations, isLoading, mutate } = useStations()
  const [selected, setSelected] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setFormOpen(true)}>
            <Plus size={15} /> {t('stations.add')}
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-[13px] text-[var(--color-ink-tertiary)]">{t('common.loading')}</p>
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
                      {hasCoords(s) ? (
                        <p className="mt-1 font-mono text-[11.5px] text-[var(--color-ink-tertiary)]">
                          {s.lat}, {s.lng}
                        </p>
                      ) : (
                        canEditCoords && <p className="mt-1 text-[11.5px] text-[var(--color-amber)]">{t('stations.coords_not_set')}</p>
                      )}
                    </div>
                  </div>
                  <Badge tone={s.status === 'active' ? 'success' : 'neutral'}>{s.status === 'active' ? t('common.active') : t(s.status === 'paused' ? 'stations.status.paused' : 'stations.status.closed')}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={t('stations.detail_title')} width={480}>
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

      <Drawer open={formOpen} onClose={() => setFormOpen(false)} title={t('stations.new_title')}>
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
  const { t } = useI18n()
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
      <Field label={t('stations.f_name')} value={name} onChange={setName} />
      <Field label={t('stations.f_address')} value={address} onChange={setAddress} />
      <Button type="submit" className="w-full" loading={submitting} disabled={!name || !address}>
        {t('common.create')}
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
  const { t } = useI18n()
  const canEdit = usePermission('stations.delete')
  const canManage = usePermission('stations.manage')
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
      setError(err instanceof ApiError ? apiErrorMessage(err) : t('common.error_generic'))
    }
  }

  async function handleScan() {
    // Uses the browser's native BarcodeDetector where available (most Android/desktop
    // Chrome); on unsupported browsers (notably iOS Safari) we fall back to manual entry.
    const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (v: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector
    if (!BarcodeDetectorCtor) {
      show(t('stations.qr_unsupported'), 'warning')
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
          const fmId = url.searchParams.get('t')
          if (fmId) setCode(fmId)
          break
        }
        await new Promise((r) => setTimeout(r, 300))
      }
      stream.getTracks().forEach((track) => track.stop())
    } catch {
      show(t('stations.camera_denied'), 'warning')
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
      setDeleteError(err instanceof ApiError ? apiErrorMessage(err) : t('stations.delete_failed'))
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
        <p className="mb-2 text-[13px] font-semibold text-[var(--color-ink)]">{t('stations.terminals')}</p>
        <p className="mb-2 text-[11.5px] text-[var(--color-ink-tertiary)]">
          {t('stations.terminals_hint')}
        </p>
        <div className="space-y-1.5">
          {terminals?.map((tm) =>
            editingTerminal?.id === tm.id ? (
              <EditTerminalForm
                key={tm.id}
                terminal={tm}
                onSaved={() => {
                  setEditingTerminal(null)
                  mutate()
                }}
                onCancel={() => setEditingTerminal(null)}
              />
            ) : (
              <TerminalRow key={tm.id} terminal={tm} canEdit={canEdit} onEdit={() => setEditingTerminal(tm)} onChanged={() => mutate()} />
            ),
          )}
        </div>
      </div>

      {canManage && <form onSubmit={handleAddTerminal} className="space-y-2 border-t border-[var(--color-border)] pt-4">
        <p className="text-[13px] font-semibold text-[var(--color-ink)]">{t('stations.new_terminal')}</p>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('stations.terminal_code_ph')} className="h-10 flex-1 rounded-lg border border-[var(--color-border)] px-3 text-[13px] font-mono outline-none focus:border-[var(--color-primary)]" />
          <Button type="button" variant="ghost" onClick={handleScan} loading={scanning}>
            <ScanLine size={15} />
          </Button>
        </div>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('stations.terminal_label_ph')} className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]" />
        {error && <p className="text-[12px] font-medium text-[var(--color-danger)]">{error}</p>}
        <Button type="submit" className="w-full" disabled={!code || !label}>
          {t('common.add')}
        </Button>
      </form>}

      {canEdit && (
        <div className="border-t border-[var(--color-border)] pt-4">
          {deleteError && <p className="mb-2 text-[12px] font-medium text-[var(--color-danger)]">{deleteError}</p>}
          <Button variant="danger" className="w-full" loading={deleting} onClick={handleDelete}>
            <Trash2 size={15} /> {t('stations.delete_btn')}
          </Button>
        </div>
      )}
    </div>
  )
}

function TerminalRow({ terminal: tm, canEdit, onEdit, onChanged }: { terminal: Terminal; canEdit: boolean; onEdit: () => void; onChanged: () => void }) {
  const { t } = useI18n()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      await apiDeleteTerminal(tm.id)
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? apiErrorMessage(err) : t('common.error_generic'))
      setConfirming(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] text-[var(--color-ink)]">{tm.label}</p>
          <p className="font-mono text-[11px] text-[var(--color-ink-tertiary)]">{tm.code}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={tm.active ? 'success' : 'neutral'}>{tm.active ? t('common.active') : t('stations.inactive')}</Badge>
          {canEdit && (
            <button onClick={onEdit} title={t('common.edit')} className="text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink)]">
              <Pencil size={13} />
            </button>
          )}
          <button
            onClick={async () => {
              await apiUpdateTerminal(tm.id, { active: !tm.active })
              onChanged()
            }}
            className="text-[12px] font-medium text-[var(--color-primary)]"
          >
            {tm.active ? t('stations.disable') : t('stations.enable')}
          </button>
          {canEdit && (
            <button onClick={() => setConfirming(true)} title={t('common.delete')} className="text-[var(--color-danger)] hover:opacity-70">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
      {confirming && (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-2">
          <span className="text-[12px] font-medium text-[var(--color-danger)]">{t('stations.terminal_delete_confirm')}</span>
          <span className="flex gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" variant="danger" loading={busy} onClick={remove}>
              {t('common.delete')}
            </Button>
          </span>
        </div>
      )}
      {error && <p className="mt-2 text-[12px] font-medium text-[var(--color-danger)]">{error}</p>}
    </div>
  )
}

function EditTerminalForm({ terminal, onSaved, onCancel }: { terminal: Terminal; onSaved: () => void; onCancel: () => void }) {
  const { t } = useI18n()
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
      setError(err instanceof ApiError ? apiErrorMessage(err) : t('common.error_generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-[var(--color-primary)] px-3 py-2.5">
      <Field label={t('stations.f_code')} value={code} onChange={setCode} mono />
      <Field label={t('stations.f_name')} value={label} onChange={setLabel} />
      {error && <p className="text-[11px] font-medium text-[var(--color-danger)]">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" className="flex-1" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button size="sm" className="flex-1" loading={submitting} disabled={!code || !label} onClick={handleSave}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  )
}

function EditStationForm({ station, onUpdated }: { station: Station; onUpdated: () => void }) {
  const { t } = useI18n()
  const { show } = useToast()
  const [name, setName] = useState(station.name)
  const [address, setAddress] = useState(station.address)
  const [lat, setLat] = useState(hasCoords(station) ? String(station.lat) : '')
  const [lng, setLng] = useState(hasCoords(station) ? String(station.lng) : '')
  const [status, setStatus] = useState<Station['status']>(station.status)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const latNum = parseCoord(lat, -90, 90)
  const lngNum = parseCoord(lng, -180, 180)
  const bothEmpty = lat.trim() === '' && lng.trim() === ''
  const coordsValid = bothEmpty || (latNum !== null && lngNum !== null)

  // Map apps copy "lat, lon" as one string — split it across the two inputs.
  function paste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pair = splitPastedPair(e.clipboardData.getData('text'))
    if (!pair) return
    e.preventDefault()
    setLat(pair[0])
    setLng(pair[1])
  }

  async function handleSave() {
    if (!coordsValid) return
    setSubmitting(true)
    setError(null)
    try {
      await apiUpdateStation(station.id, { name, address, status, lat: bothEmpty ? 0 : latNum!, lng: bothEmpty ? 0 : lngNum! })
      show(t('common.saved'))
      onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? apiErrorMessage(err) : t('common.error_generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-2 border-b border-[var(--color-border)] pb-4">
      <p className="text-[13px] font-semibold text-[var(--color-ink)]">{t('stations.edit_title')}</p>
      <Field label={t('stations.f_name')} value={name} onChange={setName} />
      <Field label={t('stations.f_address')} value={address} onChange={setAddress} />

      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('common.status')}</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Station['status'])}
          className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]"
        >
          <option value="active">{t('common.active')}</option>
          <option value="paused">{t('stations.status.paused')}</option>
          <option value="closed">{t('stations.status.closed')}</option>
        </select>
      </div>

      <div className="pt-1">
        <p className="mb-1 text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('stations.coords')}</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            inputMode="decimal"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            onPaste={paste}
            placeholder={t('stations.lat')}
            className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 font-mono text-[13px] outline-none focus:border-[var(--color-primary)]"
          />
          <input
            inputMode="decimal"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            onPaste={paste}
            placeholder={t('stations.lng')}
            className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 font-mono text-[13px] outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <p className={`mt-1 text-[11.5px] ${coordsValid ? 'text-[var(--color-ink-tertiary)]' : 'font-medium text-[var(--color-danger)]'}`}>
          {coordsValid ? t('stations.coords_hint') : t('stations.coords_invalid')}
        </p>
        {!bothEmpty && coordsValid && (
          <a href={mapUrl(latNum!, lngNum!)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--color-primary)]">
            {t('stations.open_map')} <ExternalLink size={12} />
          </a>
        )}
      </div>

      {error && <p className="text-[12px] font-medium text-[var(--color-danger)]">{error}</p>}
      <Button size="sm" className="w-full" loading={submitting} onClick={handleSave} disabled={!name || !address || !coordsValid}>
        {t('common.save')}
      </Button>
    </div>
  )
}
