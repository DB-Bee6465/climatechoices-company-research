import axios from 'axios'
import * as cheerio from 'cheerio'

// API Version for debugging
const API_VERSION = '3.1.0' // Enhanced document detection with exclusions and top 5 recommendations
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

// Enhanced financial page keywords with better prioritization
const FINANCIAL_KEYWORDS = [
  // HIGH PRIORITY - Annual Reports and Investor Relations (Priority 10)
  'annual report', 'annual-report', 'investor relations', 'investor-relations',
  'financial statements', 'financial-statements', 'corporate governance',
  'asx announcements', 'asx-announcements', 'investor centre', 'investor-centre',
  'quarterly results', 'half year results', 'full year results',
  'earnings', 'financial results', 'investor information',
  
  // MEDIUM PRIORITY - General Financial Info (Priority 8)
  'financial information', 'financial-information', 'investor', 'financials',
  'reports', 'corporate reports', 'corporate-reports', 'sec-filings',
  'sustainability report', 'esg report', 'corporate-responsibility',
  'results and presentations', 'investor presentations',
  
  // LOWER PRIORITY - Broader Categories (Priority 6)
  'about us', 'about-us', 'about', 'company-info',
  'downloads', 'download', 'resources', 'publications', 'documents',
  'media-centre', 'news-and-reports', 'corporate-information'
]

// EXCLUDE these terms (financial hardship, customer support, etc.)
const EXCLUDE_KEYWORDS = [
  'financial hardship', 'financial-hardship', 'payment assistance',
  'hardship policy', 'customer support', 'help', 'support',
  'domestic violence', 'family violence', 'adversity',
  'times of need', 'community support', 'customer assistance',
  'billing help', 'payment help', 'financial difficulty'
]

// Common annual report URL patterns for major Australian companies (cleaned up)
const ANNUAL_REPORT_URL_PATTERNS = [
  '/annual-report',
  '/investor-centre/annual-report',
  '/investors/annual-report'
]

// Function to try common annual report URL patterns (with basic validation)
async function tryCommonAnnualReportUrls(baseUrl) {
  const foundReports = []
  
  for (const pattern of ANNUAL_REPORT_URL_PATTERNS) {
    try {
      const testUrl = new URL(pattern, baseUrl).toString()
      console.log(`[URL_PATTERN] Trying: ${testUrl}`)
      
      // Try GET request with short timeout to validate content
      const response = await axios.get(testUrl, {
        timeout: 4000,
        headers: CRAWL_CONFIG.headers,
        maxRedirects: 2,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        }
      })
      
      if (response.status === 200) {
        // Basic content validation
        const content = response.data.toLowerCase()
        const hasRelevantContent = (
          content.includes('annual report') ||
          content.includes('financial report') ||
          content.includes('download') ||
          content.includes('pdf') ||
          (content.includes('investor') && content.length > 2000)
        )
        
        // Check it's not a generic error page
        const isValidPage = !content.includes('page not found') && 
                           !content.includes('404') &&
                           !content.includes('error') &&
                           content.length > 1500
        
        if (hasRelevantContent && isValidPage) {
          console.log(`[URL_PATTERN] Found valid annual report page: ${testUrl}`)
          foundReports.push({
            url: testUrl,
            text: 'Annual Report Page (Verified)',
            type: 'annual_report',
            is_pdf: false,
            is_document: false,
            priority: 10,
            relevance_score: 25,
            document_type: 'Annual Report Page',
            found_via: 'url_pattern',
            likely_year: new Date().getFullYear(),
            validation_level: 'content_verified'
          })
        } else {
          console.log(`[URL_PATTERN] URL exists but lacks relevant content: ${testUrl}`)
        }
      }
    } catch (error) {
      console.log(`[URL_PATTERN] Pattern ${pattern} failed: ${error.message}`)
    }
  }
  
  return foundReports
}

