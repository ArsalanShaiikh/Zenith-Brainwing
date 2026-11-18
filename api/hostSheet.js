import { put } from '@vercel/blob'
import { handleUpload } from '@vercel/blob/client'

/**
 * Hosting for the visitor's selection sheet, so a QR code can point at it.
 * Shared by the production serverless handler (api/upload.js) and the Vite
 * dev-server middleware (vite.config.js), so `npm run dev` works without
 * `vercel dev`.
 *
 * WHY TWO PATHS
 * Vercel functions refuse request bodies over 4.5 MB. A sheet travelling
 * through the function as base64 crossed that at roughly 7–10 marked items
 * (measured: 6 items 3.7 MB, all 10 plans 4.2 MB, everything 20 MB), and the
 * visitor got "The sheet was rejected by the host". So the browser now
 * uploads the PDF straight to Blob storage, and the function only issues a
 * short-lived token that allows exactly one thing: a PDF named like a Zenith
 * selection sheet, under MAX_SHEET_BYTES. The PDF never passes through the
 * function, so its size no longer matters.
 *
 * `hostSheet` (the old base64 path) stays so a tab still running the previous
 * build during a deploy keeps working. Nothing new calls it.
 */

/** What lib/preferencePdf.js `sheetFilename` produces, and nothing else. */
const SHEET_NAME = /^Runwal-Zenith-Selection(-[A-Za-z0-9-]+)?\.pdf$/
const MAX_SHEET_BYTES = 50 * 1024 * 1024
const TOKEN_LIFETIME_MS = 10 * 60 * 1000

/** Body shape `upload()` from @vercel/blob/client posts to ask for a token. */
export const isSheetTokenRequest = (body) => body?.type === 'blob.generate-client-token'

/** Issues the one-off upload token. Throws for anything that isn't a sheet. */
export const issueSheetUploadToken = (body, request) =>
  handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname) => {
      if (!SHEET_NAME.test(pathname)) throw new Error('Not a selection sheet')
      return {
        allowedContentTypes: ['application/pdf'],
        maximumSizeInBytes: MAX_SHEET_BYTES,
        addRandomSuffix: true,
        validUntil: Date.now() + TOKEN_LIFETIME_MS,
      }
    },
    // No onUploadCompleted: the browser already has the URL when its upload
    // finishes, and a callback can't reach localhost in dev anyway.
  })

/** Legacy: the PDF arrives as base64 in the request body (≤ 4.5 MB). */
export const hostSheet = async ({ filename, pdfBase64 }) => {
  const bytes = Buffer.from(pdfBase64, 'base64')
  const blob = await put(filename, bytes, {
    access: 'public',
    contentType: 'application/pdf',
    addRandomSuffix: true,
  })
  return blob.downloadUrl
}
