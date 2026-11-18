import { upload } from '@vercel/blob/client'

// Above this the upload goes in parts, each retried on its own — kinder to
// exhibition-hall Wi-Fi than one long request that has to start over.
const MULTIPART_FROM_BYTES = 8 * 1024 * 1024

/**
 * Hosts the sheet and hands back a public URL to encode in a QR code. The
 * visitor's own phone fetches it directly — no messaging API sits in between.
 *
 * The PDF goes straight from this browser to Vercel Blob; /api/upload only
 * issues the token. It used to travel through the function as base64, which
 * Vercel caps at 4.5 MB — about 7–10 marked items. See api/hostSheet.js.
 */
export const uploadSheet = async (blob, filename) => {
  try {
    const result = await upload(filename, blob, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      contentType: 'application/pdf',
      multipart: blob.size > MULTIPART_FROM_BYTES,
    })
    return result.downloadUrl
  } catch (err) {
    // DownloadSelection's qrFailureMessage keys its wording off this prefix.
    throw new Error(`/api/upload → ${err?.message || err}`, { cause: err })
  }
}