// Enhanced function to crawl deeper into investor relations pages (optimized)
async function crawlInvestorPages(financialLinks, baseUrl) {
  const deepCrawlResults = []
  const currentYear = new Date().getFullYear()
  
  // Find high-priority investor relations and annual report links to crawl deeper
  const investorLinks = financialLinks.filter(link => 
    (link.type === 'investor_relations' || link.type === 'annual_report') && 
    link.priority >= 8 &&
    !link.is_pdf // Only crawl web pages, not PDFs
  ).slice(0, 2) // Reduced from 3 to 2 to prevent timeout
  
  console.log(`[DEEP_CRAWL] Found ${investorLinks.length} investor pages to crawl deeper`)
  
  for (const link of investorLinks) {
    try {
      console.log(`[DEEP_CRAWL] Crawling: ${link.url}`)
      
      // Reduced delay and timeout
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second instead of random delay
      
      const response = await axios.get(link.url, {
        timeout: 6000, // Reduced from 8000
        headers: CRAWL_CONFIG.headers,
        maxRedirects: 2,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        }
      })
      
      const $ = cheerio.load(response.data)
      
      // Look for annual report specific links on this page
      const annualReportLinks = []
      
      $('a[href]').each((i, element) => {
        // Limit processing to first 50 links to prevent timeout
        if (i > 50) return false
        
        const href = $(element).attr('href')
        const linkText = $(element).text().toLowerCase().trim()
        const title = $(element).attr('title')?.toLowerCase() || ''
        
        if (!href) return
        
        // Convert relative URLs to absolute
        let fullUrl
        try {
          fullUrl = new URL(href, link.url).toString()
        } catch (e) {
          return
        }
        
        const combinedText = `${linkText} ${title} ${href.toLowerCase()}`
        
        // Look specifically for annual reports with year mentions
        const isAnnualReport = (
          combinedText.includes('annual report') ||
          combinedText.includes('annual-report') ||
          (combinedText.includes('annual') && combinedText.includes('report')) ||
          combinedText.includes('full year report') ||
          combinedText.includes('integrated report')
        )
        
        if (isAnnualReport) {
          const isPdf = href.toLowerCase().includes('.pdf') || combinedText.includes('pdf')
          const year = extractYearFromText(combinedText)
          
          let score = 10
          if (year === currentYear) score += 20
          else if (year === currentYear - 1) score += 15
          else if (year === currentYear - 2) score += 10
          if (isPdf) score += 10
          
          annualReportLinks.push({
            url: fullUrl,
            text: linkText || 'Annual Report',
            type: 'annual_report',
            is_pdf: isPdf,
            is_document: isPdf,
            title: title || null,
            priority: 10,
            relevance_score: score,
            likely_year: year,
            document_type: 'Annual Report',
            source_page: link.url,
            found_via: 'deep_crawl'
          })
        }
      })
      
      // Add unique annual report links found (limit to top 5)
      for (const arLink of annualReportLinks.slice(0, 5)) {
        const exists = deepCrawlResults.find(existing => existing.url === arLink.url)
        if (!exists) {
          deepCrawlResults.push(arLink)
          console.log(`[DEEP_CRAWL] Found annual report: ${arLink.text} (${arLink.likely_year}) - ${arLink.url}`)
        }
      }
      
    } catch (error) {
      console.error(`[DEEP_CRAWL] Error crawling ${link.url}:`, error.message)
    }
  }
  
  console.log(`[DEEP_CRAWL] Found ${deepCrawlResults.length} additional annual reports via deep crawl`)
  return deepCrawlResults
}

// Enhanced function to identify the most recent and relevant financial documents
// Enhanced function to identify the top 5 most relevant financial documents with recommendations
function identifyRecentFinancialDocuments(financialLinks) {
  const currentYear = new Date().getFullYear()
  const lastYear = currentYear - 1
  
  console.log(`[RECENT_DOCS] Analyzing ${financialLinks.length} financial links`)
  
  // Score each document based on multiple factors
  const scoredDocuments = financialLinks.map(link => {
    let score = link.priority || 1
    
    // MAJOR BOOST for annual reports
    if (link.type === 'annual_report') {
      score += 20
    } else if (link.type === 'investor_relations') {
      score += 15
    } else if (link.type === 'financial_statements' || link.type === 'financial_results') {
      score += 12
    }
    
    // BOOST for current/recent years
    const yearMatch = link.text?.match(/20\d{2}/) || link.url?.match(/20\d{2}/)
    if (yearMatch) {
      const year = parseInt(yearMatch[0])
      if (year === currentYear) score += 15
      else if (year === lastYear) score += 10
      else if (year >= currentYear - 2) score += 5
      link.likely_year = year
    }
    
    // BOOST for PDFs (more likely to be complete reports)
    if (link.is_pdf) {
      score += 8
    } else if (link.is_document) {
      score += 5
    }
    
    // BOOST for specific high-value keywords
    const text = (link.text + ' ' + link.url).toLowerCase()
    if (text.includes('annual report')) score += 10
    if (text.includes('investor centre') || text.includes('investor relations')) score += 8
    if (text.includes('financial statements')) score += 8
    if (text.includes('asx announcements')) score += 6
    if (text.includes('quarterly') || text.includes('half year') || text.includes('full year')) score += 5
    
    // PENALTY for very generic or low-value links
    if (text.includes('contact') || text.includes('help') || text.includes('support')) score -= 5
    if (link.type === 'about_company' && !text.includes('report')) score -= 3
    
    return {
      ...link,
      relevance_score: Math.max(score, 1) // Minimum score of 1
    }
  })
  
  // Sort by relevance score (highest first) and take top 5
  const topDocuments = scoredDocuments
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, 5)
  
  // Add recommendation flags
  const recommendedDocuments = topDocuments.map((doc, index) => {
    let recommendation = 'Review'
    let recommendationReason = ''
    
    if (index === 0 && doc.relevance_score >= 25) {
      recommendation = 'RECOMMENDED'
      recommendationReason = 'Highest relevance - likely contains comprehensive financial data'
    } else if (doc.type === 'annual_report' && doc.is_pdf) {
      recommendation = 'HIGHLY RECOMMENDED'
      recommendationReason = 'Annual report PDF - contains complete financial statements'
    } else if (doc.type === 'annual_report') {
      recommendation = 'RECOMMENDED'
      recommendationReason = 'Annual report page - may contain or link to financial statements'
    } else if (doc.type === 'investor_relations' && doc.relevance_score >= 20) {
      recommendation = 'RECOMMENDED'
      recommendationReason = 'Investor relations - likely contains annual reports and financial data'
    } else if (doc.relevance_score >= 15) {
      recommendation = 'Consider'
      recommendationReason = 'Good relevance score - may contain useful financial information'
    }
    
    return {
      ...doc,
      recommendation,
      recommendation_reason: recommendationReason,
      rank: index + 1
    }
  })
  
  console.log(`[RECENT_DOCS] Top 5 documents identified:`)
  recommendedDocuments.forEach(doc => {
    console.log(`  ${doc.rank}. ${doc.text} (Score: ${doc.relevance_score}, ${doc.recommendation})`)
  })
  
  return recommendedDocuments
}

