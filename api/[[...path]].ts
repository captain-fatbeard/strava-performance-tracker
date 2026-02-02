import type { VercelRequest, VercelResponse } from '@vercel/node'
// @ts-ignore - Import the built server bundle
import server from '../dist/server/server.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Convert Vercel request to Web Request
    const protocol = req.headers['x-forwarded-proto'] || 'https'
    const host = req.headers['x-forwarded-host'] || req.headers.host
    const url = `${protocol}://${host}${req.url}`

    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value)
      }
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    })

    const response = await server.fetch(request)

    // Convert Web Response to Vercel response
    res.status(response.status)
    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })

    const body = await response.text()
    res.send(body)
  } catch (error) {
    console.error('Server error:', error)
    res.status(500).send('Internal Server Error')
  }
}
