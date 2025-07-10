import axios from 'axios'
import * as cheerio from 'cheerio'

// External sources for employee data when not in annual reports
const EMPLOYEE_DATA_SOURCES = {
  linkedin: {
    name: 'LinkedIn',
    confidence: 3,
    pattern: /(\d{1,3}(?:,\d{3})*)\s*(?:employees|people)/i
  },
  company_website: {
    name: 'Company Website',
    confidence: 4,
    patterns: [
      /(\d{1,3}(?:,\d{3})*)\s*(?:employees|staff|people|workforce)/i,
      /team\s+of\s+(\d{1,3}(?:,\d{3})*)/i,
      /over\s+(\d{1,3}(?:,\d{3})*)\s+(?:employees|people)/i
    ]
  }
}

async function searchCompanyWebsiteForEmployees(companyUrl, companyName) {
  const results = []
  
  try {
    // Try common pages that might have employee information
    const pagesToCheck = [
      '',  // Main page
      '/about',
      '/about-us',
      '/careers',
      '/company',
      '/our-company'
    ]
    
    for (const page of pagesToCheck.slice(0, 3)) { // Limit to prevent timeout
      try {
        const url = new URL(page, companyUrl).toString()
        console.log(`[EMPLOYEE_SEARCH] Checking: ${url}`)
        
        const response = await axios.get(url, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        })
        
        const $ = cheerio.load(response.data)
        const text = $.text().toLowerCase()
        
        // Try multiple patterns
        for (const pattern of EMPLOYEE_DATA_SOURCES.company_website.patterns) {
          const match = text.match(pattern)
          if (match) {
            const count = parseInt(match[1].replace(/,/g, ''))
            if (count >= 10 && count <= 500000) { // Reasonable range
              results.push({
                source: 'Company Website',
                source_url: url,
                employee_count: count,
                confidence_score: 4,
                extraction_method: 'website_text_analysis',
                pattern_matched: pattern.toString(),
                context: match[0]
              })
              break // Found on this page, move to next page
            }
          }
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (pageError) {
        console.log(`[EMPLOYEE_SEARCH] Error checking ${page}: ${pageError.message}`)
      }
    }
    
  } catch (error) {
    console.error(`[EMPLOYEE_SEARCH] Error searching ${companyUrl}:`, error.message)
  }
  
  return results
}

async function searchLinkedInEmployeeCount(companyName) {
  // Note: Direct LinkedIn scraping is against their ToS
  // This is a placeholder for potential LinkedIn API integration
  // or other business intelligence APIs
  
  return {
    source: 'LinkedIn',
    note: 'LinkedIn employee data would require API integration or manual lookup',
    confidence_score: 3,
    recommendation: `Search LinkedIn for "${companyName}" company page to find employee count`
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { companyName, companyWebsite } = req.body

  if (!companyName) {
    return res.status(400).json({ error: 'Company name is required' })
  }

  try {
    console.log(`Starting external employee data search for ${companyName}`)
    
    const results = {
      company_name: companyName,
      timestamp: new Date().toISOString(),
      sources_searched: [],
      employee_data_found: [],
      recommendations: [],
      status: 'success'
    }

    // Search company website if provided
    if (companyWebsite) {
      console.log(`Searching company website: ${companyWebsite}`)
      const websiteResults = await searchCompanyWebsiteForEmployees(companyWebsite, companyName)
      
      if (websiteResults.length > 0) {
        results.employee_data_found.push(...websiteResults)
        results.sources_searched.push('Company Website')
      }
    }

    // Add LinkedIn recommendation
    const linkedinRec = await searchLinkedInEmployeeCount(companyName)
    results.recommendations.push(linkedinRec)
    results.sources_searched.push('LinkedIn (Manual)')

    // Add other external source recommendations
    results.recommendations.push({
      source: 'IBISWorld',
      note: 'Professional business intelligence platform with employee estimates',
      confidence_score: 3,
      access: 'Subscription required'
    })

    results.recommendations.push({
      source: 'ZoomInfo/Crunchbase',
      note: 'Business directories with employment estimates',
      confidence_score: 2,
      access: 'Free/Premium tiers available'
    })

    // Summary
    if (results.employee_data_found.length > 0) {
      const bestResult = results.employee_data_found.reduce((best, current) => 
        current.confidence_score > best.confidence_score ? current : best
      )
      
      results.summary = {
        best_estimate: bestResult.employee_count,
        confidence_score: bestResult.confidence_score,
        source: bestResult.source,
        note: `Figure not disclosed in Annual Report. External source used: ${bestResult.source}`
      }
    } else {
      results.summary = {
        note: 'No employee data found in automated search. Manual lookup recommended from suggested sources.',
        confidence_score: 0
      }
    }

    console.log(`External employee search completed for ${companyName}`)
    res.json(results)

  } catch (error) {
    console.error('Error in external employee search:', error.message)
    res.status(500).json({
      error: 'Failed to search external employee data',
      details: error.message,
      company_name: companyName,
      timestamp: new Date().toISOString(),
      status: 'error'
    })
  }
}
