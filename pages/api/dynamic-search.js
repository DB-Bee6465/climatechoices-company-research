// Dynamic document search using SerpAPI for real-time Google search results
import axios from 'axios'

const SERPAPI_KEY = process.env.SERPAPI_KEY // You'll need to add this to Vercel env vars
const API_VERSION = '4.1.0-dynamic'

// Rate limiting
const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
}

const requestCounts = new Map()

function checkRateLimit(clientId) {
  const now = Date.now()
  const requests = requestCounts.get(clientId) || []
  
  // Remove old requests outside the window
  const validRequests = requests.filter(time => now - time < RATE_LIMIT.windowMs)
  
  if (validRequests.length >= RATE_LIMIT.maxRequests) {
    return false
  }
  
  validRequests.push(now)
  requestCounts.set(clientId, validRequests)
  return true
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limiting check
  const clientId = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'
  
  if (!checkRateLimit(clientId)) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Please wait before making another request',
      retry_after: '60 seconds'
    })
  }

  const { companyName, websiteUrl, selectedYear } = req.body

  if (!companyName) {
    return res.status(400).json({ error: 'Company name is required' })
  }

  if (!SERPAPI_KEY) {
    return res.status(500).json({ 
      error: 'SerpAPI key not configured',
      message: 'Please add SERPAPI_KEY to environment variables'
    })
  }

  try {
    console.log(`Starting dynamic search for: ${companyName}`)

    // Determine the official company domain
    let siteDomain = ''
    
    // First, try to extract from provided websiteUrl
    if (websiteUrl && websiteUrl !== 'https://www.company.com.au' && !websiteUrl.includes('company.com.au')) {
      try {
        const url = new URL(websiteUrl)
        siteDomain = url.hostname.replace('www.', '')
        console.log(`Using provided domain: ${siteDomain}`)
      } catch (e) {
        console.log('Could not parse provided website URL')
      }
    }
    
    // Dynamic approach - no domain required!
    if (!siteDomain) {
      console.log(`No domain provided for ${companyName} - using dynamic web search approach`)
    }

    // Construct intelligent search queries - dynamic approach
    let searchQueries = []
    
    if (siteDomain) {
      // If we have a domain, search that site specifically
      if (selectedYear) {
        console.log(`Targeting specific year: ${selectedYear} on official domain: ${siteDomain}`)
        searchQueries = [
          `"${companyName}" annual report ${selectedYear} filetype:pdf site:${siteDomain}`,
          `"${companyName}" ${selectedYear} annual report site:${siteDomain}`,
          `annual report ${selectedYear} site:${siteDomain}`,
          `financial statements ${selectedYear} site:${siteDomain}`,
          `investor relations ${selectedYear} site:${siteDomain}`
        ]
      } else {
        console.log(`Searching all recent years on official domain: ${siteDomain}`)
        searchQueries = [
          `annual report 2024 filetype:pdf site:${siteDomain}`,
          `annual report 2023 filetype:pdf site:${siteDomain}`,
          `financial statements 2024 site:${siteDomain}`,
          `investor relations site:${siteDomain}`,
          `sustainability report 2024 site:${siteDomain}`
        ]
      }
    } else {
      // Dynamic web search - let Google find the company and their documents
      if (selectedYear) {
        console.log(`Dynamic search for ${companyName} targeting year: ${selectedYear}`)
        searchQueries = [
          `"${companyName}" annual report ${selectedYear} filetype:pdf australia`,
          `"${companyName}" ${selectedYear} annual report investor relations`,
          `"${companyName}" financial report ${selectedYear} australia`,
          `"${companyName}" ${selectedYear} sustainability report australia`
        ]
      } else {
        console.log(`Dynamic search for ${companyName} - all recent years`)
        searchQueries = [
          `"${companyName}" annual report filetype:pdf australia`,
          `"${companyName}" annual report 2024 OR 2023 OR 2022 investor relations`,
          `"${companyName}" financial statements australia annual report`,
          `"${companyName}" investor relations annual report australia`,
          `"${companyName}" sustainability report 2024 australia`
        ]
      }
    }

    console.log(`Executing ${searchQueries.length} dynamic searches...`)

    // Execute searches in parallel
    const searchPromises = searchQueries.map(async (query, index) => {
      try {
        console.log(`[SERPAPI USAGE] Search ${index + 1}/${searchQueries.length}: ${query}`)
        
        const response = await axios.get('https://serpapi.com/search', {
          params: {
            engine: 'google',
            q: query,
            api_key: SERPAPI_KEY,
            num: 3, // Get top 3 results per query
            hl: 'en',
            gl: 'au', // Australia-focused results
          },
          timeout: 10000
        })

        const results = response.data.organic_results || []
        console.log(`[SERPAPI USAGE] Search ${index + 1} found ${results.length} results - Cost: ~$0.01`)

        return results.map(result => ({
          title: result.title,
          url: result.link,
          snippet: result.snippet,
          search_query: query,
          search_rank: result.position,
          found_via: 'serpapi_google_search'
        }))
      } catch (error) {
        console.error(`Search ${index + 1} failed:`, error.message)
        return []
      }
    })

    // Wait for all searches to complete
    const allSearchResults = await Promise.all(searchPromises)
    const flatResults = allSearchResults.flat()

    console.log(`Total search results found: ${flatResults.length}`)

    // Filter and enhance results for financial documents - STRICT DOMAIN FILTERING
    const financialDocuments = flatResults
      .filter(result => {
        const title = result.title.toLowerCase()
        const url = result.url.toLowerCase()
        
        // CRITICAL: Must be from the official company domain
        if (!url.includes(siteDomain.toLowerCase())) {
          console.log(`❌ Rejected (wrong domain): ${url} (expected: ${siteDomain})`)
          return false
        }
        
        // Exclude very old documents (before 2020)
        const oldYearMatch = title.match(/19\d{2}|200\d|201\d/) || url.match(/19\d{2}|200\d|201\d/)
        if (oldYearMatch) {
          const year = parseInt(oldYearMatch[0])
          if (year < 2020) {
            console.log(`❌ Rejected (too old): ${url} (year: ${year})`)
            return false
          }
        }
        
        // Look for financial document indicators
        const isFinancialDoc = (
          title.includes('annual report') ||
          title.includes('financial statement') ||
          title.includes('sustainability report') ||
          title.includes('investor relation') ||
          url.includes('annual') ||
          url.includes('financial') ||
          url.includes('investor') ||
          url.includes('report') ||
          url.includes('.pdf')
        )
        
        if (isFinancialDoc) {
          console.log(`✅ Accepted: ${url}`)
          return true
        } else {
          console.log(`❌ Rejected (not financial): ${url}`)
          return false
        }
      })
      // Remove duplicates based on URL
      .filter((result, index, self) => 
        index === self.findIndex(r => r.url === result.url)
      )
      .map((result, index) => {
        // Determine document type
        let type = 'Financial Document'
        let priority = 6
        let recommendation = 'CONSIDER'
        
        const title = result.title.toLowerCase()
        const url = result.url.toLowerCase()
        
        if (title.includes('annual report') || url.includes('annual')) {
          type = 'Annual Report'
          priority = 10
          recommendation = 'HIGHLY RECOMMENDED'
        } else if (title.includes('financial statement')) {
          type = 'Financial Statements'
          priority = 9
          recommendation = 'HIGHLY RECOMMENDED'
        } else if (title.includes('sustainability') || title.includes('esg')) {
          type = 'Sustainability/ESG Report'
          priority = 7
          recommendation = 'RECOMMENDED'
        } else if (title.includes('investor relation')) {
          type = 'Investor Relations'
          priority = 8
          recommendation = 'RECOMMENDED'
        }

        // Determine year
        let year = null
        const yearMatch = result.title.match(/20(2[0-9])/g) || result.url.match(/20(2[0-9])/g)
        if (yearMatch) {
          year = parseInt(yearMatch[yearMatch.length - 1]) // Get the most recent year found
        }

        // Calculate confidence based on search rank and content relevance
        let confidence = Math.max(10 - result.search_rank, 1)
        
        // Boost confidence for matching selected year
        if (selectedYear && year && year.toString() === selectedYear) {
          confidence += 4 // Big boost for exact year match
        } else if (!selectedYear) {
          // If no specific year selected, boost recent years
          if (year >= 2024) confidence += 3
          else if (year >= 2023) confidence += 2
          else if (year >= 2022) confidence += 1
        }
        
        // Boost for PDF files
        if (url.includes('.pdf')) confidence += 2
        
        // Boost for official company domain
        if (siteDomain && url.includes(siteDomain.replace('www.', ''))) confidence += 2
        
        // Boost for exact company name match
        if (title.toLowerCase().includes(companyName.toLowerCase())) confidence += 2
        
        // Boost for specific document types
        if (title.includes('annual report')) confidence += 2
        if (selectedYear && (title.includes(selectedYear) || url.includes(selectedYear))) confidence += 2
        
        // PENALTY SYSTEM - Reduce scores for less relevant documents
        
        // Penalize subsidiary/division reports
        if (title.toLowerCase().includes('essential super') || 
            title.toLowerCase().includes('commsec') ||
            title.toLowerCase().includes('superannuation') ||
            url.includes('super-retiring') ||
            url.includes('commsec')) {
          confidence -= 3 // Penalty for subsidiary reports
        }
        
        // Penalize web pages vs PDFs
        if (!url.includes('.pdf')) {
          confidence -= 2 // Web pages get lower priority than PDFs
        }
        
        // Penalize general investor pages
        if (url.includes('/investors.html') || 
            url.includes('/results.html') ||
            (title.toLowerCase() === 'investors' || title.toLowerCase() === 'results')) {
          confidence -= 4 // General pages get significant penalty
        }
        
        // NO CAPPING - Let actual scores show through to UI
        // confidence = Math.min(confidence, 10) // REMOVED - show real scores

        return {
          title: result.title,
          url: result.url,
          type,
          year,
          confidence,
          relevance_reason: `Found via Google search: "${result.search_query}"`,
          is_pdf: url.includes('.pdf'),
          recommendation,
          rank: index + 1,
          relevance_score: confidence * 10,
          priority,
          found_via: 'serpapi_dynamic_search',
          document_type: type,
          snippet: result.snippet,
          search_query: result.search_query,
          search_rank: result.search_rank
        }
      })
      .sort((a, b) => {
        // Sort by priority first, then confidence
        if (a.priority !== b.priority) return b.priority - a.priority
        return b.confidence - a.confidence
      })
      .slice(0, 5) // Top 5 results

    console.log(`Filtered to ${financialDocuments.length} relevant financial documents`)

    // Add raw results to debug info for investigation
    const debugRawResults = flatResults.slice(0, 10).map(result => ({
      title: result.title,
      url: result.url,
      search_query: result.search_query,
      search_rank: result.search_rank
    }))

    // Prepare response with comprehensive debug information
    const results = {
      company_name: companyName,
      website: websiteUrl,
      selected_year: selectedYear,
      timestamp: new Date().toISOString(),
      
      // DEBUG INFORMATION - Shows exactly what happened
      debug_info: {
        input_website_url: websiteUrl,
        auto_detected_domain: siteDomain,
        search_queries_sent: searchQueries,
        raw_search_results_count: flatResults.length,
        filtered_results_count: financialDocuments.length,
        domain_detection_log: `Input: "${companyName}" → Detected: "${siteDomain}"`,
        filtering_summary: `${flatResults.length} raw results → ${financialDocuments.length} filtered results`,
        sample_raw_results: debugRawResults
      },
      
      // Document discovery results
      recent_financial_documents: financialDocuments,
      documents_found: financialDocuments.length,
      
      // Search metadata
      search_method: 'serpapi_dynamic_google_search',
      search_queries_executed: searchQueries.length,
      total_search_results: flatResults.length,
      filtered_results: financialDocuments.length,
      year_filter: selectedYear ? `Targeted search for ${selectedYear}` : 'All recent years (2024, 2023, 2022)',
      
      // SerpAPI Usage Tracking
      serpapi_usage: {
        searches_this_request: searchQueries.length,
        estimated_cost_this_request: `$${(searchQueries.length * 0.01).toFixed(2)}`,
        cost_per_search: '$0.01',
        free_tier_limit: '100 searches/month',
        usage_note: 'Check actual usage at https://serpapi.com/dashboard'
      },
      
      // API info
      ai_provider: 'SerpAPI + Google Search',
      cost: `$${(searchQueries.length * 0.01).toFixed(2)} (${searchQueries.length} searches)`,
      api_version: API_VERSION,
      rate_limit_info: {
        requests_remaining: RATE_LIMIT.maxRequests - (requestCounts.get(clientId)?.length || 0),
        window_reset: '60 seconds'
      },
      
      // For compatibility with existing frontend
      data: {
        recent_financial_documents: financialDocuments,
        website: {
          url: websiteUrl,
          financial_links: financialDocuments.map(doc => ({
            ...doc,
            text: doc.title,
            url: doc.url,
            type: doc.type.toLowerCase().replace(/\s+/g, '_')
          }))
        }
      },
      
      status: 'success'
    }

    console.log(`Dynamic search completed for ${companyName}: ${financialDocuments.length} documents found`)
    res.json(results)

  } catch (error) {
    console.error('Dynamic search error:', error.message)
    res.status(500).json({
      error: 'Failed to perform dynamic search',
      details: error.message,
      company_name: companyName,
      timestamp: new Date().toISOString(),
      status: 'error'
    })
  }
}