// Helper function to extract year from document text/URL
function extractYearFromText(text) {
  const currentYear = new Date().getFullYear()
  const yearMatches = text.match(/20\d{2}/g)
  
  if (yearMatches) {
    // Return the most recent year found
    const years = yearMatches.map(y => parseInt(y)).filter(y => y >= 2020 && y <= currentYear + 1)
    return years.length > 0 ? Math.max(...years) : null
  }
  
  // Check for FY notation (e.g., FY24, FY2024)
  const fyMatch = text.match(/fy\s?(\d{2,4})/i)
  if (fyMatch) {
    let year = parseInt(fyMatch[1])
    if (year < 100) year += 2000 // Convert FY24 to 2024
    return year
  }
  
  return null
}

// Helper function to classify document type
function classifyDocumentType(text) {
  if (text.includes('annual report')) return 'Annual Report'
  if (text.includes('full year') && text.includes('result')) return 'Full Year Results'
  if (text.includes('half year') || text.includes('interim')) return 'Interim Report'
  if (text.includes('quarterly')) return 'Quarterly Report'
  if (text.includes('sustainability') || text.includes('esg')) return 'Sustainability Report'
  if (text.includes('investor') && text.includes('presentation')) return 'Investor Presentation'
  if (text.includes('financial statement')) return 'Financial Statements'
  return 'Financial Document'
}

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
    
    // EXCLUDE unwanted links first (financial hardship, customer support, etc.)
    const isExcluded = EXCLUDE_KEYWORDS.some(keyword => 
      combinedText.includes(keyword)
    )
    
    if (isExcluded) {
      console.log(`[EXCLUDE] Skipping excluded link: ${linkText}`)
      return // Skip this link
    }
    
    // Check for financial keywords
    const isFinancialLink = FINANCIAL_KEYWORDS.some(keyword => 
      combinedText.includes(keyword)
    )
    
    if (isFinancialLink) {
      // Enhanced link type categorization with better priority
      let linkType = 'general'
      let priority = 1
      
      // HIGH PRIORITY - Annual Reports and Core Investor Relations
      if (combinedText.includes('annual report') || combinedText.includes('annual-report')) {
        linkType = 'annual_report'
        priority = 10
      } else if (combinedText.includes('investor relations') || combinedText.includes('investor-relations') || 
                 combinedText.includes('investor centre') || combinedText.includes('investor-centre')) {
        linkType = 'investor_relations'
        priority = 9
      } else if (combinedText.includes('financial statements') || combinedText.includes('financial-statements') ||
                 combinedText.includes('asx announcements') || combinedText.includes('asx-announcements')) {
        linkType = 'financial_statements'
        priority = 9
      } else if (combinedText.includes('quarterly results') || combinedText.includes('half year') || 
                 combinedText.includes('full year') || combinedText.includes('earnings')) {
        linkType = 'financial_results'
        priority = 8
      }
      
      // MEDIUM PRIORITY - General Financial Info
      else if (combinedText.includes('financial') && !combinedText.includes('hardship')) {
        linkType = 'financial_info'
        priority = 8
      } else if (combinedText.includes('investor') && !combinedText.includes('individual')) {
        linkType = 'investor_relations'
        priority = 7
      } else if (combinedText.includes('corporate governance') || combinedText.includes('governance')) {
        linkType = 'governance'
        priority = 7
      } else if (combinedText.includes('sustainability report') || combinedText.includes('esg report')) {
        linkType = 'sustainability'
        priority = 6
      }
      
      // LOWER PRIORITY - General Categories
      else if (combinedText.includes('report') || combinedText.includes('reporting')) {
        linkType = 'reports'
        priority = 6
      } else if (combinedText.includes('download') || combinedText.includes('resources') || combinedText.includes('documents')) {
        linkType = 'downloads'
        priority = 6
      } else if (combinedText.includes('about') || combinedText.includes('company')) {
        linkType = 'about_company'
        priority = 5
      }
      
      // Check if it's a PDF or other document format
      const isPdf = href.toLowerCase().includes('.pdf') || combinedText.includes('pdf')
      const isDoc = href.toLowerCase().match(/\.(doc|docx|xls|xlsx|ppt|pptx)/) || combinedText.match(/(doc|excel|powerpoint)/i)
      
      // BOOST priority for documents (especially PDFs) as they're more likely to contain detailed data
      if (isPdf && linkType === 'annual_report') priority = 10 // Keep max priority
      else if (isPdf) priority = Math.min(priority + 2, 10) // Boost other PDFs
      else if (isDoc) priority = Math.min(priority + 1, 10) // Slight boost for other docs
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
  const maxRequests = 20 // Increased from 5 to 20 for testing

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
// Simplified web search using dynamic approach only (no static database)
async function findCompanyWebsite(companyName) {
  console.log(`[DEBUG] Finding website for: "${companyName}"`)
  
  // Enhanced company name cleaning for search
  function cleanCompanyName(name) {
    return name.toLowerCase()
      .trim()
      // Remove common suffixes that might confuse search
      .replace(/\s*\(australia\)$/i, '')
      .replace(/\s*\(aus\)$/i, '')
      .replace(/\s*australia$/i, '')
      .trim()
  }
  
  const cleanName = cleanCompanyName(companyName)
  const originalCleanName = companyName.toLowerCase().trim()
  
  console.log(`[DEBUG] Original: "${companyName}"`)
  console.log(`[DEBUG] Clean name for search: "${cleanName}"`)
  
  // Try intelligent URL construction with cleaned name
  let intelligentUrl = await constructIntelligentUrl(cleanName)
  if (intelligentUrl) {
    console.log(`[DEBUG] Intelligent URL found: ${intelligentUrl}`)
    return intelligentUrl
  }
  
  // Try with original name if cleaned version failed
  if (cleanName !== originalCleanName) {
    intelligentUrl = await constructIntelligentUrl(originalCleanName)
    if (intelligentUrl) {
      console.log(`[DEBUG] Intelligent URL found with original: ${intelligentUrl}`)
      return intelligentUrl
    }
  }
  
  // Final fallback using cleaned name
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
    
    // Add random delay before request to appear more human-like
    await randomDelay(1000) // 1-2 second delay
    
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
    
    // NEW: Try common annual report URL patterns
    const urlPatternResults = await tryCommonAnnualReportUrls(url)
    
    // NEW: Deep crawl investor relations pages to find annual reports
    const deepCrawlResults = await crawlInvestorPages([...financialLinks, ...urlPatternResults], url)
    
    // Combine all results
    const allFinancialLinks = [...financialLinks, ...urlPatternResults, ...deepCrawlResults]
    
    // NEW: Identify the most recent and relevant financial documents
    const recentDocuments = identifyRecentFinancialDocuments(allFinancialLinks)

    console.log(`[CRAWL] Extracted from ${url}: title="${title}", emails=${emails.length}, phones=${phones.length}, financial_links=${financialLinks.length}, url_patterns=${urlPatternResults.length}, deep_crawl=${deepCrawlResults.length}, recent_docs=${recentDocuments.length}`)

    return {
      url,
      title,
      description: description.trim(),
      contact_info: {
        emails: emails.slice(0, 3),
        phones: phones.slice(0, 3)
      },
      financial_links: allFinancialLinks, // Include all results
      recent_financial_documents: recentDocuments, // NEW: Prioritized recent documents
      deep_crawl_results: deepCrawlResults, // NEW: What was found via deep crawl
      url_pattern_results: urlPatternResults, // NEW: What was found via URL patterns
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
          recent_financial_documents: websiteData.recent_financial_documents || [],
          organizational_data: {
            parent_company: {
              name: 'Independent', // Default assumption for MVP
              source: 'assumption'
            }
          },
          research_status: 'success',
          search_method: websiteUrl ? 'provided_url' : 'web_search',
          next_step: websiteData.recent_financial_documents && websiteData.recent_financial_documents.length > 0 
            ? 'document_selection_required' 
            : 'complete',
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
