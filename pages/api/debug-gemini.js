export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const hasGeminiKey = !!process.env.GEMINI_API_KEY
  const keyLength = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0
  const keyPrefix = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'Not found'

  res.json({
    gemini_api_key_configured: hasGeminiKey,
    key_length: keyLength,
    key_prefix: keyPrefix,
    environment: process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString()
  })
}
