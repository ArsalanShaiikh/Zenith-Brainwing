import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { VIEWS } from '../lib/views'
import { drawHeatmap } from './heatmapCanvas'

/* =========================================================
   WEBSITE INTERACTION HEATMAP
   Same LIVE/7/30/90 pattern as Floor Interest and Unit Interest, but reading
   raw click coordinates from website_heatmap_events instead of aggregated
   counts — a heatmap needs the actual point cloud to render, not a summary.
========================================================= */

const LIVE_WINDOW_MS = 30 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const FETCH_LIMIT = 5000

const PERIODS = [
  { key: 'live', label: 'Live' },
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: '90d', label: '90 Days', days: 90 },
]

// Derived from the project's actual routes (lib/views.js), not a hard-coded
// label list. Amenities and Floorplan are excluded — reached from the orbit
// menu, they're an in-orbit visual mode rather than a real navigation, so
// clicks made there are recorded under "/" and aren't distinguishable as a
// separate page here. `bgSrc` is a real asset already used by that page —
// the shared hero (public/img/<key>-1440.avif) for most, and the gallery's
// own first render still (public/gallery/g01.jpg — see lib/gallery.js) for
// Gallery, since it has no single fixed hero of its own. "All Pages" mixes
// multiple layouts, so it renders without a background.
const PAGE_OPTIONS = [
  { value: 'all', label: 'All Pages', bgSrc: null },
  { value: '/', label: 'Home', bgSrc: '/img/home-1440.avif' },
  ...VIEWS.filter((v) => v.id !== 'amenities' && v.id !== 'floorplan').map((v) => ({
    value: `/${v.id}`,
    label: v.label,
    bgSrc: `/img/${v.img}-1440.avif`,
  })),
  { value: '/gallery', label: 'Gallery', bgSrc: '/gallery/g01.jpg' },
]

const DEVICE_OPTIONS = [
  { value: 'all', label: 'All Devices' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'mobile', label: 'Mobile' },
]

/** Device category from viewport width — there's no stored device column,
 *  it's derived the same way the rest of the dashboard buckets breakpoints. */
const deviceFor = (vw) => (vw < 640 ? 'mobile' : vw < 1024 ? 'tablet' : 'desktop')

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN')

