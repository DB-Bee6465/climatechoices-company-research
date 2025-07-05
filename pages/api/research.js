import axios from 'axios'
import * as cheerio from 'cheerio'

// API Version for debugging
const API_VERSION = '2.3.0' // Updated for enhanced keyword detection
console.log(`Company Research API v${API_VERSION} loaded`)

// Anti-detection configuration
const CRAWL_CONFIG = {
  delays: {
    betweenRequests: 2000, // 2 seconds between requests
    randomVariation: 1000,  // +/- 1 second random variation
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0'
  },
  timeout: 8000,
  maxRedirects: 3
}

// Financial page keywords for intelligent navigation
const FINANCIAL_KEYWORDS = [
  // Direct financial terms
  'investor relations', 'annual report', 'financial information', 
  'financial statements', 'corporate governance', 'investor',
  'annual-report', 'financials', 'reports', 'sec-filings',
  'investor-relations', 'financial-info',
  
  // Broader categories that often contain financial info
  'about us', 'about-us', 'about', 'company-info',
  'downloads', 'download', 'resources',
  'reporting', 'reports', 'corporate-reports',
  'publications', 'documents', 'media-centre',
  'news-and-reports', 'corporate-information',
  
  // Specific report types
  'sustainability report', 'esg report', 'corporate-responsibility',
  'quarterly-results', 'half-year', 'full-year',
  'earnings', 'results', 'performance'
]

// Function to find financial-related links on a page
function findFinancialLinks($, baseUrl) {
  const financialLinks = []
  
  // Find all links on the page
  $('a[href]').each((i, element) => {
    const href = $(element).attr('href')
    const linkText = $(element).text().toLowerCase().trim()
    const title = $(element).attr('title')?.toLowerCase() || ''
    
    if (!href) return
    
    // Convert relative URLs to absolute
    let fullUrl
    try {
      fullUrl = new URL(href, baseUrl).toString()
    } catch (e) {
      return // Skip invalid URLs
    }
    
    // Check if link text or URL contains financial keywords
    const combinedText = `${linkText} ${title} ${href.toLowerCase()}`
    const isFinancialLink = FINANCIAL_KEYWORDS.some(keyword => 
      combinedText.includes(keyword)
    )
    
    if (isFinancialLink) {
      // Determine link type with more specific categorization
      let linkType = 'general'
      
      if (combinedText.includes('annual report') || combinedText.includes('annual-report')) {
        linkType = 'annual_report'
      } else if (combinedText.includes('investor') && !combinedText.includes('individual')) {
        linkType = 'investor_relations'
      } else if (combinedText.includes('financial') || combinedText.includes('earnings') || combinedText.includes('results')) {
        linkType = 'financial_info'
      } else if (combinedText.includes('about') || combinedText.includes('company')) {
        linkType = 'about_company'
      } else if (combinedText.includes('download') || combinedText.includes('resources') || combinedText.includes('documents')) {
        linkType = 'downloads'
      } else if (combinedText.includes('report') || combinedText.includes('reporting')) {
        linkType = 'reports'
      } else if (combinedText.includes('sustainability') || combinedText.includes('esg') || combinedText.includes('responsibility')) {
        linkType = 'sustainability'
      } else if (combinedText.includes('governance')) {
        linkType = 'governance'
      }
      
      // Check if it's a PDF or other document format
      const isPdf = href.toLowerCase().includes('.pdf') || combinedText.includes('pdf')
      const isDoc = href.toLowerCase().match(/\.(doc|docx|xls|xlsx|ppt|pptx)/) || combinedText.match(/(doc|excel|powerpoint)/i)
      
      // Priority scoring - prioritize more relevant links
      let priority = 1
      if (linkType === 'annual_report') priority = 10
      else if (linkType === 'investor_relations') priority = 9
      else if (linkType === 'financial_info') priority = 8
      else if (linkType === 'reports') priority = 7
      else if (linkType === 'downloads') priority = 6
      else if (linkType === 'about_company') priority = 5
      
      // Boost priority for PDFs (likely to contain detailed financial data)
      if (isPdf) priority += 2
      
      financialLinks.push({
        url: fullUrl,
        text: linkText,
        type: linkType,
        is_pdf: isPdf,
        is_document: isPdf || isDoc,
        title: title || null,
        priority: priority
      })
    }
  })
  
  // Remove duplicates and sort by priority
  const uniqueLinks = financialLinks.filter((link, index, self) => 
    index === self.findIndex(l => l.url === link.url)
  )
  
  // Sort by priority (highest first) then by type
  uniqueLinks.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority
    return a.type.localeCompare(b.type)
  })
  
  return uniqueLinks.slice(0, 15) // Increased limit to 15 most relevant links
}

