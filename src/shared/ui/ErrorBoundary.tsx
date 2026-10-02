import { Component, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { getLocale } from '@/shared/config/uiStore'
import { translate } from '@/shared/config/dictionaries'

interface Props {
  children: ReactNode
  label?: string
}

interface State {
  hasError: boolean
}

/** Wraps a single widget/chart/table so one broken block never takes the rest of the page down. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
  }

  private reset = () => this.setState({ hasError: false })

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
          <p className="text-[13px] text-[var(--color-ink-secondary)]">{this.props.label ?? translate(getLocale(), 'common.data_load_failed')}</p>
          <button onClick={this.reset} className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-primary)]">
            <RefreshCw size={13} /> {translate(getLocale(), 'common.retry')}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
