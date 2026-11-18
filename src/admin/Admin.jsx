import { useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import AdminLogin from './AdminLogin'
import Heatmap from './Heatmap'
import VisitorLocation from './VisitorLocation'
import VisitorMap from './VisitorMap'

/* =========================================================
   HELPERS
========================================================= */

const getMetric = (report, index) => {
  return report?.rows?.[0]?.metricValues?.[index]?.value || '0'
}

const formatNumber = (value) => {
  return Number(value || 0).toLocaleString('en-IN')
}

const formatDuration = (seconds) => {
  const totalSeconds = Math.round(Number(seconds || 0))

  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds
  ).padStart(2, '0')}`
}

/* =========================================================
   STAT CARD
========================================================= */

const StatCard = ({
  label,
  value,
  change,
  description,
}) => {
  return (
    <div className="group relative overflow-hidden border border-white/[0.08] bg-[#11100e] p-5 transition-all duration-500 hover:border-[#b79b68]/40">
      {/* subtle glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#b79b68]/[0.04] blur-3xl transition-all duration-700 group-hover:bg-[#b79b68]/[0.08]" />

      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            {label}
          </p>

          <span className="h-1.5 w-1.5 rounded-full bg-[#b79b68]" />
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="font-serif text-3xl font-light tracking-tight text-[#eee8dc]">
              {value}
            </h3>

            {description && (
              <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-white/30">
                {description}
              </p>
            )}
          </div>

          {change && (
            <span className="mb-1 text-[10px] tracking-[0.1em] text-[#b79b68]">
              {change}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   MINI BAR
========================================================= */

export const MiniBar = ({ value, label }) => {
  return (
    <div className="group">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] text-white/55">
          {label}
        </span>

        <span className="text-[10px] text-white/30">
          {value}%
        </span>
      </div>

      <div className="h-px w-full bg-white/[0.08]">
        <div
          className="h-px bg-[#b79b68] transition-all duration-700 group-hover:bg-[#d1b77f]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

/* =========================================================
   VISITORS CHART
========================================================= */

/** GA4's "YYYYMMDD" date string → a local Date, or null if unparseable. */
const parseGaDate = (value) => {
  if (!value || value.length !== 8) return null
  const date = new Date(
    Number(value.slice(0, 4)),
    Number(value.slice(4, 6)) - 1,
    Number(value.slice(6, 8))
  )
  return Number.isNaN(date.getTime()) ? null : date
}

const gaDateKey = (date) =>
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
    date.getDate()
  ).padStart(2, '0')}`

const formatAxisDate = (date) =>
  date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })

