import axios from 'axios'
import * as cheerio from 'cheerio'

// Simple rate limiting (in production, use Redis or database)
const rateLimitMap = new Map()

function rateLimit(ip) {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour
  const maxRequests = 5

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  const limit = rateLimitMap.get(ip)
  
  if (now > limit.resetTime) {
    // Reset the window
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (limit.count >= maxRequests) {
    return false
  }

  limit.count++
  return true
}

function findCompanyWebsite(companyName) {
  // Simple heuristic for Australian companies
  const cleanName = companyName.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
  
  // Try common Australian domain patterns
  const possibleUrls = [
    `https://www.${cleanName}.com.au`,
    `https://www.${cleanName}.com`,
    `https://${cleanName}.com.au`,
    `https://${cleanName}.com`
  ]
  
  return possibleUrls[0] // Return first guess for MVP
}

async function scrapeWebsite(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    })

    const $ = cheerio.load(response.data)
    
    // Extract basic information
    const title = $('title').text() || 'N/A'
    const description = $('meta[name="description"]').attr('content') || 
                      $('meta[property="og:description"]').attr('content') || 
                      'Description not found'

    // Look for contact information
    const text = $.text().toLowerCase()
    
    // Extract emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    const emails = [...new Set(response.data.match(emailRegex) || [])]

    // Extract phone numbers (Australian format)
    const phoneRegex = /(?:\+61|0)[2-9]\d{8}|\b1[38]\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\b/g
    const phones = [...new Set(response.data.match(phoneRegex) || [])]

    return {
      url,
      title,
      description,
      contact_info: {
        emails: emails.slice(0, 3), // Limit to 3
        phones: phones.slice(0, 3)  // Limit to 3
      }
    }
  } catch (error) {
    console.error('Error scraping website:', error.message)
    return null
  }
}

function extractFinancialData(text) {
  const financialData = {}
  const textLower = text.toLowerCase()

  // Look for employee count
  const employeePatterns = [
    /(\d+)\s+employees/i,
    /(\d+)\s+staff/i,
    /(\d+)\s+people/i,
    /team\s+of\s+(\d+)/i,
    /workforce\s+of\s+(\d+)/i
  ]

  for (const pattern of employeePatterns) {
    const match = textLower.match(pattern)
    if (match) {
      const count = parseInt(match[1])
      if (count >= 5 && count <= 10000) { // Reasonable range
        financialData.employee_count = {
          count,
          source: 'website_text',
          type: 'estimated'
        }
        break
      }
    }
  }

  // Look for revenue (basic patterns)
  const revenuePatterns = [
    /revenue.*?\$([0-9,]+\.?[0-9]*)\s*(million|billion|m|b)/i,
    /income.*?\$([0-9,]+\.?[0-9]*)\s*(million|billion|m|b)/i,
    /turnover.*?\$([0-9,]+\.?[0-9]*)\s*(million|billion|m|b)/i
  ]

  for (const pattern of revenuePatterns) {
    const match = textLower.match(pattern)
    if (match) {
      financialData.annual_revenue = {
        amount: match[1].replace(',', ''),
        unit: match[2].toLowerCase().replace('b', 'billion').replace('m', 'million'),
        source: 'website_text'
      }
      break
    }
  }

  // Look for assets
  const assetsPatterns = [
    /assets.*?\$([0-9,]+\.?[0-9]*)\s*(million|billion|m|b)/i,
    /total\s+assets.*?\$([0-9,]+\.?[0-9]*)\s*(million|billion|m|b)/i
  ]

  for (const pattern of assetsPatterns) {
    const match = textLower.match(pattern)
    if (match) {
      financialData.total_assets = {
        amount: match[1].replace(',', ''),
        unit: match[2].toLowerCase().replace('b', 'billion').replace('m', 'million'),
        source: 'website_text'
      }
      break
    }
  }

  // Look for financial year
  const yearMatch = textLower.match(/(?:financial\s+year|fy)\s*(\d{4})/i) ||
                   textLower.match(/year\s+ended.*?(\d{4})/i)
  
  if (yearMatch) {
    financialData.financial_year = yearMatch[1]
  }

  return financialData
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limiting
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'
  if (!rateLimit(clientIp)) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Please try again in an hour.' 
    })
  }

  const { companyName, websiteUrl } = req.body

  if (!companyName || typeof companyName !== 'string') {
    return res.status(400).json({ error: 'Company name is required' })
  }

  try {
    const results = {
      company_name: companyName.trim(),
      timestamp: new Date().toISOString(),
      data: {}
    }

    // Determine website URL
    const targetUrl = websiteUrl || findCompanyWebsite(companyName)
    
    // Scrape website
    const websiteData = await scrapeWebsite(targetUrl)
    
    if (websiteData) {
      // Extract financial data from website content
      const response = await axios.get(targetUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      })
      
      const financialData = extractFinancialData(response.data)
      
      results.data = {
        website: websiteData,
        ...financialData,
        parent_company: 'Independent', // Default assumption for MVP
      }
    } else {
      // If website scraping fails, return basic structure
      results.data = {
        website: {
          url: targetUrl,
          title: 'Website not accessible',
          description: 'Could not access company website',
          contact_info: { emails: [], phones: [] }
        },
        parent_company: 'Unknown',
        message: 'Website could not be accessed. Please check the company name or provide a valid website URL.'
      }
    }

    res.status(200).json(results)

  } catch (error) {
    console.error('Research error:', error)
    res.status(500).json({ 
      error: 'An error occurred while researching the company. Please try again.' 
    })
  }
}
