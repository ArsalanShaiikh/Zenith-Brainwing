/** Blob → base64, the shape `/api/upload` wants the PDF in over JSON. */
const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the sheet'))
    reader.readAsDataURL(blob)
  })

/**
 * Hosts the sheet and hands back a public URL to encode in a QR code. The
 * visitor's own phone fetches it directly — no messaging API sits in between.
 */
export const uploadSheet = async (blob, filename) => {
  const pdfBase64 = await blobToBase64(blob)
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, pdfBase64 }),
  })
  if (!res.ok) throw new Error(`/api/upload → ${res.status}`)
  const { url } = await res.json()
  return url
}