// Utility function for random delays
function randomDelay(baseMs = CRAWL_CONFIG.delays.betweenRequests) {
  const variation = Math.random() * CRAWL_CONFIG.delays.randomVariation
  const delay = baseMs + (Math.random() > 0.5 ? variation : -variation)
  return new Promise(resolve => setTimeout(resolve, Math.max(1000, delay)))
}

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

// Simplified web search using multiple strategies
async function findCompanyWebsite(companyName) {
  console.log(`[DEBUG] Finding website for: "${companyName}"`)
  
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
    'westpac banking corporation': 'https://www.westpac.com.au',
    'anz': 'https://www.anz.com.au',
    'anz bank': 'https://www.anz.com.au',
    'australia and new zealand banking group': 'https://www.anz.com.au',
    'nab': 'https://www.nab.com.au',
    'national australia bank': 'https://www.nab.com.au',
    'telstra': 'https://www.telstra.com.au',
    'telstra corporation': 'https://www.telstra.com.au',
    'woolworths': 'https://www.woolworthsgroup.com.au',
    'woolworths group': 'https://www.woolworthsgroup.com.au',
    'coles': 'https://www.colesgroup.com.au',
    'coles group': 'https://www.colesgroup.com.au',
    'bhp': 'https://www.bhp.com',
    'bhp group': 'https://www.bhp.com',
    'rio tinto': 'https://www.riotinto.com',
    'qantas': 'https://www.qantas.com',
    'qantas airways': 'https://www.qantas.com',
    'australian military bank': 'https://www.australianmilitarybank.com.au',
    'defence bank': 'https://www.defencebank.com.au',
    'suncorp': 'https://www.suncorp.com.au',
    'medibank': 'https://www.medibank.com.au',
    'harvey norman': 'https://www.harveynorman.com.au',
    'jb hi-fi': 'https://www.jbhifi.com.au',
    'bunnings': 'https://www.bunnings.com.au',
    'kmart': 'https://www.kmart.com.au',
    'target australia': 'https://www.target.com.au',
    'myer': 'https://www.myer.com.au',
    'david jones': 'https://www.davidjones.com'
  }
  
  const cleanName = companyName.toLowerCase().trim()
  console.log(`[DEBUG] Clean name: "${cleanName}"`)
  
  // Direct match
  if (knownCompanies[cleanName]) {
    console.log(`[DEBUG] Direct match found for: ${companyName} -> ${knownCompanies[cleanName]}`)
    return knownCompanies[cleanName]
  }
  
  // Partial match
  for (const [key, url] of Object.entries(knownCompanies)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      console.log(`[DEBUG] Partial match found: "${key}" for "${companyName}" -> ${url}`)
      return url
    }
  }
  
  console.log(`[DEBUG] No database match found, trying intelligent URL construction`)
  
  // Try intelligent URL construction
  const intelligentUrl = await constructIntelligentUrl(companyName)
  if (intelligentUrl) {
    console.log(`[DEBUG] Intelligent URL found: ${intelligentUrl}`)
    return intelligentUrl
  }
  
  // Final fallback
  console.log(`[DEBUG] Using fallback URL construction for: ${companyName}`)
  const simpleName = cleanName
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
  
  const fallbackUrl = `https://www.${simpleName}.com.au`
  console.log(`[DEBUG] Fallback URL: ${fallbackUrl}`)
  return fallbackUrl
}

