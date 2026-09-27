import { Download } from 'lucide-react'
import { Button } from '@/shared/ui/Button'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','))
  }
  return lines.join('\n')
}

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function ExportButton({ rows, filename }: { rows: Record<string, unknown>[]; filename: string }) {
  function handleExport() {
    const csv = toCsv(rows)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleExport} disabled={rows.length === 0}>
      <Download size={14} /> Eksport
    </Button>
  )
}
