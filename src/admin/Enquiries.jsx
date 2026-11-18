import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Leads from the site's Enquire form (table `enquiries`, readable only by a
 * signed-in admin — see supabase/migrations/20261118120000_enquiries.sql).
 * Newest first, live: a new submission appears without a refresh.
 */

const LIMIT = 200

const when = (iso) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

const Enquiries = () => {
  const [rows, setRows] = useState([])
  const [state, setState] = useState('loading') // loading | ready | missing | error

  const fetchRows = useCallback(async () => {
    const { data, error } = await supabase
      .from('enquiries')
      .select('id, created_at, name, phone, email, config')
      .order('created_at', { ascending: false })
      .limit(LIMIT)
    if (error) {
      // PGRST205 / 42P01: the table hasn't been created yet.
      const missing = error.code === 'PGRST205' || error.code === '42P01'
      return { rows: [], state: missing ? 'missing' : 'error' }
    }
    return { rows: data ?? [], state: 'ready' }
  }, [])

  const load = useCallback(async () => {
    setState('loading')
    const r = await fetchRows()
    setRows(r.rows)
    setState(r.state)
  }, [fetchRows])

  useEffect(() => {
    let live = true
    fetchRows().then((r) => {
      if (!live) return
      setRows(r.rows)
      setState(r.state)
    })
    const channel = supabase
      .channel('enquiries-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'enquiries' }, ({ new: row }) => {
        setRows((prev) => (prev.some((p) => p.id === row.id) ? prev : [row, ...prev].slice(0, LIMIT)))
      })
      .subscribe()
    return () => {
      live = false
      supabase.removeChannel(channel)
    }
  }, [fetchRows])

  if (state === 'loading') return <p className="text-[12px] text-white/35">Loading enquiries…</p>
  if (state === 'missing')
    return (
      <p className="text-[12px] leading-relaxed text-white/45">
        The enquiries table hasn&apos;t been created yet. Run
        supabase/migrations/20261118120000_enquiries.sql in the Supabase SQL editor. Until then,
        enquiries are kept on the device they were made on and sent once it exists.
      </p>
    )
  if (state === 'error')
    return (
      <p className="text-[12px] text-white/45">
        Couldn&apos;t load enquiries.{' '}
        <button type="button" onClick={load} className="underline underline-offset-2 hover:text-white">
          Retry
        </button>
      </p>
    )
  if (!rows.length) return <p className="text-[12px] text-white/35">No enquiries yet.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-[12px]">
        <thead>
          <tr className="text-[9px] uppercase tracking-[0.15em] text-white/30">
            {['Received', 'Name', 'Phone', 'Email', 'Configuration'].map((h) => (
              <th key={h} className="border-b border-white/[0.07] py-2 pr-4 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-white/[0.04] text-white/75">
              <td className="whitespace-nowrap py-2.5 pr-4 text-white/40">{when(r.created_at)}</td>
              <td className="py-2.5 pr-4">{r.name}</td>
              <td className="whitespace-nowrap py-2.5 pr-4">
                {r.phone ? <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} className="hover:text-white">{r.phone}</a> : '—'}
              </td>
              <td className="py-2.5 pr-4">
                {r.email ? <a href={`mailto:${r.email}`} className="hover:text-white">{r.email}</a> : '—'}
              </td>
              <td className="py-2.5 pr-4 text-white/50">{r.config || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Enquiries
