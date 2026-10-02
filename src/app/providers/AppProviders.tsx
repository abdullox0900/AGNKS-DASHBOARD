import type { ReactNode } from 'react'
import { SWRConfig } from 'swr'
import { ToastProvider } from '@/shared/ui/Toast'
import { TooltipProvider } from '@/shared/ui/Menu'
import { I18nProvider } from './I18nProvider'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { isClientError } from '@/shared/api/errors'
import { getLocale } from '@/shared/config/uiStore'
import { translate } from '@/shared/config/dictionaries'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary label={translate(getLocale(), 'common.app_error')}>
      <SWRConfig
        value={{
          revalidateOnFocus: true,
          shouldRetryOnError: (err) => !isClientError(err),
          errorRetryCount: 3,
          keepPreviousData: true,
        }}
      >
        <I18nProvider>
          <TooltipProvider delayDuration={150}>
            <ToastProvider>{children}</ToastProvider>
          </TooltipProvider>
        </I18nProvider>
      </SWRConfig>
    </ErrorBoundary>
  )
}
