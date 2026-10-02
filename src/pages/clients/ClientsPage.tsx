import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { useClients } from '@/shared/api/hooks'
import { formatDateTime } from '@/shared/lib/dates'
import { formatMoneyFull } from '@/shared/lib/format'
import type { ClientRecord } from '@/entities/models'
import { formatPhone } from '@/shared/lib/phone'
import { useI18n } from '@/app/providers/I18nProvider'

export function ClientsPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const { data: clients, isLoading, error, mutate } = useClients(q || undefined)

  const sorted = useMemo(() => [...(clients ?? [])].sort((a, b) => b.balance - a.balance), [clients])

  const columns: DataTableColumn<ClientRecord>[] = [
    { id: 'name', header: 'common.name', accessor: (r) => r.name, sticky: true },
    { id: 'phone', header: 'common.phone', accessor: (r) => formatPhone(r.phone) },
    { id: 'balance', header: 'clients.balance', accessor: (r) => r.balance, numeric: true, cell: (r) => formatMoneyFull(r.balance) },
    { id: 'created', header: 'clients.registered', accessor: (r) => r.createdAt, cell: (r) => formatDateTime(r.createdAt) },
    {
      id: 'status',
      header: 'common.status',
      accessor: (r) => r.blocked,
      cell: (r) => <Badge tone={r.blocked ? 'danger' : 'success'}>{r.blocked ? t('common.blocked') : t('common.active')}</Badge>,
    },
    {
      id: 'open',
      header: '',
      sortable: false,
      accessor: () => '',
      cell: () => <ChevronRight size={15} className="ml-auto text-[var(--color-ink-tertiary)]" />,
    },
  ]

  return (
    <div className="space-y-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('clients.search')}
        className="h-10 w-full max-w-sm rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]"
      />

      <DataTable
        columns={columns}
        data={sorted}
        loading={isLoading}
        error={error ? t('common.load_failed') : undefined}
        onRetry={() => mutate()}
        getRowId={(r) => r.id}
        onRowClick={(r) => navigate(`/clients/${r.id}`)}
        emptyMessage={t('clients.empty')}
      />
    </div>
  )
}
