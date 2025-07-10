import { GoogleGenerativeAI } from '@google/generative-ai'
import axios from 'axios'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 10, // Max requests per window
  windowMs: 60 * 1000, // 1 minute window
  message: 'Too many requests. Please wait a minute before trying again.'
}

// Simple in-memory rate limiting (for production, use Redis or database)
const requestCounts = new Map()

function checkRateLimit(clientId) {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT.windowMs
  
  // Clean old entries
  for (const [id, requests] of requestCounts.entries()) {
    requestCounts.set(id, requests.filter(time => time > windowStart))
    if (requestCounts.get(id).length === 0) {
      requestCounts.delete(id)
    }
  }
  
  // Check current client
  const clientRequests = requestCounts.get(clientId) || []
  
  if (clientRequests.length >= RATE_LIMIT.maxRequests) {
    return false // Rate limit exceeded
  }
  
  // Add current request
  clientRequests.push(now)
  requestCounts.set(clientId, clientRequests)
  
  return true // Request allowed
}

// API Version
const API_VERSION = '4.0.0' // New Gemini-powered approach
console.log(`Gemini Research API v${API_VERSION} loaded`)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limiting check
  const clientId = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'
  
  if (!checkRateLimit(clientId)) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: RATE_LIMIT.message,
      retry_after: '60 seconds',
      limit: `${RATE_LIMIT.maxRequests} requests per minute`
    })
  }

  const { companyName, websiteUrl } = req.body

  if (!companyName) {
    return res.status(400).json({ error: 'Company name is required' })
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' })
  }

  try {
    console.log(`Starting Gemini-powered research for: ${companyName} (Client: ${clientId})`)

    // Step 1: Get basic company information (if website provided)
    let companyInfo = {
      name: companyName,
      website: websiteUrl || null,
      description: null
    }

    if (websiteUrl) {
      try {
        // Quick website check for basic info
        const response = await axios.get(websiteUrl, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        })
        
        // Extract basic description from meta tags or title
        const titleMatch = response.data.match(/<title[^>]*>([^<]+)<\/title>/i)
        const descMatch = response.data.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i)
        
        companyInfo.description = descMatch ? descMatch[1] : (titleMatch ? titleMatch[1] : null)
      } catch (error) {
        console.log(`Could not access website ${websiteUrl}: ${error.message}`)
        companyInfo.description = `Could not access website: ${error.message}`
      }
    }

    // Step 2: Use Gemini to find financial documents
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const documentSearchPrompt = `You are a financial research expert specializing in Australian companies and ASRS (Australian Sustainability Reporting Standards) compliance.

I need you to find the most relevant financial documents for "${companyName}" that would be useful for ASRS analysis.

IMPORTANT: Think like Google Search - what would be the TOP search results for "${companyName} annual report 2024" or "${companyName} investor relations"?

SEARCH STRATEGY:
1. Consider what URLs would appear in Google's TOP search results
2. Think about the company's actual investor relations page structure
3. Use REAL URL patterns that major Australian companies actually use
4. Focus on URLs that would be easily discoverable via search engines

KNOWN PATTERNS FOR MAJOR AUSTRALIAN COMPANIES:
- Commonwealth Bank: /content/dam/commbank-assets/investors/docs/results/fy24/ (uses financial year format)
- Telstra: /content/dam/tcom/about-us/investors/pdf-g/
- Westpac: /about-westpac/investor-centre/
- ANZ: /about-us/investor-centre/
- BHP: /investors/ or /media-and-insights/reports/

**SPECIFIC EXAMPLES OF WORKING URLs:**
- Commonwealth Bank 2024: https://www.commbank.com.au/content/dam/commbank-assets/investors/docs/results/fy24/2024-Annual-Report_spreads.pdf
- Telstra 2024: https://www.telstra.com.au/content/dam/tcom/about-us/investors/pdf-g/telstra-annual-report-2024.pdf

**IMPORTANT URL PATTERNS:**
- Commonwealth Bank uses "fy24" for 2024 financial year, "fy23" for 2023
- Commonwealth Bank files often have "_spreads.pdf" suffix
- Use exact patterns from working examples above

Please search your knowledge and provide the top 5 most likely DIRECT PDF URLs for this company, focusing on:

1. **Annual Reports** (2024, 2023) - HIGHEST PRIORITY
2. **Financial Statements** - HIGH PRIORITY  
3. **Sustainability/ESG Reports** - MEDIUM PRIORITY
4. **Quarterly Results** - MEDIUM PRIORITY

For each document, provide:
- **title**: Clear document name
- **url**: DIRECT PDF URL (must end in .pdf) that would likely appear in Google search results
- **type**: Document category (Annual Report, Financial Statements, etc.)
- **year**: Document year (if applicable)
- **confidence**: Your confidence this PDF URL exists and would be found via Google search (1-10)
- **relevance_reason**: Why this is important for ASRS analysis
- **is_pdf**: true (since all URLs should be direct PDFs)
- **recommendation**: HIGHLY RECOMMENDED, RECOMMENDED, or CONSIDER

**CRITICAL REQUIREMENTS:**
- ALL URLs must be direct PDF links ending in .pdf
- Focus on URLs that would be TOP Google search results
- Prioritize recent documents (2024, 2023)
- Use realistic URL patterns based on actual Australian company structures
- Think: "What would I find if I Googled '[Company] annual report 2024'?"

**Company**: ${companyName}
${websiteUrl ? `**Known Website**: ${websiteUrl}` : ''}

**COMPANY-SPECIFIC URL GUIDANCE:**
${companyName.toLowerCase().includes('commonwealth bank') ? `
For Commonwealth Bank specifically:
- Use path: /content/dam/commbank-assets/investors/docs/results/
- Financial year format: fy24 for 2024, fy23 for 2023
- Filename format: 2024-Annual-Report_spreads.pdf
- Full example: https://www.commbank.com.au/content/dam/commbank-assets/investors/docs/results/fy24/2024-Annual-Report_spreads.pdf
` : ''}

**EXAMPLE GOOGLE SEARCH THINKING:**
For "Commonwealth Bank annual report 2024", Google would likely show:
- Their main investor relations page
- Direct links to recent annual reports
- PDF documents hosted in their investor relations section

Please respond with a JSON array of exactly 5 DIRECT PDF documents that would be discoverable via Google search:

[
  {
    "title": "Document title",
    "url": "https://company.com.au/path/document-2024.pdf",
    "type": "Annual Report",
    "year": 2024,
    "confidence": 9,
    "relevance_reason": "Most recent annual report containing comprehensive financial data required for ASRS analysis",
    "is_pdf": true,
    "recommendation": "HIGHLY RECOMMENDED"
  }
]`

    const result = await model.generateContent(documentSearchPrompt)
    const response = result.response.text()

    console.log(`Gemini document search completed for ${companyName}`)

    // Parse Gemini response
    let documents = []
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        documents = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON array found in response')
      }
    } catch (parseError) {
      console.log('JSON parsing failed, using fallback document generation')
      documents = generateFallbackDocuments(companyName, websiteUrl)
    }

    // URL Validation - Check if generated URLs are accessible
    console.log(`Validating ${documents.length} URLs for accessibility...`)
    const validatedDocuments = await Promise.all(
      documents.map(async (doc, index) => {
        try {
          // Quick HEAD request to check if URL exists
          const response = await axios.head(doc.url, {
            timeout: 5000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
          })
          
          console.log(`✅ URL ${index + 1} accessible: ${doc.url}`)
          return {
            ...doc,
            url_status: 'accessible',
            confidence: Math.min(doc.confidence + 1, 10), // Boost confidence for working URLs
            validation_note: 'URL verified as accessible'
          }
        } catch (error) {
          console.log(`❌ URL ${index + 1} failed (${error.response?.status || 'timeout'}): ${doc.url}`)
          return {
            ...doc,
            url_status: 'inaccessible',
            confidence: Math.max(doc.confidence - 2, 1), // Reduce confidence for broken URLs
            validation_note: `URL validation failed: ${error.response?.status || 'timeout'}`,
            validation_error: error.response?.status || 'timeout'
          }
        }
      })
    )

    // Sort by confidence after validation (working URLs first)
    const sortedDocuments = validatedDocuments.sort((a, b) => {
      if (a.url_status === 'accessible' && b.url_status !== 'accessible') return -1
      if (b.url_status === 'accessible' && a.url_status !== 'accessible') return 1
      return b.confidence - a.confidence
    })

    // Enhance documents with metadata
    const enhancedDocuments = sortedDocuments.map((doc, index) => ({
      ...doc,
      rank: index + 1,
      relevance_score: doc.confidence * 10,
      priority: doc.confidence >= 8 ? 10 : doc.confidence >= 6 ? 8 : 6,
      found_via: 'gemini_ai_search_validated',
      document_type: doc.type
    }))

    // Count accessible vs inaccessible URLs
    const accessibleCount = enhancedDocuments.filter(doc => doc.url_status === 'accessible').length
    const inaccessibleCount = enhancedDocuments.filter(doc => doc.url_status === 'inaccessible').length
    
    console.log(`URL Validation Results: ${accessibleCount} accessible, ${inaccessibleCount} inaccessible`)

    // Prepare final response
    const results = {
      company_name: companyName,
      website: companyInfo.website,
      description: companyInfo.description,
      timestamp: new Date().toISOString(),
      
      // Document discovery results
      recent_financial_documents: enhancedDocuments,
      documents_found: enhancedDocuments.length,
      
      // URL Validation Results
      url_validation: {
        total_urls_checked: enhancedDocuments.length,
        accessible_urls: accessibleCount,
        inaccessible_urls: inaccessibleCount,
        validation_success_rate: `${Math.round((accessibleCount / enhancedDocuments.length) * 100)}%`
      },
      
      // Metadata
      search_method: 'gemini_ai_powered_with_validation',
      ai_provider: 'Google Gemini (Free)',
      cost: '$0.00',
      api_version: API_VERSION,
      rate_limit_info: {
        requests_remaining: RATE_LIMIT.maxRequests - (requestCounts.get(clientId)?.length || 0),
        window_reset: '60 seconds'
      },
      
      // For compatibility with existing frontend
      data: {
        recent_financial_documents: enhancedDocuments,
        website: {
          financial_links: enhancedDocuments.map(doc => ({
            ...doc,
            text: doc.title,
            url: doc.url,
            type: doc.type.toLowerCase().replace(/\s+/g, '_')
          }))
        }
      },
      
      status: 'success'
    }

    console.log(`Gemini research completed for ${companyName}: ${enhancedDocuments.length} documents found`)
    res.json(results)

  } catch (error) {
    console.error('Gemini research error:', error.message)
    
    // Handle Gemini API specific errors
    if (error.message.includes('quota') || error.message.includes('rate')) {
      return res.status(429).json({
        error: 'Gemini API rate limit exceeded',
        details: 'Please wait a few minutes before trying again',
        company_name: companyName,
        timestamp: new Date().toISOString(),
        api_version: API_VERSION,
        status: 'rate_limited'
      })
    }

    res.status(500).json({
      error: 'Failed to research company',
      details: error.message,
      company_name: companyName,
      timestamp: new Date().toISOString(),
      api_version: API_VERSION,
      status: 'error'
    })
  }
}