// Intelligent URL construction based on company name patterns
async function constructIntelligentUrl(companyName) {
  const name = companyName.toLowerCase().trim()
  
  // Australian bank patterns
  if (name.includes('bank') && (name.includes('australia') || name.includes('australian'))) {
    const bankName = name.replace(/\s*(bank|australia|australian|of|the)\s*/g, '').trim()
    const possibleUrls = [
      `https://www.${bankName}bank.com.au`,
      `https://www.${bankName}.com.au`,
      `https://www.australian${bankName}bank.com.au`
    ]
    
    for (const url of possibleUrls) {
      if (await quickUrlCheck(url)) {
        console.log(`Found working URL: ${url}`)
        return url
      }
    }
  }
  
  // Company name with "Australia" or "Australian"
  if (name.includes('australia')) {
    const baseName = name.replace(/\s*(australia|australian|pty|ltd|limited|group|corporation|corp)\s*/g, '').trim()
    const cleanBaseName = baseName.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
    
    const possibleUrls = [
      `https://www.${cleanBaseName}.com.au`,
      `https://www.${cleanBaseName}australia.com.au`,
      `https://www.${cleanBaseName}.com`,
      `https://www.${cleanBaseName}group.com.au`
    ]
    
    for (const url of possibleUrls) {
      if (await quickUrlCheck(url)) {
        console.log(`Found working URL: ${url}`)
        return url
      }
    }
  }
  
  return null
}

// Quick URL check to see if a URL is accessible
async function quickUrlCheck(url) {
  try {
    const response = await axios.head(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    })
    return response.status >= 200 && response.status < 400
  } catch (error) {
    return false
  }
}

