// Debug endpoint to test company website detection
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { companyName } = req.body

  if (!companyName || typeof companyName !== 'string') {
    return res.status(400).json({ error: 'Company name is required' })
  }

  // Enhanced known companies database with more variations
  const knownCompanies = {
    // Commonwealth Bank variations
    'commonwealth bank': 'https://www.commbank.com.au',
    'commonwealth bank australia': 'https://www.commbank.com.au',
    'commonwealth bank of australia': 'https://www.commbank.com.au',
    'cba': 'https://www.commbank.com.au',
    'commbank': 'https://www.commbank.com.au',
    'comm bank': 'https://www.commbank.com.au',
    
    // Other major Australian companies
    'westpac': 'https://www.westpac.com.au',
    'westpac bank': 'https://www.westpac.com.au',
    'anz': 'https://www.anz.com.au',
    'nab': 'https://www.nab.com.au',
    'telstra': 'https://www.telstra.com.au',
    'woolworths': 'https://www.woolworthsgroup.com.au',
    'qantas': 'https://www.qantas.com'
  }
  
  const cleanName = companyName.toLowerCase().trim()
  
  const debugInfo = {
    api_version: '2.1.0',
    input_company_name: companyName,
    clean_name: cleanName,
    database_keys: Object.keys(knownCompanies),
    direct_match: null,
    partial_matches: [],
    final_url: null,
    timestamp: new Date().toISOString()
  }

  // Check direct match
  if (knownCompanies[cleanName]) {
    debugInfo.direct_match = {
      found: true,
      key: cleanName,
      url: knownCompanies[cleanName]
    }
    debugInfo.final_url = knownCompanies[cleanName]
  } else {
    debugInfo.direct_match = { found: false }
    
    // Check partial matches
    for (const [key, url] of Object.entries(knownCompanies)) {
      if (cleanName.includes(key) || key.includes(cleanName)) {
        debugInfo.partial_matches.push({
          key: key,
          url: url,
          match_type: cleanName.includes(key) ? 'clean_includes_key' : 'key_includes_clean'
        })
      }
    }
    
    if (debugInfo.partial_matches.length > 0) {
      debugInfo.final_url = debugInfo.partial_matches[0].url
    } else {
      // Fallback
      const simpleName = cleanName.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
      debugInfo.final_url = `https://www.${simpleName}.com.au`
      debugInfo.fallback_used = true
      debugInfo.simple_name = simpleName
    }
  }

  res.status(200).json(debugInfo)
}