// Fallback document generation if Gemini parsing fails
function generateFallbackDocuments(companyName, websiteUrl) {
  const currentYear = new Date().getFullYear()
  const cleanName = companyName.toLowerCase().replace(/\s+/g, '')
  const baseUrl = websiteUrl || `https://www.${cleanName}.com.au`
  
  return [
    {
      title: `${companyName} Annual Report ${currentYear}`,
      url: `${baseUrl}/annual-report-${currentYear}.pdf`,
      type: 'Annual Report',
      year: currentYear,
      confidence: 8,
      relevance_reason: 'Most recent annual report - essential for ASRS analysis',
      is_pdf: true,
      recommendation: 'HIGHLY RECOMMENDED'
    },
    {
      title: `${companyName} Annual Report ${currentYear - 1}`,
      url: `${baseUrl}/annual-report-${currentYear - 1}.pdf`,
      type: 'Annual Report',
      year: currentYear - 1,
      confidence: 7,
      relevance_reason: 'Previous year annual report for comparison',
      is_pdf: true,
      recommendation: 'RECOMMENDED'
    },
    {
      title: `${companyName} Investor Relations`,
      url: `${baseUrl}/investor-relations`,
      type: 'Investor Relations',
      year: currentYear,
      confidence: 6,
      relevance_reason: 'Investor relations hub - contains financial documents',
      is_pdf: false,
      recommendation: 'RECOMMENDED'
    },
    {
      title: `${companyName} Financial Statements`,
      url: `${baseUrl}/financial-statements`,
      type: 'Financial Statements',
      year: currentYear,
      confidence: 5,
      relevance_reason: 'Detailed financial statements for ASRS compliance',
      is_pdf: false,
      recommendation: 'CONSIDER'
    },
    {
      title: `${companyName} Sustainability Report`,
      url: `${baseUrl}/sustainability-report.pdf`,
      type: 'Sustainability Report',
      year: currentYear,
      confidence: 4,
      relevance_reason: 'ESG and sustainability information',
      is_pdf: true,
      recommendation: 'CONSIDER'
    }
  ]
}
