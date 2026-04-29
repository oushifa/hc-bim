import { useAuthCookie } from '~~/lib/auth/composables/auth'

export type FrontendLogEvent = {
  eventId?: string
  eventTime?: string
  source?: 'frontend'
  who?: {
    userId?: string | null
    orgId?: string | null
    role?: string | null
    ip?: string | null
    userAgent?: string | null
  }
  where?: {
    page?: string | null
    route?: string | null
    module?: string | null
    service?: string | null
  }
  what: {
    action: string
    targetType?: string | null
    targetId?: string | null
    payloadSummary?: Record<string, unknown> | string | null
    method?: string | null
  }
  result?: {
    status?: 'success' | 'fail' | 'unknown'
    code?: string | null
    message?: string | null
    durationMs?: number | null
    httpStatus?: number | null
  }
  trace?: {
    traceId?: string | null
    requestId?: string | null
  }
  metadata?: Record<string, unknown> | null
}

const LOG_BATCH_LIMIT = 20
const LOG_FLUSH_INTERVAL_MS = 5000
const LOG_QUEUE_MAX = 500

const createEventId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

const createEventTime = () => new Date().toISOString()

const getLogEndpoint = () => `${useApiOrigin()}/api/v1/logs/events/batch`

const shouldUseBeacon = (hasToken: boolean) => {
  if (hasToken) return false
  if (typeof window === 'undefined') return false

  const endpoint = new URL(getLogEndpoint(), window.location.href)
  return endpoint.origin === window.location.origin
}

export const useLog = () => {
  const queue = useState<FrontendLogEvent[]>('sys-log-queue', () => [])
  const timer = useState<ReturnType<typeof setTimeout> | null>(
    'sys-log-timer',
    () => null
  )
  const listenerReady = useState<boolean>('sys-log-listener-ready', () => false)
  const authToken = useAuthCookie()

  const clearFlushTimer = () => {
    if (!timer.value) return
    clearTimeout(timer.value)
    timer.value = null
  }

  const flushWithFetch = async (events: FrontendLogEvent[]) => {
    const token = authToken.value
    const headers = new Headers({ 'Content-Type': 'application/json' })
    if (token) headers.set('Authorization', `Bearer ${token}`)

    await fetch(getLogEndpoint(), {
      method: 'POST',
      headers,
      body: JSON.stringify({ events }),
      keepalive: true
    })
  }

  const flushWithBeacon = (events: FrontendLogEvent[]) => {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return false
    const payload = JSON.stringify({ events })
    const body = new Blob([payload], { type: 'application/json' })
    return navigator.sendBeacon(getLogEndpoint(), body)
  }

  const flush = async (
    options?: Partial<{
      preferBeacon: boolean
    }>
  ) => {
    if (import.meta.server || !queue.value.length) return

    const events = [...queue.value]
    queue.value = []
    clearFlushTimer()

    try {
      const hasToken = !!authToken.value
      if (
        options?.preferBeacon &&
        shouldUseBeacon(hasToken) &&
        flushWithBeacon(events)
      ) {
        return
      }
      await flushWithFetch(events)
    } catch {
      queue.value = [...events, ...queue.value].slice(0, LOG_QUEUE_MAX)
    }
  }

  const scheduleFlush = () => {
    if (timer.value || import.meta.server) return
    timer.value = setTimeout(() => {
      void flush()
    }, LOG_FLUSH_INTERVAL_MS)
  }

  const track = (event: FrontendLogEvent) => {
    if (import.meta.server) return

    queue.value.push({
      ...event,
      source: 'frontend',
      eventId: event.eventId || createEventId(),
      eventTime: event.eventTime || createEventTime(),
      where: {
        route: event.where?.route || window.location.pathname,
        page: event.where?.page || window.location.href,
        module: event.where?.module || null,
        service: event.where?.service || null
      }
    })

    if (queue.value.length >= LOG_BATCH_LIMIT) {
      void flush()
      return
    }

    scheduleFlush()
  }

  if (import.meta.client && !listenerReady.value) {
    listenerReady.value = true

    window.addEventListener('pagehide', () => {
      void flush({ preferBeacon: true })
    })

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        void flush({ preferBeacon: true })
      }
    })
  }

  return {
    track,
    flush
  }
}
