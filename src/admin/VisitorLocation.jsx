import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MiniBar } from './Admin'

/* =========================================================
   VISITOR LOCATION / PROFILE
   No LIVE mode here — unlike a floor or unit click, a visitor's location and
   device don't meaningfully change second to second, so this only offers
   7/30/90-day windows via plain Supabase queries/RPCs (no Realtime).
========================================================= */

const DAY_MS = 24 * 60 * 60 * 1000

const PERIODS = [
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: '90d', label: '90 Days', days: 90 },
]

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN')

const DEVICE_ORDER = ['desktop', 'mobile', 'tablet']
const BROWSER_ORDER = ['Chrome', 'Safari', 'Edge', 'Firefox', 'Other']
const OS_ORDER = ['Windows', 'Android', 'iOS', 'macOS', 'Linux', 'Other']

/** Sorts known categories first (in a fixed, sensible order) then anything
 *  else by count, so "Other" doesn't jump around the list run to run. */
const orderedBreakdown = (rows, order) => {
  const byValue = new Map(rows.map((r) => [r.value, r.visitors]))
  const known = order.filter((v) => byValue.has(v)).map((v) => ({ value: v, visitors: byValue.get(v) }))
  const rest = rows
    .filter((r) => !order.includes(r.value))
    .sort((a, b) => b.visitors - a.visitors)
  return [...known, ...rest]
}

const VisitorLocation = () => {
  const [period, setPeriod] = useState('30d')
  const [state, setState] = useState({ period: null, error: '', totalVisitors: 0, areas: [], profile: [], interest: [] })

  const historyDays = PERIODS.find((p) => p.key === period)?.days

  useEffect(() => {
    let cancelled = false
    const since = new Date(Date.now() - historyDays * DAY_MS).toISOString()

    Promise.all([
      supabase.from('visitor_locations').select('visitor_id', { count: 'exact', head: true }).gte('last_seen', since),
      supabase.rpc('visitor_area_summary', { since }),
      supabase.rpc('visitor_profile_summary', { since }),
      supabase.rpc('visitor_interest_by_locality', { since }),
    ]).then(([totalRes, areasRes, profileRes, interestRes]) => {
      if (cancelled) return

      const error =
        totalRes.error?.message ||
        areasRes.error?.message ||
        profileRes.error?.message ||
        interestRes.error?.message ||
        ''

      setState({
        period,
        error,
        totalVisitors: totalRes.count || 0,
        areas: areasRes.data || [],
        profile: profileRes.data || [],
        interest: interestRes.data || [],
      })
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, historyDays])

  const loaded = state.period === period
  const totalAreaVisitors = useMemo(
    () => state.areas.reduce((sum, a) => sum + Number(a.visitors || 0), 0),
    [state.areas]
  )

  const profileByDimension = useMemo(() => {
    const grouped = { device: [], browser: [], os: [] }
    state.profile.forEach((r) => {
      if (grouped[r.dimension]) grouped[r.dimension].push({ value: r.value, visitors: Number(r.visitors || 0) })
    })
    const toPct = (rows) => {
      const total = rows.reduce((sum, r) => sum + r.visitors, 0) || 1
      return rows.map((r) => ({ ...r, pct: Math.round((r.visitors / total) * 100) }))
    }
    return {
      device: toPct(orderedBreakdown(grouped.device, DEVICE_ORDER)),
      browser: toPct(orderedBreakdown(grouped.browser, BROWSER_ORDER)),
      os: toPct(orderedBreakdown(grouped.os, OS_ORDER)),
    }
  }, [state.profile])

  const interestByArea = useMemo(() => {
    const byArea = new Map()
    state.interest.forEach((r) => {
      const list = byArea.get(r.area) || []
      list.push({ label: r.interaction, selections: Number(r.selections || 0) })
      byArea.set(r.area, list)
    })
    return [...byArea.entries()]
      .map(([area, items]) => ({
        area,
        items: items.sort((a, b) => b.selections - a.selections).slice(0, 5),
        total: items.reduce((sum, i) => sum + i.selections, 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [state.interest])

  const deviceLabel = { desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet' }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

        <span className="text-[9px] uppercase tracking-[0.18em] text-white/30">
          Last {historyDays} days
        </span>
      </div>

      {!loaded ? (
        <div className="py-8 text-center text-[9px] uppercase tracking-[0.2em] text-white/25">
          Loading visitor data...
        </div>
      ) : state.error ? (
        <div className="py-8 text-center text-[9px] uppercase tracking-[0.2em] text-red-300/60">
          Unable to load visitor data
        </div>
      ) : (
        <>
          {/* Total visitors + top areas */}
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">Total visitors</p>
            <p className="mt-2 font-serif text-3xl font-light text-[#eee8dc]">
              {formatNumber(state.totalVisitors)}
            </p>

            {state.areas.length > 0 ? (
              <div className="mt-8 space-y-4">
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">Top areas</p>
                {state.areas.slice(0, 8).map((a) => {
                  const pct = totalAreaVisitors
                    ? Math.round((Number(a.visitors) / totalAreaVisitors) * 100)
                    : 0
                  return <MiniBar key={a.area} label={a.area} value={pct} />
                })}
              </div>
            ) : (
              <p className="mt-8 text-[9px] uppercase tracking-[0.2em] text-white/20">
                No location data yet
              </p>
            )}
          </div>

          {/* Device / browser / OS */}
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="space-y-4">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">Device</p>
              {profileByDimension.device.length ? (
                profileByDimension.device.map((r) => (
                  <MiniBar key={r.value} label={deviceLabel[r.value] || r.value} value={r.pct} />
                ))
              ) : (
                <p className="text-[9px] uppercase tracking-[0.18em] text-white/20">No data yet</p>
              )}
            </div>
            <div className="space-y-4">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">Browser</p>
              {profileByDimension.browser.length ? (
                profileByDimension.browser.map((r) => (
                  <MiniBar key={r.value} label={r.value} value={r.pct} />
                ))
              ) : (
                <p className="text-[9px] uppercase tracking-[0.18em] text-white/20">No data yet</p>
              )}
            </div>
            <div className="space-y-4">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">OS</p>
              {profileByDimension.os.length ? (
                profileByDimension.os.map((r) => (
                  <MiniBar key={r.value} label={r.value} value={r.pct} />
                ))
              ) : (
                <p className="text-[9px] uppercase tracking-[0.18em] text-white/20">No data yet</p>
              )}
            </div>
          </div>

          {/* What each area is interested in */}
          {interestByArea.length > 0 && (
            <div>
              <p className="mb-5 text-[9px] uppercase tracking-[0.2em] text-white/30">
                Interest by area
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {interestByArea.map((a) => (
                  <div key={a.area} className="border border-white/[0.06] p-4">
                    <p className="text-[11px] text-white/70">{a.area}</p>
                    <div className="mt-3 space-y-1.5">
                      {a.items.map((i) => (
                        <div
                          key={i.label}
                          className="flex items-center justify-between text-[10px]"
                        >
                          <span className="text-white/40">{i.label}</span>
                          <span className="text-[#b79b68]">{formatNumber(i.selections)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default VisitorLocation
