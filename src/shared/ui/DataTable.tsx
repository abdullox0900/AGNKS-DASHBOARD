import { useMemo, useRef, useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3 } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import { translate, type DictKey } from '@/shared/config/dictionaries'
import { Skeleton } from './Skeleton'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'

export interface DataTableColumn<T> {
  id: string
  /** a dictionary key (translated on render) or a literal label */
  header: DictKey | (string & {})
  accessor: (row: T) => unknown
  cell?: (row: T) => React.ReactNode
  numeric?: boolean
  sortable?: boolean
  sticky?: boolean
  width?: number
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  loading?: boolean
  error?: string
  onRetry?: () => void
  emptyMessage?: string
  onRowClick?: (row: T) => void
  getRowId?: (row: T) => string
  maxHeight?: number
}

const VIRTUALIZE_THRESHOLD = 200

export function DataTable<T>({
  columns,
  data,
  loading,
  error,
  onRetry,
  emptyMessage,
  onRowClick,
  getRowId,
  maxHeight = 560,
}: DataTableProps<T>) {
  const { t, locale } = useI18n()
  const [sorting, setSorting] = useState<SortingState>([])
  const [visibility, setVisibility] = useState<VisibilityState>({})
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false)
  const parentRef = useRef<HTMLDivElement>(null)

  const tsColumns = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((col) => ({
        id: col.id,
        header: translate(locale, col.header as DictKey),
        accessorFn: col.accessor,
        enableSorting: col.sortable !== false,
        cell: (ctx) => (col.cell ? col.cell(ctx.row.original) : String(ctx.getValue() ?? '—')),
      })),
    [columns, locale],
  )

  const table = useReactTable({
    data,
    columns: tsColumns,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: getRowId as never,
  })

  const rows = table.getRowModel().rows
  const shouldVirtualize = rows.length > VIRTUALIZE_THRESHOLD

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 12,
    enabled: shouldVirtualize,
  })

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (data.length === 0) return <EmptyState title={emptyMessage ?? t('common.no_data')} />

  const colMeta = new Map(columns.map((c) => [c.id, c]))

  const renderRow = (rowIndex: number) => {
    const row = rows[rowIndex]
    return (
      <tr
        key={row.id}
        onClick={() => onRowClick?.(row.original)}
        className={cn(
          'border-b border-[var(--color-border)] last:border-b-0',
          onRowClick && 'cursor-pointer hover:bg-[var(--color-surface-alt)]',
        )}
      >
        {row.getVisibleCells().map((cell) => {
          const meta = colMeta.get(cell.column.id)
          return (
            <td
              key={cell.id}
              className={cn(
                'px-3 py-2.5 text-[13px] text-[var(--color-ink)] whitespace-nowrap',
                meta?.numeric ? 'text-right tnum' : 'text-left',
                meta?.sticky && 'sticky left-0 z-[1] bg-[var(--color-surface)]',
              )}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          )
        })}
      </tr>
    )
  }

  return (
    <div>
      <div className="flex justify-end px-1 pb-2">
        <div className="relative">
          <button
            onClick={() => setColumnsMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-[12px] text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]"
          >
            <Columns3 size={13} /> {t('common.columns')}
          </button>
          {columnsMenuOpen && (
            <div
              className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
              style={{ boxShadow: 'var(--shadow-popover)' }}
            >
              {table.getAllLeafColumns().map((col) => (
                <label key={col.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-[var(--color-surface-alt)]">
                  <input type="checkbox" checked={col.getIsVisible()} onChange={col.getToggleVisibilityHandler()} />
                  {col.columnDef.header as string}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div ref={parentRef} className="overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" style={{ maxHeight }}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-[2] bg-[var(--color-surface-alt)]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const meta = colMeta.get(header.column.id)
                  const sorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={cn(
                        'select-none border-b border-[var(--color-border)] px-3 py-2.5 text-[12px] font-semibold text-[var(--color-ink-secondary)]',
                        meta?.numeric ? 'text-right' : 'text-left',
                        meta?.sticky && 'sticky left-0 z-[3] bg-[var(--color-surface-alt)]',
                        header.column.getCanSort() && 'cursor-pointer',
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() &&
                          (sorted === 'asc' ? (
                            <ArrowUp size={12} />
                          ) : sorted === 'desc' ? (
                            <ArrowDown size={12} />
                          ) : (
                            <ArrowUpDown size={11} className="opacity-30" />
                          ))}
                      </span>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {shouldVirtualize ? (
              <>
                <tr style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }} />
                {virtualizer.getVirtualItems().map((vi) => renderRow(vi.index))}
                <tr
                  style={{
                    height: virtualizer.getTotalSize() - (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                  }}
                />
              </>
            ) : (
              rows.map((_, i) => renderRow(i))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
