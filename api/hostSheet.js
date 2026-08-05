import { put } from '@vercel/blob'

/**
 * Hosts the sheet at a public URL so a QR code can point at it. Shared by the
 * production serverless handler (api/upload.js) and the Vite dev-server
 * middleware (vite.config.js), so `npm run dev` on :5173 doesn't need
 * `vercel dev` running separately just to test the QR flow.
 */
export const hostSheet = async ({ filename, pdfBase64 }) => {
  const bytes = Buffer.from(pdfBase64, 'base64')
  const blob = await put(filename, bytes, {
    access: 'public',
    contentType: 'application/pdf',
    addRandomSuffix: true,
  })
  return blob.downloadUrl
}
