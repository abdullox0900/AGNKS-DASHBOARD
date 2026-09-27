import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  width?: number
  children: ReactNode
}

export function Drawer({ open, onClose, title, width = 420, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = original
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="relative z-10 flex h-full flex-col bg-[var(--color-surface)] animate-[drawer-in_200ms_ease-out]"
        style={{ width, boxShadow: 'var(--shadow-float)' }}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--color-ink-tertiary)] hover:bg-[var(--color-surface-alt)]">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
      <style>{`@keyframes drawer-in { from { transform: translateX(100%);} to { transform: translateX(0);} }`}</style>
    </div>,
    document.body,
  )
}