const Heatmap = () => {
  const [period, setPeriod] = useState('live')
  const [page, setPage] = useState('all')
  const [device, setDevice] = useState('all')

  const isLive = period === 'live'
  const historyDays = PERIODS.find((p) => p.key === period)?.days

  const HEATMAP_SELECT =
    'id, page, event_type, x_percent, y_percent, viewport_width, viewport_height, visitor_id, created_at'

  /* ---------- LIVE: last 30 minutes + Realtime INSERTs ---------- */

  const [liveRows, setLiveRows] = useState([])
  const [status, setStatus] = useState('connecting') // connecting | live | error
  const [liveLoaded, setLiveLoaded] = useState(false)
  const [liveError, setLiveError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false

    const addRows = (incoming) =>
      setLiveRows((prev) => {
        const seen = new Set(prev.map((r) => r.id))
        const fresh = incoming.filter((r) => !seen.has(r.id))
        return fresh.length ? [...prev, ...fresh] : prev
      })

    // Subscribe first, then fetch, so nothing inserted in between is missed.
    const channel = supabase
      .channel('website-heatmap-events-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'website_heatmap_events' },
        (payload) => {
          const row = payload.new
          if (!row?.id) return
          addRows([row])
        }
      )
      .subscribe((state) => {
        if (cancelled) return
        if (state === 'SUBSCRIBED') setStatus('live')
        else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED')
          setStatus('error')
      })

    const since = new Date(Date.now() - LIVE_WINDOW_MS).toISOString()

    supabase
      .from('website_heatmap_events')
      .select(HEATMAP_SELECT)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(FETCH_LIMIT)
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          setLiveError(fetchError.message)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- 7 / 30 / 90 DAYS: plain historical fetch ---------- */

  // The result carries the period it was fetched for, so "loading" is derived
  // (history.period !== period) instead of set synchronously inside the effect.
  const [history, setHistory] = useState({ period: null, rows: [], error: '' })

  useEffect(() => {
    if (!historyDays) return undefined
    let cancelled = false

    const since = new Date(Date.now() - historyDays * DAY_MS).toISOString()

    supabase
      .from('website_heatmap_events')
      .select(HEATMAP_SELECT)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(FETCH_LIMIT)
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        setHistory({ period, error: fetchError ? fetchError.message : '', rows: data || [] })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, historyDays])

  /* ---------- resolve what the UI shows ---------- */

  const rawRows = isLive ? liveRows : history.rows
  const loaded = isLive ? liveLoaded : history.period === period
  const error = isLive ? liveError : history.error

  /* ---------- page / device / rolling-window filter ---------- */

  const filtered = useMemo(() => {
    const cutoff = now - LIVE_WINDOW_MS
    return rawRows.filter((r) => {
      if (isLive) {
        const at = new Date(r.created_at).getTime()
        if (!Number.isFinite(at) || at < cutoff) return false
      }
      if (page !== 'all' && r.page !== page) return false
      if (device !== 'all' && deviceFor(r.viewport_width) !== device) return false
      return true
    })
  }, [rawRows, page, device, isLive, now])

  const totalClicks = filtered.length
  const uniqueUsers = useMemo(
    () => new Set(filtered.map((r) => r.visitor_id)).size,
    [filtered]
  )

  /* ---------- canvas draw ---------- */

  const containerRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const render = () => {
      const rect = container.getBoundingClientRect()
      const w = Math.max(1, Math.round(rect.width))
      const h = Math.max(1, Math.round(rect.height))
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
      drawHeatmap(canvas, filtered)
    }

    render()
    const ro = new ResizeObserver(render)
    ro.observe(container)
    return () => ro.disconnect()
  }, [filtered])

  const activePage = PAGE_OPTIONS.find((p) => p.value === page)
  const bgSrc = activePage?.bgSrc ?? null

  let body
  if (!loaded) {
    body = (
      <div className="flex h-[280px] items-center justify-center text-[9px] uppercase tracking-[0.2em] text-white/25">
        Loading heatmap...
      </div>
    )
  } else if (error) {
    body = (
      <div className="flex h-[280px] items-center justify-center text-[9px] uppercase tracking-[0.2em] text-red-300/60">
        Unable to load heatmap data
      </div>
    )
  } else {
    body = (
      <>
        <div
          ref={containerRef}
          className="relative mt-2 aspect-[16/9] w-full overflow-hidden border border-white/[0.08] bg-[#0b0a08]"
        >
          {bgSrc && (
            <img
              src={bgSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-60"
            />
          )}

          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          {!totalClicks && (
            <div className="absolute inset-0 grid place-items-center text-[9px] uppercase tracking-[0.18em] text-white/20">
              {isLive
                ? 'No clicks in the last 30 minutes'
                : `No clicks in the last ${historyDays} days`}
            </div>
          )}

          {!bgSrc && page !== 'all' && (
            <div className="pointer-events-none absolute bottom-2 left-2 text-[8px] uppercase tracking-[0.14em] text-white/15">
              No preview image for this page
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-2">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">Total clicks</p>
            <p className="mt-1 font-serif text-xl font-light text-[#eee8dc]">
              {formatNumber(totalClicks)}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">Unique users</p>
            <p className="mt-1 font-serif text-xl font-light text-[#b79b68]">
              {formatNumber(uniqueUsers)}
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex border border-white/[0.08]">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
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

      <div className="mb-5 flex flex-wrap items-end gap-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-[9px] uppercase tracking-[0.15em] text-white/30">Page</span>
          <select
            value={page}
            onChange={(e) => setPage(e.target.value)}
            className="border border-white/[0.1] bg-[#0b0a08] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/60 outline-none focus:border-[#b79b68]/40"
          >
            {PAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[9px] uppercase tracking-[0.15em] text-white/30">Device</span>
          <select
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            className="border border-white/[0.1] bg-[#0b0a08] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/60 outline-none focus:border-[#b79b68]/40"
          >
            {DEVICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {body}
    </>
  )
}

export default Heatmap
