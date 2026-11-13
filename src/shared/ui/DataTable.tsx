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
  /** a totals row rendered in the same columns (so it always lines up), keyed by column id */
  footer?: Record<string, React.ReactNode>
  /** left side of the card header; defaults to "Jami: N" */
  title?: React.ReactNode
  /** right side of the card header (search, buttons) */
  actions?: React.ReactNode
  /** row number column "#" (on by default); `indexOffset` continues numbering across server pages */
  index?: boolean
  indexOffset?: number
  /** highlights one row (e.g. the one shown in a side panel) */
  selectedId?: string
  /** under the table, inside the card (pagination, notes) */
  bottom?: React.ReactNode
  /** no card around it — when it already sits inside one (tabs) */
  bare?: boolean
  /** hide the card header entirely */
  noHeader?: boolean
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
  maxHeight = 640,
  footer,
  title,
  actions,
  index = true,
  indexOffset = 0,
  selectedId,
  bottom,
  bare,
  noHeader,
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

  const colMeta = new Map(columns.map((c) => [c.id, c]))

  const cellBase = 'px-4 py-3 text-[14px] text-[var(--color-ink)] whitespace-nowrap'
  const renderRow = (rowIndex: number) => {
    const row = rows[rowIndex]
    const selected = selectedId !== undefined && row.id === selectedId
    return (
      <tr
        key={row.id}
        onClick={() => onRowClick?.(row.original)}
        aria-selected={selected || undefined}
        className={cn(
          'border-b border-[var(--color-border)] last:border-b-0 transition-colors',
          onRowClick && 'cursor-pointer hover:bg-[var(--color-surface-alt)]',
          selected && 'bg-[var(--color-primary-soft)] hover:bg-[var(--color-primary-soft)]',
        )}
      >
        {index && <td className={cn(cellBase, 'w-14 font-mono text-[12.5px] text-[var(--color-ink-tertiary)]')}>{indexOffset + rowIndex + 1}</td>}
        {row.getVisibleCells().map((cell) => {
          const meta = colMeta.get(cell.column.id)
          return (
            <td
              key={cell.id}
              className={cn(
                cellBase,
                meta?.numeric ? 'text-right font-mono tnum text-[13.5px]' : 'text-left',
                meta?.sticky && !index && 'sticky left-0 z-[1] bg-[var(--color-surface)]',
              )}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          )
        })}
      </tr>
    )
  }

  const columnsMenu = (
    <div className="relative">
      <button
        type="button"
        aria-label={t('common.columns')}
        title={t('common.columns')}
        onClick={() => setColumnsMenuOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-ink-tertiary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-ink)]"
      >
        <Columns3 size={15} />
      </button>
      {columnsMenuOpen && (
        <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2" style={{ boxShadow: 'var(--shadow-popover)' }}>
          {table.getAllLeafColumns().map((col) => (
            <label key={col.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-[var(--color-surface-alt)]">
              <input type="checkbox" checked={col.getIsVisible()} onChange={col.getToggleVisibilityHandler()} />
              {col.columnDef.header as string}
            </label>
          ))}
        </div>
      )}
    </div>
  )

  const thBase = 'group select-none border-b border-[var(--color-border)] px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-tertiary)]'
  const body = loading ? (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  ) : error ? (
    <ErrorState message={error} onRetry={onRetry} />
  ) : data.length === 0 ? (
    <EmptyState title={emptyMessage ?? t('common.no_data')} />
  ) : (
    <div ref={parentRef} className="overflow-auto" style={{ maxHeight }}>
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-[2] bg-[var(--color-surface-alt)]">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {index && <th className={cn(thBase, 'w-14 text-left')}>#</th>}
              {hg.headers.map((header) => {
                const meta = colMeta.get(header.column.id)
                const sorted = header.column.getIsSorted()
                return (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                      thBase,
                      meta?.numeric ? 'text-right' : 'text-left',
                      meta?.sticky && !index && 'sticky left-0 z-[3] bg-[var(--color-surface-alt)]',
                      header.column.getCanSort() && 'cursor-pointer hover:text-[var(--color-ink-secondary)]',
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (sorted === 'asc' ? <ArrowUp size={12} /> : sorted === 'desc' ? <ArrowDown size={12} /> : <ArrowUpDown size={11} className="opacity-0 group-hover:opacity-30" />)}
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
          {footer && (
            <tfoot className="sticky bottom-0 z-[2] bg-[var(--color-surface-alt)]">
              <tr>
                {index && <td className="border-t border-[var(--color-border-strong)] px-4 py-3.5" />}
                {table.getVisibleLeafColumns().map((col) => {
                  const meta = colMeta.get(col.id)
                  return (
                    <td
                      key={col.id}
                      className={cn(
                        'whitespace-nowrap border-t border-[var(--color-border-strong)] px-4 py-3.5 text-[14px] font-bold text-[var(--color-ink)]',
                        meta?.numeric ? 'text-right font-mono tnum text-[13.5px]' : 'text-left',
                        meta?.sticky && !index && 'sticky left-0 z-[3] bg-[var(--color-surface-alt)]',
                      )}
                    >
                      {footer[col.id] ?? ''}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          )}
      </table>
    </div>
  )

  if (bare) {
    return (
      <div>
        {body}
        {bottom}
      </div>
    )
  }
  return (
    <div className="dt-card overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      {!noHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <div className="text-[14px] text-[var(--color-ink-secondary)]">
            {title ?? (
              <>
                {t('common.total')}: <span className="font-bold text-[var(--color-ink)]">{data.length}</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {!loading && !error && data.length > 0 && columnsMenu}
          </div>
        </div>
      )}
      {body}
      {bottom && <div className="border-t border-[var(--color-border)] px-5 py-3">{bottom}</div>}
    </div>
  )
}
