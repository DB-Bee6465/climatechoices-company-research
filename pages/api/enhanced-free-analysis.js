import axios from 'axios'
import pdf from 'pdf-parse'

// Enhanced free analysis with ASRS compliance patterns
function extractASRSCompliantData(text, documentUrl) {
  const results = {
    company_name: null,
    financial_year: null,
    total_employees: null,
    total_revenue: null,
    total_assets: null,
    confidence_scores: {},
    asrs_compliance_checks: {},
    asrs_classification: null,
    extraction_method: 'enhanced_pattern_matching',
    page_references: {},
    line_item_validation: {}
  }

  const textLower = text.toLowerCase()
  const lines = text.split('\n')
  const pages = text.split(/page\s+\d+/i) // Rough page splitting

  // Enhanced Company Name extraction
  const companyPatterns = [
    /^([A-Z][A-Za-z\s&]+(?:limited|ltd|pty|group|corporation|corp|bank|holdings?))\s+annual report/im,
    /annual report.*?(\d{4}).*?([A-Z][A-Za-z\s&]+(?:limited|ltd|pty|group))/im,
    /^([A-Z][A-Za-z\s&]{10,50}(?:limited|ltd|pty|group))/m
  ]
  
  for (const [index, pattern] of companyPatterns.entries()) {
    const match = text.match(pattern)
    if (match) {
      results.company_name = match[index === 1 ? 2 : 1]?.trim()
      results.confidence_scores.company_name = 4
      break
    }
  }

  // Enhanced Financial Year extraction
  const yearPatterns = [
    /year ended\s+(\d{1,2})\s+(june|december|march|september)\s+(\d{4})/i,
    /financial year.*?(\d{4})/i,
    /for the year.*?(\d{4})/i,
    /annual report.*?(\d{4})/i
  ]
  
  for (const pattern of yearPatterns) {
    const match = textLower.match(pattern)
    if (match) {
      results.financial_year = match[match.length - 1]
      results.confidence_scores.financial_year = 4
      break
    }
  }

  // ASRS-Compliant Revenue Extraction
  const revenuePatterns = [
    // Look for specific ASRS-compliant line items
    {
      pattern: /revenue from contracts with customers[\s$]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion|m|b|\$m|\$b)?/i,
      compliance: true,
      line_item: 'Revenue from contracts with customers'
    },
    {
      pattern: /interest income[\s$]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion|m|b|\$m|\$b)?/i,
      compliance: true,
      line_item: 'Interest Income'
    },
    {
      pattern: /total revenue[\s$]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion|m|b|\$m|\$b)?/i,
      compliance: true,
      line_item: 'Total Revenue'
    },
    {
      pattern: /total income[\s$]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion|m|b|\$m|\$b)?/i,
      compliance: true,
      line_item: 'Total Income'
    },
    // Non-compliant patterns (lower confidence)
    {
      pattern: /net operating income[\s$]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion|m|b|\$m|\$b)?/i,
      compliance: false,
      line_item: 'Net Operating Income'
    }
  ]

  for (const {pattern, compliance, line_item} of revenuePatterns) {
    const match = textLower.match(pattern)
    if (match) {
      let amount = parseFloat(match[1].replace(/,/g, ''))
      const unit = match[0].toLowerCase()
      
      // Convert to millions
      if (unit.includes('billion') || unit.includes(' b') || unit.includes('$b')) {
        amount *= 1000
      }
      
      if (amount >= 1 && amount <= 1000000) {
        results.total_revenue = {
          amount: amount,
          unit: 'million',
          currency: 'AUD',
          line_item: line_item
        }
        results.confidence_scores.total_revenue = compliance ? 5 : 3
        results.asrs_compliance_checks.revenue = compliance
        results.line_item_validation.revenue = {
          line_item: line_item,
          asrs_compliant: compliance,
          reason: compliance ? 'Aligns with ASRS-AASB S2 requirements' : 'Does not align - not gross income from ordinary activities'
        }
        break
      }
    }
  }

  // ASRS-Compliant Assets Extraction
  const assetPatterns = [
    {
      pattern: /total assets[\s$]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion|m|b|\$m|\$b)?/i,
      compliance: true,
      line_item: 'Total Assets'
    },
    {
      pattern: /total consolidated assets[\s$]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion|m|b|\$m|\$b)?/i,
      compliance: true,
      line_item: 'Total Consolidated Assets'
    },
    // Non-compliant
    {
      pattern: /net assets[\s$]*([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion|m|b|\$m|\$b)?/i,
      compliance: false,
      line_item: 'Net Assets'
    }
  ]

  for (const {pattern, compliance, line_item} of assetPatterns) {
    const match = textLower.match(pattern)
    if (match) {
      let amount = parseFloat(match[1].replace(/,/g, ''))
      const unit = match[0].toLowerCase()
      
      if (unit.includes('billion') || unit.includes(' b') || unit.includes('$b')) {
        amount *= 1000
      }
      
      if (amount >= 1 && amount <= 10000000) {
        results.total_assets = {
          amount: amount,
          unit: 'million',
          currency: 'AUD',
          line_item: line_item
        }
        results.confidence_scores.total_assets = compliance ? 5 : 3
        results.asrs_compliance_checks.assets = compliance
        results.line_item_validation.assets = {
          line_item: line_item,
          asrs_compliant: compliance,
          reason: compliance ? 'Aligns with ASRS-AASB S2 requirements' : 'Does not align - not total consolidated assets'
        }
        break
      }
    }
  }

  // Enhanced Employee Count with External Source Recommendations
  const employeePatterns = [
    /total\s+(?:number\s+of\s+)?(?:employees|workforce|staff|headcount)[\s:]*([0-9,]+)/i,
    /(?:employees|workforce|staff)\s+of\s+([0-9,]+)/i,
    /([0-9,]+)\s+(?:full-time\s+equivalent|fte|employees|staff)/i,
    /headcount[\s:]*([0-9,]+)/i
  ]

  let employeeFound = false
  for (const pattern of employeePatterns) {
    const match = textLower.match(pattern)
    if (match) {
      const count = parseInt(match[1].replace(/,/g, ''))
      if (count >= 10 && count <= 500000) {
        results.total_employees = {
          count: count,
          type: 'reported_in_annual_report'
        }
        results.confidence_scores.total_employees = 5
        employeeFound = true
        break
      }
    }
  }

  // If no employee data found, provide external sourcing guidance
  if (!employeeFound) {
    results.total_employees = {
      count: null,
      type: 'not_disclosed_in_annual_report',
      external_sourcing_required: true,
      recommended_sources: [
        'IBISWorld - Professional business intelligence',
        'LinkedIn company profile',
        'Company website (About Us/Careers pages)',
        'ZoomInfo/Crunchbase business directories'
      ],
      confidence_note: 'Figure not disclosed in Annual Report. External source required.'
    }
    results.confidence_scores.total_employees = 0
  }

  // ASRS Classification with enhanced logic
  if (results.total_revenue && results.total_assets && results.total_employees?.count) {
    const revenue = results.total_revenue.amount
    const assets = results.total_assets.amount
    const employees = results.total_employees.count

    const revenueGroup = revenue >= 500 ? 1 : revenue >= 200 ? 2 : revenue >= 50 ? 3 : 0
    const assetGroup = assets >= 1000 ? 1 : assets >= 500 ? 2 : assets >= 25 ? 3 : 0
    const employeeGroup = employees >= 500 ? 1 : employees >= 250 ? 2 : employees >= 100 ? 3 : 0

    const group1Count = [revenueGroup === 1, assetGroup === 1, employeeGroup === 1].filter(Boolean).length
    const group2Count = [revenueGroup === 2, assetGroup === 2, employeeGroup === 2].filter(Boolean).length
    const group3Count = [revenueGroup === 3, assetGroup === 3, employeeGroup === 3].filter(Boolean).length

    let classification = null
    if (group1Count >= 2) {
      classification = { group: 1, reporting_date: '1 July 2024', criteria_met: group1Count }
    } else if (group2Count >= 2) {
      classification = { group: 2, reporting_date: '1 July 2026', criteria_met: group2Count }
    } else if (group3Count >= 2) {
      classification = { group: 3, reporting_date: '1 July 2027', criteria_met: group3Count }
    } else {
      classification = { group: 0, reporting_date: 'No current requirement', criteria_met: 0 }
    }

    results.asrs_classification = classification
  }

  // Add compliance summary
  results.compliance_summary = {
    revenue_compliant: results.asrs_compliance_checks.revenue || false,
    assets_compliant: results.asrs_compliance_checks.assets || false,
    employee_data_available: employeeFound,
    overall_confidence: Object.values(results.confidence_scores).reduce((a, b) => a + b, 0) / Object.keys(results.confidence_scores).length
  }

  return results
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { documentUrl, companyName } = req.body

  try {
    console.log(`Starting enhanced FREE analysis for ${companyName}`)

    let documentText = ''
    if (documentUrl.toLowerCase().includes('.pdf')) {
      const response = await axios.get(documentUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      })
      const pdfData = await pdf(response.data)
      documentText = pdfData.text
    } else {
      const response = await axios.get(documentUrl, { timeout: 15000 })
      documentText = response.data
    }

    const analysis = extractASRSCompliantData(documentText, documentUrl)
    
    const results = {
      company_name: companyName,
      document_url: documentUrl,
      timestamp: new Date().toISOString(),
      analysis: analysis,
      ai_provider: 'Enhanced Pattern Matching (Free)',
      cost: '$0.00',
      features: [
        'ASRS-AASB S2 compliance checking',
        'Line item validation',
        'External sourcing recommendations',
        'Enhanced confidence scoring'
      ],
      status: 'success'
    }

    console.log(`Enhanced FREE analysis completed for ${companyName}`)
    res.json(results)

  } catch (error) {
    console.error('Enhanced free analysis error:', error.message)
    res.status(500).json({
      error: 'Enhanced analysis failed',
      details: error.message,
      status: 'error'
    })
  }
}