async function scrapeWebsite(url) {
  try {
    console.log(`[CRAWL] Starting scrape: ${url}`)
    
    // Add random delay before request
    await randomDelay()
    
    const response = await axios.get(url, {
      timeout: CRAWL_CONFIG.timeout,
      headers: CRAWL_CONFIG.headers,
      maxRedirects: CRAWL_CONFIG.maxRedirects,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      }
    })

    console.log(`[CRAWL] Successfully fetched ${url}, status: ${response.status}`)

    const $ = cheerio.load(response.data)
    
    // Extract basic information
    const title = $('title').text().trim() || 'N/A'
    const description = $('meta[name="description"]').attr('content') || 
                      $('meta[property="og:description"]').attr('content') || 
                      $('meta[name="Description"]').attr('content') ||
                      'Description not found'

    // Look for contact information
    const text = $.text().toLowerCase()
    
    // Extract emails (improved regex)
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi
    const emails = [...new Set(response.data.match(emailRegex) || [])]
      .filter(email => !email.includes('example.com') && !email.includes('test.com'))

    // Extract phone numbers (Australian format - improved)
    const phoneRegex = /(?:\+61\s?|0)[2-9]\d{8}|\b1[38]\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\b|\(\d{2}\)\s?\d{4}\s?\d{4}/g
    const phones = [...new Set(response.data.match(phoneRegex) || [])]

    // NEW: Find financial-related links
    const financialLinks = findFinancialLinks($, url)

    console.log(`[CRAWL] Extracted from ${url}: title="${title}", emails=${emails.length}, phones=${phones.length}, financial_links=${financialLinks.length}`)

    return {
      url,
      title,
      description: description.trim(),
      contact_info: {
        emails: emails.slice(0, 3),
        phones: phones.slice(0, 3)
      },
      financial_links: financialLinks,
      status: 'success'
    }
  } catch (error) {
    console.error(`[CRAWL] Error scraping website ${url}:`, error.message)
    
    // Provide more helpful error messages
    let errorMessage = error.message
    let suggestions = [
      'Try providing the exact website URL',
      'Check if the company name is spelled correctly',
      'Some websites block automated requests - this is normal'
    ]
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage = 'Website took too long to respond (likely has anti-bot protection)'
      suggestions = [
        'Large corporate websites often block automated requests',
        'Try visiting the website manually to verify it exists',
        'This is normal for companies like BHP, Rio Tinto, etc.',
        'The company detection is still working correctly'
      ]
    }
    
    return {
      url,
      title: 'Website not accessible',
      description: `Could not access website: ${errorMessage}`,
      contact_info: { emails: [], phones: [] },
      financial_links: [],
      status: 'error',
      error: errorMessage,
      suggestions
    }
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
    console.log(`Starting research for: ${companyName}`)
    
    const results = {
      company_name: companyName.trim(),
      timestamp: new Date().toISOString(),
      api_version: API_VERSION,
      data: {}
    }

    // Determine website URL (now async with web search)
    const targetUrl = websiteUrl || await findCompanyWebsite(companyName)
    console.log(`Target URL determined: ${targetUrl}`)
    
    // Scrape website
    const websiteData = await scrapeWebsite(targetUrl)
    
    if (websiteData && websiteData.status === 'success') {
      console.log(`Website scraping successful for ${targetUrl}`)
      
      // Extract financial data from website content
      try {
        const response = await axios.get(targetUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        })
        
        const financialData = extractFinancialData(response.data)
        
        results.data = {
          website: websiteData,
          financial_data: financialData,
          organizational_data: {
            parent_company: {
              name: 'Independent', // Default assumption for MVP
              source: 'assumption'
            }
          },
          research_status: 'success',
          search_method: websiteUrl ? 'provided_url' : 'web_search',
          debug_info: {
            api_version: API_VERSION,
            target_url: targetUrl,
            company_name_clean: companyName.toLowerCase().trim()
          }
        }
      } catch (financialError) {
        console.error('Error extracting financial data:', financialError.message)
        results.data = {
          website: websiteData,
          financial_data: {},
          organizational_data: {
            parent_company: {
              name: 'Unknown',
              source: 'error'
            }
          },
          research_status: 'partial_success',
          message: 'Website accessed but financial data extraction failed',
          search_method: websiteUrl ? 'provided_url' : 'web_search',
          debug_info: {
            api_version: API_VERSION,
            target_url: targetUrl,
            company_name_clean: companyName.toLowerCase().trim()
          }
        }
      }
    } else {
      console.log(`Website scraping failed for ${targetUrl}`)
      // If website scraping fails, return detailed error information
      results.data = {
        website: websiteData || {
          url: targetUrl,
          title: 'Website not accessible',
          description: 'Could not access company website',
          contact_info: { emails: [], phones: [] },
          status: 'error',
          error: 'Connection failed'
        },
        financial_data: {},
        organizational_data: {
          parent_company: {
            name: 'Unknown',
            source: 'error'
          }
        },
        research_status: 'failed',
        message: `Could not access website: ${targetUrl}. The website may be blocking automated requests or may not exist.`,
        suggestions: [
          'Try providing the exact website URL',
          'Check if the company name is spelled correctly',
          'Ensure the company has an online presence',
          'Some websites block automated requests - this is normal'
        ],
        search_method: websiteUrl ? 'provided_url' : 'web_search',
        debug_info: {
          api_version: API_VERSION,
          target_url: targetUrl,
          company_name_clean: companyName.toLowerCase().trim(),
          website_error: websiteData ? websiteData.error : 'Unknown error'
        }
      }
    }

    console.log(`Research completed for ${companyName}, status: ${results.data.research_status}`)
    res.status(200).json(results)

  } catch (error) {
    console.error('Research error:', error)
    res.status(500).json({ 
      error: 'An error occurred while researching the company. Please try again.',
      details: error.message,
      company_name: companyName
    })
  }
}
