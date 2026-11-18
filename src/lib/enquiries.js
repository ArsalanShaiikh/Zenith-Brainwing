import { supabase, supabaseConfigured } from './supabase'

/**
 * Enquire-form leads. Saved to Supabase `enquiries` (see
 * supabase/migrations/20261118120000_enquiries.sql); readable only by the
 * /admin login.
 *
 * A lead must never be lost to a bad connection — exhibition Wi-Fi drops,
 * and a kiosk can't ask the visitor to "try again later". So a submit that
 * can't be saved right now is kept in this browser's localStorage and
 * retried on the next load (flushPendingEnquiries, called from App) until
 * it goes through. Either way the visitor sees the same confirmation.
 */

const PENDING_KEY = 'zenith.enquiries.pending'
const VISITOR_ID_KEY = 'zenith_visitor_id'

const visitorId = () => {
  try {
    return sessionStorage.getItem(VISITOR_ID_KEY) || null
  } catch {
    return null
  }
}

const readPending = () => {
  try {
    const v = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

const writePending = (list) => {
  try {
    if (list.length) localStorage.setItem(PENDING_KEY, JSON.stringify(list))
    else localStorage.removeItem(PENDING_KEY)
  } catch {
    /* storage blocked — nothing more we can do on this device */
  }
}

const insert = async (row) => {
  if (!supabaseConfigured) return false
  try {
    const { error } = await supabase.from('enquiries').insert(row)
    if (error) console.warn('enquiry save failed:', error.message)
    return !error
  } catch (err) {
    console.warn('enquiry save failed:', err)
    return false
  }
}

const clean = (v, max) => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s ? s.slice(0, max) : null
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** 7–15 digits once spaces, dashes, dots, brackets and a leading + are dropped. */
export const isPhone = (v) => /^\+?\d{7,15}$/.test(String(v || '').replace(/[\s\-().]/g, ''))

/** What's wrong with the form, field by field; empty object when it can go. */
export const validateEnquiry = ({ name, phone, email }) => {
  const errors = {}
  if (!clean(name, 120)) errors.name = 'Please add your name'
  const p = clean(phone, 40)
  const e = clean(email, 200)
  if (!p && !e) errors.phone = 'A phone number or an email, so we can reach you'
  if (p && !isPhone(p)) errors.phone = 'That phone number doesn’t look right'
  if (e && !EMAIL_RE.test(e)) errors.email = 'That email doesn’t look right'
  return errors
}

/** Saves the lead, or keeps it for a retry. Resolves `{ saved }`; never throws. */
export const submitEnquiry = async ({ name, phone, email, config }) => {
  const row = {
    name: clean(name, 120),
    phone: clean(phone, 40),
    email: clean(email, 200),
    config: clean(config, 60),
    visitor_id: visitorId(),
  }
  const saved = await insert(row)
  if (!saved) writePending([...readPending(), { ...row, queued_at: new Date().toISOString() }])
  return { saved }
}

let flushing = null

/**
 * Retries leads kept from earlier failed submits. Call once per app load.
 * Single-flight (a second call joins the first, so a lead is never sent
 * twice), and it removes only what it actually sent — a lead queued while
 * this runs stays queued.
 */
export const flushPendingEnquiries = () => {
  flushing ??= (async () => {
    const pending = readPending()
    if (!pending.length || !supabaseConfigured) return
    const sent = new Set()
    for (const item of pending) {
      // eslint-disable-next-line no-unused-vars
      const { queued_at, ...row } = item
      if (await insert(row)) sent.add(item.queued_at)
    }
    if (sent.size) writePending(readPending().filter((i) => !sent.has(i.queued_at)))
  })().finally(() => {
    flushing = null
  })
  return flushing
}
