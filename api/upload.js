import { hostSheet, isSheetTokenRequest, issueSheetUploadToken } from './hostSheet.js'

/**
 * The only backend this app needs for sharing: get the visitor's generated
 * PDF to a public URL so a QR code can point at it. No messaging APIs — the
 * visitor's own phone does the rest once it scans the code.
 *
 * Normally this only issues an upload token and the browser sends the PDF
 * straight to Blob storage (see hostSheet.js for why). The base64 branch is
 * kept for tabs still running the previous build.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const body = req.body ?? {}

  if (isSheetTokenRequest(body)) {
    try {
      res.status(200).json(await issueSheetUploadToken(body, req))
    } catch (err) {
      console.error('Refused a sheet upload token', err)
      res.status(400).json({ error: 'Could not authorise the upload' })
    }
    return
  }

  const { filename, pdfBase64 } = body
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
