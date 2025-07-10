import axios from 'axios'
import pdf from 'pdf-parse'

// Free financial data extraction using pattern matching
function extractFinancialDataAdvanced(text) {
  const results = {
    company_name: null,
    financial_year: null,
    total_employees: null,
    total_revenue: null,
    total_assets: null,
    confidence_scores: {},
    asrs_classification: null,
    extraction_method: 'pattern_matching'
  }

  const textLower = text.toLowerCase()
  const lines = text.split('\n')

  // Extract Company Name (from title/header)
  const titlePatterns = [
    /annual report.*?(\d{4})/i,
    /^([A-Z][A-Za-z\s&]+(?:limited|ltd|pty|group|corporation|corp|bank|holdings?))/m,
  ]
  
  for (const pattern of titlePatterns) {
    const match = text.match(pattern)
    if (match) {
      results.company_name = match[1]?.trim()
      results.confidence_scores.company_name = 4
      break
    }
  }

  // Extract Financial Year
  const yearPatterns = [
    /year ended.*?(\d{1,2})\s+(june|december|march|september)\s+(\d{4})/i,
    /financial year.*?(\d{4})/i,
    /for the year.*?(\d{4})/i
  ]
  
  for (const pattern of yearPatterns) {
    const match = textLower.match(pattern)
    if (match) {
      results.financial_year = match[match.length - 1] // Get the year
      results.confidence_scores.financial_year = 4
      break
    }
  }

  // Extract Employee Count
  const employeePatterns = [
    /total\s+(?:number\s+of\s+)?(?:employees|workforce|staff|headcount)[\s:]*([0-9,]+)/i,
    /(?:employees|workforce|staff)\s+of\s+([0-9,]+)/i,
    /([0-9,]+)\s+(?:employees|staff|people)/i,
    /headcount[\s:]*([0-9,]+)/i
  ]

  for (const pattern of employeePatterns) {
    const match = textLower.match(pattern)
    if (match) {
      const count = parseInt(match[1].replace(/,/g, ''))
      if (count >= 10 && count <= 500000) { // Reasonable range
        results.total_employees = count
        results.confidence_scores.total_employees = 3
        break
      }
    }
  }

  // Extract Revenue (from Income Statement)
  const revenuePatterns = [
    /total\s+revenue[\s$]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion|m|b)?/i,
    /revenue[\s$]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion|m|b)/i,
    /sales[\s$]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion|m|b)/i,
    /income[\s$]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion|m|b)/i
  ]

  for (const pattern of revenuePatterns) {
    const match = textLower.match(pattern)
    if (match) {
      let amount = parseFloat(match[1].replace(/,/g, ''))
      const unit = match[0].toLowerCase()
      
      // Convert to millions for consistency
      if (unit.includes('billion') || unit.includes(' b')) {
        amount *= 1000
      }
      
      if (amount >= 1 && amount <= 1000000) { // Reasonable range in millions
        results.total_revenue = {
          amount: amount,
          unit: 'million',
          currency: 'AUD'
        }
        results.confidence_scores.total_revenue = 3
        break
      }
    }
  }

  // Extract Total Assets (from Balance Sheet)
  const assetPatterns = [
    /total\s+assets[\s$]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion|m|b)?/i,
    /assets[\s$]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion|m|b)/i
  ]

  for (const pattern of assetPatterns) {
    const match = textLower.match(pattern)
    if (match) {
      let amount = parseFloat(match[1].replace(/,/g, ''))
      const unit = match[0].toLowerCase()
      
      // Convert to millions for consistency
      if (unit.includes('billion') || unit.includes(' b')) {
        amount *= 1000
      }
      
      if (amount >= 1 && amount <= 10000000) { // Reasonable range in millions
        results.total_assets = {
          amount: amount,
          unit: 'million',
          currency: 'AUD'
        }
        results.confidence_scores.total_assets = 3
        break
      }
    }
  }

  // ASRS Classification Logic
  if (results.total_revenue && results.total_assets && results.total_employees) {
    const revenue = results.total_revenue.amount
    const assets = results.total_assets.amount
    const employees = results.total_employees

    // Determine groups for each metric
    const revenueGroup = revenue >= 500 ? 1 : revenue >= 200 ? 2 : revenue >= 50 ? 3 : 0
    const assetGroup = assets >= 1000 ? 1 : assets >= 500 ? 2 : assets >= 25 ? 3 : 0
    const employeeGroup = employees >= 500 ? 1 : employees >= 250 ? 2 : employees >= 100 ? 3 : 0

    // Count how many criteria meet each group threshold
    const group1Count = [revenueGroup === 1, assetGroup === 1, employeeGroup === 1].filter(Boolean).length
    const group2Count = [revenueGroup === 2, assetGroup === 2, employeeGroup === 2].filter(Boolean).length
    const group3Count = [revenueGroup === 3, assetGroup === 3, employeeGroup === 3].filter(Boolean).length

    if (group1Count >= 2) {
      results.asrs_classification = {
        group: 1,
        reporting_date: '1 July 2024',
        criteria_met: group1Count
      }
    } else if (group2Count >= 2) {
      results.asrs_classification = {
        group: 2,
        reporting_date: '1 July 2026',
        criteria_met: group2Count
      }
    } else if (group3Count >= 2) {
      results.asrs_classification = {
        group: 3,
        reporting_date: '1 July 2027',
        criteria_met: group3Count
      }
    } else {
      results.asrs_classification = {
        group: 0,
        reporting_date: 'No current requirement',
        criteria_met: 0
      }
    }
  }

  return results
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { documentUrl, companyName } = req.body

  if (!documentUrl || !companyName) {
    return res.status(400).json({ error: 'Document URL and company name are required' })
  }

  try {
    console.log(`Starting free analysis for ${companyName}: ${documentUrl}`)

    let documentText = ''

    // Download and extract document content
    if (documentUrl.toLowerCase().includes('.pdf')) {
      const response = await axios.get(documentUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      })

      const pdfData = await pdf(response.data)
      documentText = pdfData.text
      console.log(`Extracted ${documentText.length} characters from PDF`)
    } else {
      const response = await axios.get(documentUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      })
      documentText = response.data
      console.log(`Extracted ${documentText.length} characters from web page`)
    }

    // Analyze with free pattern matching
    const analysis = extractFinancialDataAdvanced(documentText)
    
    const results = {
      company_name: companyName,
      document_url: documentUrl,
      timestamp: new Date().toISOString(),
      analysis: analysis,
      document_type: documentUrl.toLowerCase().includes('.pdf') ? 'PDF' : 'Web Page',
      document_length: documentText.length,
      status: 'success',
      method: 'free_pattern_matching'
    }

    console.log(`Free analysis completed for ${companyName}`)
    res.json(results)

  } catch (error) {
    console.error('Error in free analysis:', error.message)
    res.status(500).json({
      error: 'Failed to analyze document',
      details: error.message,
      company_name: companyName,
      document_url: documentUrl,
      timestamp: new Date().toISOString(),
      status: 'error'
    })
  }
}
