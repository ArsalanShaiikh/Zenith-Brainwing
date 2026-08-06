import { hostSheet } from './hostSheet.js'

/**
 * The only backend this app needs for sharing: host the visitor's generated
 * PDF at a public URL so a QR code can point at it. No messaging APIs, no
 * business verification, no per-message send — the visitor's own phone does
 * the rest once it scans the code.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { filename, pdfBase64 } = req.body ?? {}
  if (!filename || !pdfBase64) {
    res.status(400).json({ error: 'Missing filename or pdfBase64' })
    return
  }

  try {
    const url = await hostSheet({ filename, pdfBase64 })
    res.status(200).json({ url })
  } catch (err) {
    console.error('Could not host the selection sheet', err)
    res.status(500).json({ error: 'Could not host the sheet' })
  }
}
