import type { ReactNode } from 'react'
import { SWRConfig } from 'swr'
import { ToastProvider } from '@/shared/ui/Toast'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { isClientError } from '@/shared/api/errors'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary label="Ilovada xatolik yuz berdi">
      <SWRConfig
        value={{
          revalidateOnFocus: true,
          shouldRetryOnError: (err) => !isClientError(err),
          errorRetryCount: 3,
          keepPreviousData: true,
        }}
      >
        <ToastProvider>{children}</ToastProvider>
      </SWRConfig>
    </ErrorBoundary>
  )
}
