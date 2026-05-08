const https = require('https')

function httpsGet(pathname, apiKey) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: pathname,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const rawText = Buffer.concat(chunks).toString('utf8')
        try {
          const body = JSON.parse(rawText)
          if (res.statusCode >= 400) {
            reject(new Error(`API ${res.statusCode}: ${body.error?.message ?? JSON.stringify(body)}`))
            return
          }
          resolve(body)
        } catch (error) {
          if (res.statusCode >= 400) {
            const message = rawText.trim().slice(0, 300) || `HTTP ${res.statusCode}`
            reject(new Error(`API ${res.statusCode}: ${message}`))
            return
          }
          reject(new Error(`Failed to parse API response: ${error.message}`))
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function fetchCosts(apiKey, days = 30) {
  const startTime = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
  const buckets = []
  let page = null

  do {
    const params = new URLSearchParams({
      start_time: String(startTime),
      bucket_width: '1d',
      limit: String(Math.min(days, 180)),
    })
    if (page) params.set('page', page)

    const body = await httpsGet(`/v1/organization/costs?${params.toString()}`, apiKey)
    buckets.push(...(body.data || []))
    page = body.has_more ? body.next_page : null
  } while (page)

  return buckets.map((bucket) => {
    const amountUsd = (bucket.results || []).reduce((sum, row) => sum + (row.amount?.value || 0), 0)
    return {
      bucket_date: new Date(bucket.start_time * 1000).toISOString().slice(0, 10),
      amount_usd: amountUsd,
      raw: bucket,
    }
  })
}

function isRetryableCostError(error) {
  const message = error?.message || ''
  return (
    message.includes('API 429') ||
    message.includes('API 500') ||
    message.includes('API 502') ||
    message.includes('API 503') ||
    message.includes('API 504') ||
    message.includes('ECONNRESET') ||
    message.includes('ETIMEDOUT')
  )
}

module.exports = { fetchCosts, isRetryableCostError }
