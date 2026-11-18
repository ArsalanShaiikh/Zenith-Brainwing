import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Stands in for api/upload.js during `vite` dev (no `vercel dev` needed) so
 * the QR pickup flow works on :5173 too. Production still runs the real
 * serverless function; this only exists inside the dev server.
 */
const apiUploadDevMiddleware = () => ({
  name: 'api-upload-dev-middleware',
  configureServer(server) {
    server.middlewares.use('/api/upload', (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
        return
      }

      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', async () => {
        res.setHeader('Content-Type', 'application/json')
        try {
          const parsed = JSON.parse(body || '{}')
          const hostSheetUrl = new URL('./api/hostSheet.js', import.meta.url)
          const { hostSheet, isSheetTokenRequest, issueSheetUploadToken } = await import(
            `${hostSheetUrl.href}?t=${Date.now()}`
          )

          // Same split as api/upload.js: normally just a token for the
          // browser's direct upload; base64 only from an older build.
          if (isSheetTokenRequest(parsed)) {
            try {
              res.end(JSON.stringify(await issueSheetUploadToken(parsed, req)))
            } catch (err) {
              console.error('Refused a sheet upload token', err)
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Could not authorise the upload' }))
            }
            return
          }

          const { filename, pdfBase64 } = parsed
          if (!filename || !pdfBase64) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Missing filename or pdfBase64' }))
            return
          }
          const url = await hostSheet({ filename, pdfBase64 })
          res.end(JSON.stringify({ url }))
        } catch (err) {
          console.error('Could not host the selection sheet', err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Could not host the sheet' }))
        }
      })
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.BLOB_READ_WRITE_TOKEN ??= env.BLOB_READ_WRITE_TOKEN

  return {
    plugins: [tailwindcss(), react(), apiUploadDevMiddleware()],
  }
})
