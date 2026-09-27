import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/shared/config/authStore'
import { ApiError, type ErrorCode } from './errors'

const baseURL = import.meta.env.VITE_API_BASE_URL as string

// withCredentials so the httpOnly refresh cookie (set on the API's own origin) is sent
// along with cross-origin requests from this app's own origin/port.
export const http = axios.create({ baseURL, withCredentials: true })

function newIdempotencyKey(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

http.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  // A request that already carries its own token (e.g. /me right after login, before the
  // store is updated) must keep it — otherwise a stale stored token would replace it.
  if (accessToken && !config.headers.has('Authorization')) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }
  const method = (config.method ?? 'get').toLowerCase()
  if (method !== 'get' && !config.headers.has('Idempotency-Key')) {
    config.headers.set('Idempotency-Key', newIdempotencyKey())
  }
  return config
})

let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post<{ ok: true; data: { accessToken: string } }>(
      `${baseURL}/admin/auth/refresh`,
      {},
      { withCredentials: true, headers: { 'Idempotency-Key': newIdempotencyKey() } },
    )
    const { accessToken } = res.data.data
    useAuthStore.getState().setAccessToken(accessToken)
    return accessToken
  } catch {
    useAuthStore.getState().logout()
    return null
  }
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ ok: false; error: { code: ErrorCode; details?: Record<string, unknown> } }>) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined
    const status = error.response?.status

    if (status === 401 && original && !original._retried && !original.url?.includes('/admin/auth/')) {
      original._retried = true
      const newToken = await (refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null
      }))
      if (newToken) {
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` }
        return http.request(original)
      }
    }

    if (!error.response) {
      return Promise.reject(new ApiError('NETWORK_ERROR'))
    }

    const body = error.response.data
    const code = body?.error?.code ?? 'INTERNAL_ERROR'
    const details = body?.error?.details
    return Promise.reject(new ApiError(code, details))
  },
)