const formatTooltipDate = (date) =>
  date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const VisitorsChart = ({ report, loading }) => {
  const [hoverIndex, setHoverIndex] = useState(null)

  if (loading) {
    return (
      <div className="flex h-[260px] items-center justify-center">
        <span className="text-[9px] uppercase tracking-[0.2em] text-white/25">
          Loading analytics...
        </span>
      </div>
    )
  }

  const rows = report?.rows || []

  if (!rows.length) {
    return (
      <div className="flex h-[260px] items-center justify-center">
        <span className="text-[9px] uppercase tracking-[0.2em] text-white/25">
          No visitor data available
        </span>
      </div>
    )
  }

  const byDate = new Map()
  rows.forEach((row) => {
    const key = row.dimensionValues?.[0]?.value || ''
    const date = parseGaDate(key)
    if (date) byDate.set(gaDateKey(date), Number(row.metricValues?.[0]?.value || 0))
  })

  // This section is a fixed 30-day window (the same "30daysAgo → today" range
  // the Edge Function queries), so every day in it gets a bar. GA4 only
  // returns rows for dates with at least one visitor, so a day with none is
  // filled in as 0 here rather than dropped from the chart.
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - 29)

  const values = []
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    values.push({ date: new Date(d), users: byDate.get(gaDateKey(d)) || 0 })
  }

  const maxUsers = Math.max(...values.map((v) => v.users), 1)
  const gridLevels = [1, 0.75, 0.5, 0.25, 0]
  // Thin the x-axis labels so a full 30-day trend stays readable — every day
  // still renders its own bar, it just isn't all individually labelled.
  const labelEvery = Math.max(1, Math.ceil(values.length / 7))

  return (
    <div className="w-full">
      <p className="mb-4 text-[9px] uppercase tracking-[0.2em] text-white/30">
        Visitors
      </p>

      <div className="relative h-[210px] w-full">
        {/* grid */}
        <div className="absolute inset-y-0 left-10 right-0 flex flex-col justify-between">
          {gridLevels.map((level) => (
            <div key={level} className="h-px w-full bg-white/[0.06]" />
          ))}
        </div>

        {/* y labels */}
        <div className="absolute left-0 top-0 flex h-full w-8 flex-col justify-between text-right text-[9px] text-white/25">
          {gridLevels.map((level) => (
            <span key={level}>
              {Math.round(maxUsers * level).toLocaleString('en-IN')}
            </span>
          ))}
        </div>

        {/* bars */}
        <div className="absolute inset-y-0 left-10 right-0 flex items-end gap-[3px]">
          {values.map((v, index) => {
            const key = gaDateKey(v.date)
            const heightPct = (v.users / maxUsers) * 100
            const isToday = v.date.getTime() === today.getTime()
            // GA4's standard reports process today with a delay, so a 0 here
            // doesn't mean no one has visited — Realtime (shown separately,
            // above) is what reflects visitors on the site right now.
            const maybeProcessing = isToday && v.users === 0

            return (
              <div
                key={key}
                className="group relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() =>
                  setHoverIndex((h) => (h === index ? null : h))
                }
              >
                <div
                  className={`w-full rounded-t-[1.5px] transition-colors duration-200 ${
                    v.users > 0
                      ? 'bg-[#b79b68]/55 group-hover:bg-[#d1b77f]'
                      : 'bg-white/[0.06]'
                  }`}
                  style={{
                    height: `${Math.max(heightPct, v.users > 0 ? 2 : 1)}%`,
                  }}
                />

                {hoverIndex === index && (
                  <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap border border-white/10 bg-[#1a1812] px-3 py-2 text-center shadow-lg shadow-black/40">
                    <p className="text-[9px] uppercase tracking-[0.12em] text-white/40">
                      {formatTooltipDate(v.date)}
                    </p>
                    <p className="mt-1 text-[12px] text-[#eee8dc]">
                      Visitors:{' '}
                      <span className="text-[#b79b68]">
                        {v.users.toLocaleString('en-IN')}
                      </span>
                    </p>
                    {maybeProcessing && (
                      <p className="mt-1 max-w-[160px] whitespace-normal text-[9px] leading-snug text-white/35">
                        Today&rsquo;s data may still be processing
                      </p>
                    )}
                    <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r border-white/10 bg-[#1a1812]" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* x labels */}
      <div className="ml-10 mt-2 flex text-[9px] uppercase tracking-[0.08em] text-white/20">
        {values.map((v, index) => (
          <div key={gaDateKey(v.date)} className="flex-1 text-center">
            {index % labelEvery === 0 || index === values.length - 1
              ? formatAxisDate(v.date)
              : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

/* =========================================================
   TRAFFIC SOURCES
========================================================= */

const TrafficSources = ({
  report,
  loading,
}) => {
  if (loading) {
    return (
      <div className="flex h-[250px] items-center justify-center">
        <span className="text-[9px] uppercase tracking-[0.2em] text-white/25">
          Loading...
        </span>
      </div>
    )
  }

  const rows = report?.rows || []

  if (!rows.length) {
    return (
      <div className="flex h-[250px] items-center justify-center">
        <span className="text-[9px] uppercase tracking-[0.2em] text-white/25">
          No traffic source data
        </span>
      </div>
    )
  }

  const sourceRows = rows
    .map((row) => ({
      name:
        row.dimensionValues?.[0]?.value ||
        'Unknown',
      sessions: Number(
        row.metricValues?.[0]?.value || 0
      ),
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5)

  const totalSessions = sourceRows.reduce(
    (sum, item) => sum + item.sessions,
    0
  )

  return (
    <div className="space-y-7">
      {sourceRows.map((item) => {
        const percentage =
          totalSessions > 0
            ? Math.round(
                (item.sessions / totalSessions) *
                  100
              )
            : 0

        return (
          <MiniBar
            key={item.name}
            label={item.name}
            value={percentage}
          />
        )
      })}
    </div>
  )
}

/* =========================================================
   MOST VIEWED PAGES
========================================================= */

const PagesList = ({
  report,
  loading,
}) => {
  if (loading) {
    return (
      <div className="py-10 text-center text-[9px] uppercase tracking-[0.2em] text-white/25">
        Loading pages...
      </div>
    )
  }

  const rows = report?.rows || []

  if (!rows.length) {
    return (
      <div className="py-10 text-center text-[9px] uppercase tracking-[0.2em] text-white/25">
        No page data available
      </div>
    )
  }

  return (
    <div className="divide-y divide-white/[0.06]">
      {rows.slice(0, 5).map((row, index) => {
        const path =
          row.dimensionValues?.[0]?.value ||
          '/'

        const views = Number(
          row.metricValues?.[0]?.value || 0
        )

        let name = path

        if (path === '/') {
          name = 'Homepage'
        } else if (
          path.includes('/showcase/')
        ) {
          name = 'Showcase'
        } else if (path.includes('/gallery')) {
          name = 'Gallery'
        } else if (
          path.includes('/floorplan')
        ) {
          name = 'Floor Plan'
        } else if (
          path.includes('/location')
        ) {
          name = 'Location'
        }

        return (
          <div
            key={`${path}-${index}`}
            className="flex items-center justify-between py-4"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="w-4 text-[9px] text-white/20">
                {String(index + 1).padStart(2, '0')}
              </span>

              <div className="min-w-0">
                <p className="truncate text-[11px] text-white/65">
                  {name}
                </p>

                <p className="mt-1 truncate text-[9px] text-white/20">
                  {path}
                </p>
              </div>
            </div>

            <span className="ml-4 text-[10px] text-[#b79b68]">
              {formatNumber(views)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* =========================================================
   DEVICES
========================================================= */

const DevicesList = ({
  report,
  loading,
}) => {
  if (loading) {
    return (
      <div className="py-10 text-center text-[9px] uppercase tracking-[0.2em] text-white/25">
        Loading devices...
      </div>
    )
  }

  const rows = report?.rows || []

  if (!rows.length) {
    return (
      <div className="py-10 text-center text-[9px] uppercase tracking-[0.2em] text-white/25">
        No device data available
      </div>
    )
  }

  const deviceRows = rows.map((row) => ({
    device:
      row.dimensionValues?.[0]?.value ||
      'Unknown',
    users: Number(
      row.metricValues?.[0]?.value || 0
    ),
    sessions: Number(
      row.metricValues?.[1]?.value || 0
    ),
  }))

  const totalUsers = deviceRows.reduce(
    (sum, item) => sum + item.users,
    0
  )

  return (
    <div className="space-y-6">
      {deviceRows.map((item) => {
        const percentage =
          totalUsers > 0
            ? Math.round(
                (item.users / totalUsers) * 100
              )
            : 0

        const label =
          item.device.charAt(0).toUpperCase() +
          item.device.slice(1)

        return (
          <div key={item.device}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] text-white/60">
                {label}
              </span>

              <span className="text-[10px] text-white/25">
                {formatNumber(item.sessions)} sessions
              </span>
            </div>

            <div className="relative h-8 border border-white/[0.06]">
              <div
                className="absolute inset-y-0 left-0 bg-[#b79b68]/10"
                style={{
                  width: `${percentage}%`,
                }}
              />

              <div className="absolute inset-y-0 left-3 flex items-center">
                <span className="text-[9px] uppercase tracking-[0.12em] text-[#b79b68]">
                  {percentage}%
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* =========================================================
   USER EVENTS
========================================================= */

const UserActions = ({
  report,
  loading,
}) => {
  if (loading) {
    return (
      <div className="py-8 text-center text-[9px] uppercase tracking-[0.2em] text-white/25">
        Loading events...
      </div>
    )
  }

  const rows = report?.rows || []

  if (!rows.length) {
    return (
      <div className="py-8 text-center text-[9px] uppercase tracking-[0.2em] text-white/25">
        No custom events available
      </div>
    )
  }

  const eventMap = new Map()

  rows.forEach((row) => {
    const eventName =
      row.dimensionValues?.[0]?.value ||
      'unknown'

    const count = Number(
      row.metricValues?.[0]?.value || 0
    )

    eventMap.set(eventName, count)
  })

  // The site's six real navigation items — Views, Amenities, Location,
  // Floorplan, Gallery, Enquire — tracked from the one menu-select handler in
  // Landing.jsx (see trackMenuSelect in lib/analytics.js). "Enquiries" counts
  // clicks that open the Enquire view, the same as the other five; Enquire.jsx
  // itself isn't touched, so this isn't a form-submission count.
  const actions = [
    ['Views', 'views_click'],
    ['Amenities', 'amenities_click'],
    ['Location', 'location_click'],
    ['Floorplan', 'floorplan_click'],
    ['Gallery', 'gallery_click'],
    ['Enquiries', 'generate_lead'],
  ]

  return (
    <div className="grid grid-cols-1 gap-px bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
      {actions.map(([label, eventName]) => (
        <div
          key={eventName}
          className="bg-[#11100e] p-5"
        >
          <p className="text-[9px] uppercase tracking-[0.14em] text-white/30">
            {label}
          </p>

          <p className="mt-4 font-serif text-2xl font-light text-[#eee8dc]">
            {formatNumber(
              eventMap.get(eventName) || 0
            )}
          </p>

          <p className="mt-2 text-[8px] uppercase tracking-[0.1em] text-white/15">
            {eventName}
          </p>
        </div>
      ))}
    </div>
  )
}

/* =========================================================
   FLOOR INTEREST (Supabase: Realtime for LIVE, RPC for history)
========================================================= */

const LIVE_WINDOW_MS = 30 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

const PERIODS = [
  { key: 'live', label: 'Live' },
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: '90d', label: '90 Days', days: 90 },
]

const formatTime = (ms) =>
  new Date(ms).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

const formatDateTime = (ms) =>
  new Date(ms).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

const FLOOR_PAGE_SIZE = 12

/** 0-based page indexes to show, with null marking a gap: 1 … 4 5 6 … 9 */
const pageWindow = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const pages = new Set([0, total - 1, current - 1, current, current + 1])
  const list = [...pages]
    .filter((p) => p >= 0 && p < total)
    .sort((a, b) => a - b)
  return list.flatMap((p, i) => (i > 0 && p - list[i - 1] > 1 ? [null, p] : [p]))
}

const FloorInterest = () => {
  const [period, setPeriod] = useState('live')
  const [page, setPage] = useState(0)

  /* ---------- LIVE: last 30 minutes + Realtime INSERTs ---------- */

  const [events, setEvents] = useState([])
  const [status, setStatus] = useState('connecting') // connecting | live | error
  const [liveLoaded, setLiveLoaded] = useState(false)
  const [liveError, setLiveError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false

    const addRows = (incoming) =>
      setEvents((prev) => {
        const seen = new Set(prev.map((e) => e.id))
        const fresh = incoming.filter((e) => !seen.has(e.id))
        return fresh.length ? [...prev, ...fresh] : prev
      })

    // Subscribe first, then fetch, so nothing inserted in between is missed.
    const channel = supabase
      .channel('floor-plan-events-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'floor_plan_events' },
        (payload) => {
          const row = payload.new
          if (!row?.id || !row.floor_name) return
          addRows([row])
        }
      )
      .subscribe((state) => {
        if (cancelled) return
        if (state === 'SUBSCRIBED') setStatus('live')
        else if (
          state === 'CHANNEL_ERROR' ||
          state === 'TIMED_OUT' ||
          state === 'CLOSED'
        )
          setStatus('error')
      })

    const since = new Date(Date.now() - LIVE_WINDOW_MS).toISOString()

    supabase
      .from('floor_plan_events')
      .select('id, floor_name, visitor_id, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setLiveError(error.message)
        } else {
          setLiveError('')
          addRows(data || [])
        }
        setLiveLoaded(true)
      })

    // Re-evaluate the 30-minute window so old rows age out on their own.
    const tick = setInterval(() => setNow(Date.now()), 15000)

    return () => {
      cancelled = true
      clearInterval(tick)
      supabase.removeChannel(channel)
    }
  }, [])

  const liveRows = useMemo(() => {
    const cutoff = now - LIVE_WINDOW_MS
    const byFloor = new Map()

    events.forEach((e) => {
      const at = new Date(e.created_at).getTime()
      if (!Number.isFinite(at) || at < cutoff) return
      const item = byFloor.get(e.floor_name) || {
        floor: e.floor_name,
        selections: 0,
        visitors: new Set(),
        last: 0,
      }
      item.selections += 1
      item.visitors.add(e.visitor_id)
      item.last = Math.max(item.last, at)
      byFloor.set(e.floor_name, item)
    })

    return [...byFloor.values()]
      .map((r) => ({
        floor: r.floor,
        selections: r.selections,
        users: r.visitors.size,
        last: r.last,
      }))
      .sort((a, b) => b.selections - a.selections || b.last - a.last)
  }, [events, now])

  /* ---------- 7 / 30 / 90 DAYS: aggregated in Postgres ---------- */

  // The result carries the period it was fetched for, so "loading" is derived
  // (history.period !== period) instead of set synchronously inside the effect.
  const [history, setHistory] = useState({ period: null, rows: [], error: '' })
  const historyDays = PERIODS.find((p) => p.key === period)?.days

  useEffect(() => {
    if (!historyDays) return undefined
    let cancelled = false

    const since = new Date(Date.now() - historyDays * DAY_MS).toISOString()

    supabase
      .rpc('floor_plan_summary', { since })
      .then(({ data, error }) => {
        if (cancelled) return
        setHistory({
          period,
          error: error ? error.message : '',
          rows: (data || []).map((r) => ({
            floor: r.floor_name,
            selections: Number(r.selections),
            users: Number(r.users),
            last: new Date(r.last_selected).getTime(),
          })),
        })
      })

    return () => {
      cancelled = true
    }
  }, [period, historyDays])

  /* ---------- Resolve what the UI shows ---------- */

  const isLive = period === 'live'
  const rows = isLive ? liveRows : history.rows
  const loaded = isLive ? liveLoaded : history.period === period
  const error = isLive ? liveError : history.error
  const formatLast = isLive ? formatTime : formatDateTime
  const maxSelections = Math.max(...rows.map((r) => r.selections), 1)
  const chartRows = rows.slice(0, 10)

  // Live rows can shrink as they age out, so clamp rather than trust `page`.
  const totalPages = Math.max(1, Math.ceil(rows.length / FLOOR_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const pageStart = currentPage * FLOOR_PAGE_SIZE
  const pageRows = rows.slice(pageStart, pageStart + FLOOR_PAGE_SIZE)

  const emptyText = isLive
    ? 'No floor selections in the last 30 minutes'
    : `No floor selections in the last ${historyDays} days`

  let body
  if (!loaded) {
    body = (
      <div className="py-8 text-center text-[9px] uppercase tracking-[0.2em] text-white/25">
        Loading floor data...
      </div>
    )
  } else if (error) {
    body = (
      <div className="py-8 text-center text-[9px] uppercase tracking-[0.2em] text-red-300/60">
        Unable to load floor data
      </div>
    )
  } else if (!rows.length) {
    body = (
      <div className="py-8 text-center text-[9px] uppercase tracking-[0.2em] text-white/25">
        {emptyText}
      </div>
    )
  } else {
    body = (
      <div className="space-y-12">
        {/* chart */}
        <div className="grid gap-x-12 gap-y-4 md:grid-cols-2">
          {chartRows.map((row) => (
            <div key={row.floor}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] text-white/60">
                  {row.floor}
                </span>

                <span className="text-[10px] text-white/30">
                  {formatNumber(row.selections)}
                </span>
              </div>

              <div className="h-2 border border-white/[0.06]">
                <div
                  className="h-full bg-[#b79b68]/40 transition-all duration-700"
                  style={{
                    width: `${(row.selections / maxSelections) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* table */}
        <div>
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="border-b border-white/[0.07] text-[8px] uppercase tracking-[0.12em] text-white/30 sm:text-[9px] sm:tracking-[0.15em]">
                <th className="w-[30%] pb-4 font-normal sm:w-auto">Floor</th>
                <th className="w-[24%] pb-4 text-right font-normal sm:w-[16%]">Selections</th>
                <th className="w-[16%] pb-4 text-right font-normal sm:w-[14%]">Users</th>
                <th className="w-[30%] pb-4 text-right font-normal sm:w-[26%]">Last selected</th>
              </tr>
            </thead>

            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={row.floor}
                  className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02] last:border-0"
                >
                  <td className="py-4 text-[11px] text-white/70 sm:py-5 sm:text-[12px]">
                    {row.floor}
                  </td>
                  <td className="py-4 text-right font-serif text-base font-light text-[#eee8dc] sm:py-5 sm:text-xl">
                    {formatNumber(row.selections)}
                  </td>
                  <td className="py-4 text-right text-[11px] text-[#b79b68] sm:py-5 sm:text-[12px]">
                    {formatNumber(row.users)}
                  </td>
                  <td className="py-4 text-right text-[10px] leading-snug text-white/35 sm:py-5 sm:text-[11px]">
                    {Number.isFinite(row.last) ? formatLast(row.last) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="mt-6 flex flex-col gap-4 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[9px] uppercase tracking-[0.18em] text-white/30">
                {pageStart + 1}–{Math.min(pageStart + FLOOR_PAGE_SIZE, rows.length)} of {rows.length} floors
              </span>

              <nav
                aria-label="Floor pages"
                className="flex flex-wrap items-center gap-1"
              >
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                  className="px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-white/45 transition-colors hover:text-[#b79b68] disabled:cursor-default disabled:text-white/15 disabled:hover:text-white/15"
                >
                  Previous
                </button>

                {pageWindow(currentPage, totalPages).map((p, i) =>
                  p === null ? (
                    <span key={`gap-${i}`} className="px-1 text-[10px] text-white/20">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      aria-current={p === currentPage ? 'page' : undefined}
                      onClick={() => setPage(p)}
                      className={`h-8 min-w-8 border px-2 text-[10px] transition-colors ${
                        p === currentPage
                          ? 'border-[#b79b68]/40 bg-[#b79b68]/10 text-[#b79b68]'
                          : 'border-transparent text-white/40 hover:text-white/70'
                      }`}
                    >
                      {p + 1}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPage(currentPage + 1)}
                  className="px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-white/45 transition-colors hover:text-[#b79b68] disabled:cursor-default disabled:text-white/15 disabled:hover:text-white/15"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex border border-white/[0.08]">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                setPeriod(p.key)
                setPage(0)
              }}
              className={`px-4 py-2 text-[9px] uppercase tracking-[0.18em] transition-colors ${
                period === p.key
                  ? 'bg-[#b79b68]/15 text-[#b79b68]'
                  : 'text-white/35 hover:text-white/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {isLive ? (
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === 'live'
                  ? 'bg-emerald-400'
                  : status === 'error'
                    ? 'bg-red-400'
                    : 'bg-white/30'
              }`}
            />
            <span
              className={
                status === 'live'
                  ? 'text-emerald-300/80'
                  : status === 'error'
                    ? 'text-red-300/70'
                    : 'text-white/30'
              }
            >
              {status === 'live'
                ? 'Live — last 30 minutes'
                : status === 'error'
                  ? 'Live updates disconnected'
                  : 'Connecting'}
            </span>
          </div>
        ) : (
          <span className="text-[9px] uppercase tracking-[0.18em] text-white/30">
            Last {historyDays} days
          </span>
        )}
      </div>

      {body}
    </>
  )
}

/* =========================================================
   UNIT INTEREST (Supabase: Realtime for LIVE, RPC for history)
   Mirrors FloorInterest above — same periods, live window, day window,
   page size and pagination — reading unit_selection_events instead of
   floor_plan_events.
========================================================= */

const UnitInterest = () => {
  const [period, setPeriod] = useState('live')
  const [page, setPage] = useState(0)

  /* ---------- LIVE: last 30 minutes + Realtime INSERTs ---------- */

  const [events, setEvents] = useState([])
  const [status, setStatus] = useState('connecting') // connecting | live | error
  const [liveLoaded, setLiveLoaded] = useState(false)
  const [liveError, setLiveError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false

    const addRows = (incoming) =>
      setEvents((prev) => {
        const seen = new Set(prev.map((e) => e.id))
        const fresh = incoming.filter((e) => !seen.has(e.id))
        return fresh.length ? [...prev, ...fresh] : prev
      })

    // Subscribe first, then fetch, so nothing inserted in between is missed.
    const channel = supabase
      .channel('unit-selection-events-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'unit_selection_events' },
        (payload) => {
          const row = payload.new
          if (!row?.id || !row.unit_name) return
          addRows([row])
        }
      )
      .subscribe((state) => {
        if (cancelled) return
        if (state === 'SUBSCRIBED') setStatus('live')
        else if (
          state === 'CHANNEL_ERROR' ||
          state === 'TIMED_OUT' ||
          state === 'CLOSED'
        )
          setStatus('error')
      })

    const since = new Date(Date.now() - LIVE_WINDOW_MS).toISOString()

    supabase
      .from('unit_selection_events')
      .select('id, unit_id, unit_name, visitor_id, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setLiveError(error.message)
        } else {
          setLiveError('')
          addRows(data || [])
        }
        setLiveLoaded(true)
      })

    // Re-evaluate the 30-minute window so old rows age out on their own.
    const tick = setInterval(() => setNow(Date.now()), 15000)

    return () => {
      cancelled = true
      clearInterval(tick)
      supabase.removeChannel(channel)
    }
  }, [])

  const liveRows = useMemo(() => {
    const cutoff = now - LIVE_WINDOW_MS
    const byUnit = new Map()

    events.forEach((e) => {
      const at = new Date(e.created_at).getTime()
      if (!Number.isFinite(at) || at < cutoff) return
      const item = byUnit.get(e.unit_name) || {
        unit: e.unit_name,
        selections: 0,
        visitors: new Set(),
        last: 0,
      }
      item.selections += 1
      item.visitors.add(e.visitor_id)
      item.last = Math.max(item.last, at)
      byUnit.set(e.unit_name, item)
    })

    return [...byUnit.values()]
      .map((r) => ({
        unit: r.unit,
        selections: r.selections,
        users: r.visitors.size,
        last: r.last,
      }))
      .sort((a, b) => b.selections - a.selections || b.last - a.last)
  }, [events, now])

  /* ---------- 7 / 30 / 90 DAYS: aggregated in Postgres ---------- */

  const [history, setHistory] = useState({ period: null, rows: [], error: '' })
  const historyDays = PERIODS.find((p) => p.key === period)?.days

  useEffect(() => {
    if (!historyDays) return undefined
    let cancelled = false

    const since = new Date(Date.now() - historyDays * DAY_MS).toISOString()

    supabase
      .rpc('unit_selection_summary', { since })
      .then(({ data, error }) => {
        if (cancelled) return
        setHistory({
          period,
          error: error ? error.message : '',
          rows: (data || []).map((r) => ({
            unit: r.unit_name,
            selections: Number(r.selections),
            users: Number(r.users),
            last: new Date(r.last_selected).getTime(),
          })),
        })
      })

    return () => {
      cancelled = true
    }
  }, [period, historyDays])

  /* ---------- Resolve what the UI shows ---------- */

  const isLive = period === 'live'
  const rows = isLive ? liveRows : history.rows
  const loaded = isLive ? liveLoaded : history.period === period
  const error = isLive ? liveError : history.error
  const formatLast = isLive ? formatTime : formatDateTime
  const maxSelections = Math.max(...rows.map((r) => r.selections), 1)
  const chartRows = rows.slice(0, 10)

  // Live rows can shrink as they age out, so clamp rather than trust `page`.
  const totalPages = Math.max(1, Math.ceil(rows.length / FLOOR_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const pageStart = currentPage * FLOOR_PAGE_SIZE
  const pageRows = rows.slice(pageStart, pageStart + FLOOR_PAGE_SIZE)

  const emptyText = isLive
    ? 'No unit selections in the last 30 minutes'
    : `No unit selections in the last ${historyDays} days`

  let body
  if (!loaded) {
    body = (
      <div className="py-8 text-center text-[9px] uppercase tracking-[0.2em] text-white/25">
        Loading unit data...
      </div>
    )
  } else if (error) {
    body = (
      <div className="py-8 text-center text-[9px] uppercase tracking-[0.2em] text-red-300/60">
        Unable to load unit data
      </div>
    )
  } else if (!rows.length) {
    body = (
      <div className="py-8 text-center text-[9px] uppercase tracking-[0.2em] text-white/25">
        {emptyText}
      </div>
    )
  } else {
    body = (
      <div className="space-y-12">
        {/* chart */}
        <div className="grid gap-x-12 gap-y-4 md:grid-cols-2">
          {chartRows.map((row) => (
            <div key={row.unit}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] text-white/60">
                  {row.unit}
                </span>

                <span className="text-[10px] text-white/30">
                  {formatNumber(row.selections)}
                </span>
              </div>

              <div className="h-2 border border-white/[0.06]">
                <div
                  className="h-full bg-[#b79b68]/40 transition-all duration-700"
                  style={{
                    width: `${(row.selections / maxSelections) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* table */}
        <div>
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="border-b border-white/[0.07] text-[8px] uppercase tracking-[0.12em] text-white/30 sm:text-[9px] sm:tracking-[0.15em]">
                <th className="w-[30%] pb-4 font-normal sm:w-auto">Unit</th>
                <th className="w-[24%] pb-4 text-right font-normal sm:w-[16%]">Selections</th>
                <th className="w-[16%] pb-4 text-right font-normal sm:w-[14%]">Users</th>
                <th className="w-[30%] pb-4 text-right font-normal sm:w-[26%]">Last selected</th>
              </tr>
            </thead>

            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={row.unit}
                  className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02] last:border-0"
                >
                  <td className="py-4 text-[11px] text-white/70 sm:py-5 sm:text-[12px]">
                    {row.unit}
                  </td>
                  <td className="py-4 text-right font-serif text-base font-light text-[#eee8dc] sm:py-5 sm:text-xl">
                    {formatNumber(row.selections)}
                  </td>
                  <td className="py-4 text-right text-[11px] text-[#b79b68] sm:py-5 sm:text-[12px]">
                    {formatNumber(row.users)}
                  </td>
                  <td className="py-4 text-right text-[10px] leading-snug text-white/35 sm:py-5 sm:text-[11px]">
                    {Number.isFinite(row.last) ? formatLast(row.last) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="mt-6 flex flex-col gap-4 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[9px] uppercase tracking-[0.18em] text-white/30">
                {pageStart + 1}–{Math.min(pageStart + FLOOR_PAGE_SIZE, rows.length)} of {rows.length} units
              </span>

              <nav
                aria-label="Unit pages"
                className="flex flex-wrap items-center gap-1"
              >
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                  className="px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-white/45 transition-colors hover:text-[#b79b68] disabled:cursor-default disabled:text-white/15 disabled:hover:text-white/15"
                >
                  Previous
                </button>

                {pageWindow(currentPage, totalPages).map((p, i) =>
                  p === null ? (
                    <span key={`gap-${i}`} className="px-1 text-[10px] text-white/20">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      aria-current={p === currentPage ? 'page' : undefined}
                      onClick={() => setPage(p)}
                      className={`h-8 min-w-8 border px-2 text-[10px] transition-colors ${
                        p === currentPage
                          ? 'border-[#b79b68]/40 bg-[#b79b68]/10 text-[#b79b68]'
                          : 'border-transparent text-white/40 hover:text-white/70'
                      }`}
                    >
                      {p + 1}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPage(currentPage + 1)}
                  className="px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-white/45 transition-colors hover:text-[#b79b68] disabled:cursor-default disabled:text-white/15 disabled:hover:text-white/15"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex border border-white/[0.08]">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                setPeriod(p.key)
                setPage(0)
              }}
              className={`px-4 py-2 text-[9px] uppercase tracking-[0.18em] transition-colors ${
                period === p.key
                  ? 'bg-[#b79b68]/15 text-[#b79b68]'
                  : 'text-white/35 hover:text-white/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {isLive ? (
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === 'live'
                  ? 'bg-emerald-400'
                  : status === 'error'
                    ? 'bg-red-400'
                    : 'bg-white/30'
              }`}
            />
            <span
              className={
                status === 'live'
                  ? 'text-emerald-300/80'
                  : status === 'error'
                    ? 'text-red-300/70'
                    : 'text-white/30'
              }
            >
              {status === 'live'
                ? 'Live — last 30 minutes'
                : status === 'error'
                  ? 'Live updates disconnected'
                  : 'Connecting'}
            </span>
          </div>
        ) : (
          <span className="text-[9px] uppercase tracking-[0.18em] text-white/30">
            Last {historyDays} days
          </span>
        )}
      </div>

      {body}
    </>
  )
}

/* =========================================================
   ANALYTICS DASHBOARD
========================================================= */

const AdminDashboard = () => {
  const [range, setRange] = useState('7 days')

  const [gaData, setGaData] = useState(null)
  const [gaLoading, setGaLoading] = useState(true)
  const [gaError, setGaError] = useState('')

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  /* =======================================================
     LOAD GA4 DATA
  ======================================================= */

  // Resolves to the state the GA panel should show; never rejects, so a
  // network failure can't leave the panel stuck on "Loading".
  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ga4-analytics', { body: {} })
      if (error) {
        console.error('GA4 FUNCTION ERROR:', error)
        return { data: null, error: error.message || 'Unable to load GA4 analytics' }
      }
      if (!data?.success) {
        return { data: null, error: data?.error || 'Google Analytics returned an error' }
      }
      return { data, error: '' }
    } catch (err) {
      console.error('GA4 FUNCTION ERROR:', err)
      return { data: null, error: 'Unable to load GA4 analytics' }
    }
  }

  const applyAnalytics = ({ data, error }) => {
    if (data) setGaData(data)
    setGaError(error)
    setGaLoading(false)
  }

  // Refresh / retry buttons.
  const loadAnalytics = async () => {
    setGaLoading(true)
    setGaError('')
    applyAnalytics(await fetchAnalytics())
  }

  // First load: gaLoading already starts true, so only the result is set.
  useEffect(() => {
    let live = true
    fetchAnalytics().then((result) => {
      if (live) applyAnalytics(result)
    })
    return () => {
      live = false
    }
     
  }, [])

  /* =======================================================
     RANGE LABEL
  ======================================================= */

  const rangeLabel = gaLoading
    ? 'Loading'
    : 'Last 30 days'

  /* =======================================================
     OVERVIEW DATA
  ======================================================= */

  const totalUsers = formatNumber(
    getMetric(
      gaData?.data?.overview,
      0
    )
  )

  const sessions = formatNumber(
    getMetric(
      gaData?.data?.overview,
      1
    )
  )

  const pageViews = formatNumber(
    getMetric(
      gaData?.data?.overview,
      2
    )
  )

  const engagement = formatDuration(
    getMetric(
      gaData?.data?.overview,
      3
    )
  )

  /* =======================================================
     REALTIME DATA
  ======================================================= */

  const realtimeRows =
    gaData?.data?.realtime?.rows || []

  const realtimeUsers =
    realtimeRows.reduce(
      (sum, row) =>
        sum +
        Number(
          row.metricValues?.[0]?.value || 0
        ),
      0
    )

  return (
   <main className="fixed inset-0 overflow-y-auto bg-[#0b0a08] text-[#eee8dc] selection:bg-[#b79b68] selection:text-[#0b0a08]">
      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0b0a08]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1600px] items-center justify-between px-6 lg:px-10 2xl:px-14">
          {/* Brand */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center border border-[#b79b68]/50">
                <span className="font-serif text-sm text-[#b79b68]">
                  Z
                </span>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/75">
                  Zenith
                </p>

                <p className="mt-0.5 text-[8px] uppercase tracking-[0.28em] text-white/30">
                  Analytics
                </p>
              </div>
            </div>

            <div className="hidden h-6 w-px bg-white/10 md:block" />

            <p className="hidden text-[9px] uppercase tracking-[0.18em] text-white/25 md:block">
              Runwal Zenith · Thane
            </p>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 border border-white/[0.07] px-3 py-2 sm:flex">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  gaError
                    ? 'bg-red-400'
                    : 'bg-[#7fa66b]'
                }`}
              />

              <span className="text-[9px] uppercase tracking-[0.14em] text-white/45">
                {gaError
                  ? 'Offline'
                  : 'Live'}
              </span>
            </div>

            <button
              type="button"
              onClick={loadAnalytics}
              disabled={gaLoading}
              className="border border-white/[0.08] px-4 py-2 text-[9px] uppercase tracking-[0.15em] text-white/45 transition-colors hover:border-[#b79b68]/40 hover:text-[#b79b68] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {gaLoading
                ? 'Loading'
                : 'Refresh'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="border border-white/[0.08] px-4 py-2 text-[9px] uppercase tracking-[0.15em] text-white/45 transition-colors hover:border-[#b79b68]/40 hover:text-[#b79b68]"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ================================================= */}
      {/* CONTENT                                           */}
      {/* ================================================= */}

      <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10 lg:py-10 2xl:px-14">
        {/* Heading */}
        <section className="mb-10 flex flex-col justify-between gap-6 border-b border-white/[0.07] pb-8 md:flex-row md:items-end">
          <div>
            <p className="mb-4 flex items-center gap-2 text-[9px] uppercase tracking-[0.25em] text-[#b79b68]">
              <span className="h-px w-5 bg-[#b79b68]" />
              01 · Overview
            </p>

            <h1 className="font-serif text-4xl font-light tracking-tight text-[#eee8dc] md:text-5xl">
              Website Analytics
            </h1>

            <p className="mt-3 max-w-xl text-[11px] leading-relaxed tracking-[0.04em] text-white/35">
              A live view of visitor behaviour,
              engagement and performance across
              the Zenith digital experience.
            </p>
          </div>

          {/* Date range */}
          <div className="flex items-center border border-white/[0.08]">
            {[
              '7 days',
              '30 days',
              '90 days',
            ].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                className={[
                  'px-4 py-2.5 text-[9px] uppercase tracking-[0.14em] transition-all',
                  range === item
                    ? 'bg-[#eee8dc] text-[#0b0a08]'
                    : 'text-white/35 hover:text-white/70',
                ].join(' ')}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {/* ================================================= */}
        {/* ERROR                                            */}
        {/* ================================================= */}

        {gaError && (
          <section className="mb-8 border border-red-400/20 bg-red-400/[0.04] p-5">
            <p className="text-[9px] uppercase tracking-[0.25em] text-red-300/60">
              GA4 Connection Error
            </p>

            <p className="mt-2 text-[11px] leading-relaxed text-red-200/70">
              {gaError}
            </p>

            <button
              type="button"
              onClick={loadAnalytics}
              className="mt-4 border border-red-300/20 px-4 py-2 text-[9px] uppercase tracking-[0.15em] text-red-200/60 transition hover:border-red-300/40 hover:text-red-200"
            >
              Try Again
            </button>
          </section>
        )}

        {/* ================================================= */}
        {/* CONNECTION STATUS                                */}
        {/* ================================================= */}

        {gaData?.success && (
          <section className="mb-8 flex items-center gap-3 border border-emerald-400/15 bg-emerald-400/[0.03] px-5 py-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

            <span className="text-[9px] uppercase tracking-[0.18em] text-emerald-300/60">
              GA4 Connected
            </span>

            <span className="hidden text-[9px] text-white/20 sm:block">
              ·
            </span>

            <span className="hidden text-[9px] text-white/20 sm:block">
              Property {gaData.propertyId}
            </span>

            <span className="ml-auto text-[9px] uppercase tracking-[0.12em] text-white/20">
              {rangeLabel}
            </span>
          </section>
        )}

        {/* ================================================= */}
        {/* REALTIME                                        */}
        {/* ================================================= */}

        <section className="mb-8 border border-white/[0.07] bg-[#11100e] p-5 md:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                Realtime
              </p>

              <h2 className="mt-2 font-serif text-2xl font-light text-[#eee8dc]">
                Visitors right now
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

              <span className="font-serif text-3xl font-light text-[#eee8dc]">
                {gaLoading
                  ? '—'
                  : formatNumber(
                      realtimeUsers
                    )}
              </span>
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* STAT CARDS                                        */}
        {/* ================================================= */}

        <section className="grid grid-cols-1 gap-px bg-white/[0.06] sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total users"
            value={
              gaLoading
                ? '—'
                : totalUsers
            }
            description="Last 30 days"
          />

          <StatCard
            label="Sessions"
            value={
              gaLoading
                ? '—'
                : sessions
            }
            description="Last 30 days"
          />

          <StatCard
            label="Page views"
            value={
              gaLoading
                ? '—'
                : pageViews
            }
            description="Total pages viewed"
          />

          <StatCard
            label="Engagement"
            value={
              gaLoading
                ? '—'
                : engagement
            }
            description="Total engagement time"
          />
        </section>

        {/* ================================================= */}
        {/* MAIN ANALYTICS                                    */}
        {/* ================================================= */}

        <section className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
          {/* Visitors */}
          <div className="border border-white/[0.07] bg-[#11100e] p-5 md:p-7">
            <div className="mb-8 flex items-start justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                  Traffic
                </p>

                <h2 className="mt-2 font-serif text-2xl font-light text-[#eee8dc]">
                  Visitors over time
                </h2>
              </div>

              <span className="text-[9px] uppercase tracking-[0.15em] text-[#b79b68]">
                30 days
              </span>
            </div>

            <p className="mb-6 text-[10px] leading-relaxed text-white/25">
              Historical visitor data may be delayed. Realtime visitors are
              shown separately above.
            </p>

            <VisitorsChart
              report={gaData?.data?.daily}
              loading={gaLoading}
            />
          </div>

          {/* Traffic sources */}
          <div className="border border-white/[0.07] bg-[#11100e] p-5 md:p-7">
            <div className="mb-8">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                Acquisition
              </p>

              <h2 className="mt-2 font-serif text-2xl font-light text-[#eee8dc]">
                Traffic sources
              </h2>
            </div>

            <TrafficSources
              report={gaData?.data?.traffic}
              loading={gaLoading}
            />
          </div>
        </section>

        {/* ================================================= */}
        {/* SECOND ROW                                       */}
        {/* ================================================= */}

        <section className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Top pages */}
          <div className="border border-white/[0.07] bg-[#11100e] p-5 md:p-7">
            <div className="mb-7">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                Content
              </p>

              <h2 className="mt-2 font-serif text-2xl font-light">
                Most viewed pages
              </h2>
            </div>

            <PagesList
              report={gaData?.data?.pages}
              loading={gaLoading}
            />
          </div>

          {/* Devices */}
          <div className="border border-white/[0.07] bg-[#11100e] p-5 md:p-7">
            <div className="mb-7">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                Technology
              </p>

              <h2 className="mt-2 font-serif text-2xl font-light">
                Devices
              </h2>
            </div>

            <DevicesList
              report={gaData?.data?.devices}
              loading={gaLoading}
            />
          </div>
        </section>

        {/* ================================================= */}
        {/* LOCATIONS                                        */}
        {/* ================================================= */}

        <section className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Countries */}
          <div className="border border-white/[0.07] bg-[#11100e] p-5 md:p-7">
            <div className="mb-7">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                Geography
              </p>

              <h2 className="mt-2 font-serif text-2xl font-light">
                Visitor countries
              </h2>
            </div>

            {gaLoading ? (
              <div className="py-8 text-center text-[9px] uppercase tracking-[0.2em] text-white/25">
                Loading countries...
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {(gaData?.data?.countries?.rows ||
                  [])
                  .slice(0, 8)
                  .map((row, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-4"
                    >
                      <span className="text-[11px] text-white/60">
                        {row
                          .dimensionValues?.[0]
                          ?.value || 'Unknown'}
                      </span>

                      <span className="text-[10px] text-[#b79b68]">
                        {formatNumber(
                          row.metricValues?.[0]
                            ?.value || 0
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Cities */}
          <div className="border border-white/[0.07] bg-[#11100e] p-5 md:p-7">
            <div className="mb-7">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                Geography
              </p>

              <h2 className="mt-2 font-serif text-2xl font-light">
                Visitor cities
              </h2>
            </div>

            {gaLoading ? (
              <div className="py-8 text-center text-[9px] uppercase tracking-[0.2em] text-white/25">
                Loading cities...
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {(gaData?.data?.cities?.rows ||
                  [])
                  .slice(0, 8)
                  .map((row, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-4"
                    >
                      <span className="text-[11px] text-white/60">
                        {row
                          .dimensionValues?.[0]
                          ?.value || 'Unknown'}
                      </span>

                      <span className="text-[10px] text-[#b79b68]">
                        {formatNumber(
                          row.metricValues?.[0]
                            ?.value || 0
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>

        {/* ================================================= */}
        {/* LANDING PAGES                                    */}
        {/* ================================================= */}

        <section className="mt-8 border border-white/[0.07] bg-[#11100e] p-5 md:p-7">
          <div className="mb-7">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
              Acquisition
            </p>

            <h2 className="mt-2 font-serif text-2xl font-light">
              Landing pages
            </h2>
          </div>

          {gaLoading ? (
            <div className="py-8 text-center text-[9px] uppercase tracking-[0.2em] text-white/25">
              Loading landing pages...
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {(gaData?.data?.landingPages
                ?.rows || [])
                .slice(0, 8)
                .map((row, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-5 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="w-4 text-[9px] text-white/20">
                        {String(index + 1).padStart(
                          2,
                          '0'
                        )}
                      </span>

                      <span className="truncate text-[11px] text-white/60">
                        {row
                          .dimensionValues?.[0]
                          ?.value || '/'}
                      </span>
                    </div>

                    <span className="shrink-0 text-[10px] text-[#b79b68]">
                      {formatNumber(
                        row.metricValues?.[0]
                          ?.value || 0
                      )}{' '}
                      sessions
                    </span>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* USER ACTIONS                                     */}
        {/* ================================================= */}

        <section className="mt-8 border border-white/[0.07] bg-[#11100e] p-5 md:p-7">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                Interactions
              </p>

              <h2 className="mt-2 font-serif text-2xl font-light">
                User actions
              </h2>
            </div>

            <span className="hidden text-[9px] uppercase tracking-[0.15em] text-white/20 sm:block">
              GA4 events
            </span>
          </div>

          <UserActions
            report={gaData?.data?.events}
            loading={gaLoading}
          />
        </section>

        {/* ================================================= */}
        {/* FLOOR PLAN ANALYTICS                             */}
        {/* ================================================= */}

        <section className="mt-8 border border-white/[0.07] bg-[#11100e] p-5 md:p-7">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                Floor plan analytics
              </p>

              <h2 className="mt-2 font-serif text-2xl font-light">
                Floor Interest
              </h2>

              <p className="mt-2 text-[11px] text-white/35">
                Floors selected by visitors
              </p>
            </div>

            <span className="hidden text-[9px] uppercase tracking-[0.15em] text-white/20 sm:block">
              floor_plan_select
            </span>
          </div>

          <FloorInterest />
        </section>

        {/* ================================================= */}
        {/* UNIT SELECTION ANALYTICS                         */}
        {/* ================================================= */}

        <section className="mt-8 border border-white/[0.07] bg-[#11100e] p-5 md:p-7">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                Unit selection analytics
              </p>

              <h2 className="mt-2 font-serif text-2xl font-light">
                Unit Interest
              </h2>

              <p className="mt-2 text-[11px] text-white/35">
                Residences selected by visitors on Search by unit
              </p>
            </div>

            <span className="hidden text-[9px] uppercase tracking-[0.15em] text-white/20 sm:block">
              unit_select
            </span>
          </div>

          <UnitInterest />
        </section>

        {/* ================================================= */}
        {/* WEBSITE INTERACTION HEATMAP                      */}
        {/* ================================================= */}

        <section className="mt-8 border border-white/[0.07] bg-[#11100e] p-5 md:p-7">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                Interaction heatmap
              </p>

              <h2 className="mt-2 font-serif text-2xl font-light">
                Heatmap
              </h2>

              <p className="mt-2 text-[11px] text-white/35">
                Where visitors click across the website
              </p>
            </div>

            <span className="hidden text-[9px] uppercase tracking-[0.15em] text-white/20 sm:block">
              Supabase
            </span>
          </div>

          <Heatmap />
        </section>

        {/* ================================================= */}
        {/* VISITOR LOCATION / PROFILE                       */}
        {/* ================================================= */}

        <section className="mt-8 border border-white/[0.07] bg-[#11100e] p-5 md:p-7">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                Visitor analytics
              </p>

              <h2 className="mt-2 font-serif text-2xl font-light">
                Visitor Location
              </h2>

              <p className="mt-2 text-[11px] text-white/35">
                Where visitors are from, their device, and what they're looking at
              </p>
            </div>

            <span className="hidden text-[9px] uppercase tracking-[0.15em] text-white/20 sm:block">
              Supabase
            </span>
          </div>

          <VisitorLocation />
        </section>

        {/* ================================================= */}
        {/* LOCATION MAP                                     */}
        {/* ================================================= */}

        <section className="mt-8 border border-white/[0.07] bg-[#11100e] p-5 md:p-7">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                Visitor analytics
              </p>

              <h2 className="mt-2 font-serif text-2xl font-light">
                Location Map
              </h2>

              <p className="mt-2 text-[11px] text-white/35">
                Approximate visitor concentration by area — last 30 days
              </p>
            </div>
          </div>

          <VisitorMap />
        </section>

        {/* ================================================= */}
        {/* RAW API STATUS                                  */}
        {/* ================================================= */}

        {gaData?.success && (
          <section className="mt-8 border border-white/[0.07] bg-[#11100e] p-5 md:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                  Data connection
                </p>

                <p className="mt-2 text-[11px] text-white/45">
                  Google Analytics Data API
                  successfully connected.
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-[8px] uppercase tracking-[0.15em] text-white/20">
                  Property ID
                </p>

                <p className="mt-1 text-[10px] text-[#b79b68]">
                  {gaData.propertyId}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ================================================= */}
        {/* FOOTER                                           */}
        {/* ================================================= */}

        <footer className="mt-12 flex flex-col justify-between gap-3 border-t border-white/[0.07] py-6 text-[8px] uppercase tracking-[0.16em] text-white/20 sm:flex-row">
          <span>
            Zenith Analytics
          </span>

          <span>
            Powered by BrainWing Innovation
          </span>
        </footer>
      </div>
    </main>
  )
}

/* =========================================================
   AUTHENTICATION WRAPPER
========================================================= */

const Admin = () => {
  if (!supabaseConfigured) return <AdminNotConfigured />
  return <AdminAuthGate />
}

/** Shown instead of a login that could never succeed. */
const AdminNotConfigured = () => (
  <main className="flex min-h-screen items-center justify-center bg-[#0b0a08] px-6 text-center text-[#f3f0ea]">
    <div className="max-w-md">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#a8a297]">Admin unavailable</p>
      <p className="mt-3 text-[15px] leading-relaxed">
        This build has no Supabase connection. Set VITE_SUPABASE_URL and
        VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example) and rebuild.
      </p>
    </div>
  </main>
)

const AdminAuthGate = () => {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setSession(session)
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  /* Loading / checking authentication */
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[#0b0a08]" />
    )
  }

  /* Not authenticated */
  if (!session) {
    return <AdminLogin />
  }

  /* Authenticated */
  return <AdminDashboard />
}

export default Admin