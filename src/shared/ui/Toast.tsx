import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ToastItem {
  id: number
  message: string
  tone: 'default' | 'warning'
}

interface ToastContextValue {
  show: (message: string, tone?: 'default' | 'warning') => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const show = useCallback((message: string, tone: 'default' | 'warning' = 'default') => {
    const id = ++counter.current
    setToasts((prev) => [...prev, { id, message, tone }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-6 right-6 z-[80] flex flex-col items-end gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto max-w-[360px] rounded-xl border px-4 py-3 text-[13px] font-medium animate-[toast-in_180ms_ease-out] ${
                t.tone === 'warning'
                  ? 'border-[var(--color-amber)]/30 bg-[var(--color-surface-alt)] text-[var(--color-amber-strong)]'
                  : 'border-[var(--color-border-strong)] bg-[var(--color-surface-alt)] text-[var(--color-ink)]'
              }`}
              style={{ boxShadow: 'var(--shadow-float)' }}
            >
              {t.message}
            </div>
          ))}
          <style>{`@keyframes toast-in { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform: translateY(0);} }`}</style>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
