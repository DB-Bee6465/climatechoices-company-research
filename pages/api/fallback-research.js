// Fallback research API that works without Gemini API key
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { companyName, websiteUrl } = req.body

  if (!companyName) {
    return res.status(400).json({ error: 'Company name is required' })
  }

  try {
    console.log(`Starting fallback research for: ${companyName}`)

    // Generate intelligent document suggestions based on company name
    const documents = generateIntelligentDocuments(companyName, websiteUrl)

    const results = {
      company_name: companyName,
      website: websiteUrl || `https://www.${companyName.toLowerCase().replace(/\s+/g, '')}.com.au`,
      description: `Fallback research results for ${companyName}`,
      timestamp: new Date().toISOString(),
      
      // Document discovery results
      recent_financial_documents: documents,
      documents_found: documents.length,
      
      // Metadata
      search_method: 'intelligent_fallback',
      ai_provider: 'Pattern-based (Free)',
      cost: '$0.00',
      api_version: '4.0.0-fallback',
      
      // For compatibility with existing frontend
      data: {
        recent_financial_documents: documents,
        website: {
          financial_links: documents.map(doc => ({
            ...doc,
            text: doc.title,
            url: doc.url,
            type: doc.type.toLowerCase().replace(/\s+/g, '_')
          }))
        }
      },
      
      status: 'success'
    }

    console.log(`Fallback research completed for ${companyName}: ${documents.length} documents found`)
    res.json(results)

  } catch (error) {
    console.error('Fallback research error:', error.message)
    res.status(500).json({
      error: 'Failed to research company',
      details: error.message,
      company_name: companyName,
      timestamp: new Date().toISOString(),
      status: 'error'
    })
  }
}

function generateIntelligentDocuments(companyName, websiteUrl) {
  const currentYear = new Date().getFullYear()
  const mostRecentReportYear = currentYear - 1 // Annual reports are always for the previous year
  const cleanName = companyName.toLowerCase().replace(/\s+/g, '')
  
  // Enhanced URL patterns for major Australian companies
  const companyPatterns = {
    'telstra': {
      baseUrl: 'https://www.telstra.com.au',
      annualReportPath: '/aboutus/investors/annual-reports',
      investorRelations: '/aboutus/investors',
      asxAnnouncements: '/aboutus/investors/asx-announcements',
      sustainability: '/aboutus/sustainability'
    },
    'westpac': {
      baseUrl: 'https://www.westpac.com.au',
      annualReportPath: '/about-westpac/investor-centre/annual-reports',
      investorRelations: '/about-westpac/investor-centre',
      asxAnnouncements: '/about-westpac/investor-centre/asx-announcements',
      sustainability: '/about-westpac/sustainability'
    },
    'commonwealth bank': {
      baseUrl: 'https://www.commbank.com.au',
      annualReportPath: '/about-us/investors/annual-reports',
      investorRelations: '/about-us/investors',
      asxAnnouncements: '/about-us/investors/asx-announcements',
      sustainability: '/about-us/sustainability'
    },
    'anz': {
      baseUrl: 'https://www.anz.com.au',
      annualReportPath: '/about-us/investor-centre/annual-reports',
      investorRelations: '/about-us/investor-centre',
      asxAnnouncements: '/about-us/investor-centre/asx-announcements',
      sustainability: '/about-us/esg'
    },
    'nab': {
      baseUrl: 'https://www.nab.com.au',
      annualReportPath: '/about-us/investor-centre/annual-reports',
      investorRelations: '/about-us/investor-centre',
      asxAnnouncements: '/about-us/investor-centre/shareholder-centre',
      sustainability: '/about-us/corporate-responsibility'
    },
    'woolworths': {
      baseUrl: 'https://www.woolworthsgroup.com.au',
      annualReportPath: '/page/investors/our-performance/annual-reports',
      investorRelations: '/page/investors',
      asxAnnouncements: '/page/investors/asx-announcements',
      sustainability: '/page/sustainability'
    },
    'bank of sydney': {
      baseUrl: 'https://www.bankofsydney.com.au',
      annualReportPath: '/about-us/investor-relations/annual-reports',
      investorRelations: '/about-us/investor-relations',
      asxAnnouncements: '/about-us/investor-relations/announcements',
      sustainability: '/about-us/corporate-responsibility'
    }
  }
  
  // Get company-specific patterns or use defaults
  const patterns = companyPatterns[companyName.toLowerCase()] || {
    baseUrl: websiteUrl || `https://www.${cleanName}.com.au`,
    annualReportPath: '/investor-relations/annual-reports',
    investorRelations: '/investor-relations',
    asxAnnouncements: '/investor-relations/asx-announcements',
    sustainability: '/sustainability'
  }

  // Generate multiple URL variations for annual reports
  const annualReportUrls = [
    `${patterns.baseUrl}${patterns.annualReportPath}/${mostRecentReportYear}-annual-report.pdf`,
    `${patterns.baseUrl}${patterns.annualReportPath}/annual-report-${mostRecentReportYear}.pdf`,
    `${patterns.baseUrl}/content/dam/tcom/about-us/investors/annual-report-${mostRecentReportYear}.pdf`, // Telstra specific
    `${patterns.baseUrl}/investors/annual-report-${mostRecentReportYear}.pdf` // Generic fallback
  ]

  // Generate intelligent document suggestions with multiple URL options
  const documents = [
    {
      title: `${companyName} Annual Report ${mostRecentReportYear}`,
      url: annualReportUrls[0], // Primary URL
      alternativeUrls: annualReportUrls.slice(1), // Backup URLs
      type: 'Annual Report',
      year: mostRecentReportYear,
      confidence: 8, // Reduced confidence since we're guessing URLs
      relevance_reason: `Most recent annual report (${mostRecentReportYear}) - essential for ASRS analysis. Multiple URL patterns attempted.`,
      is_pdf: true,
      recommendation: 'HIGHLY RECOMMENDED',
      rank: 1,
      relevance_score: 95,
      priority: 10,
      found_via: 'enhanced_pattern_matching',
      document_type: 'Annual Report',
      note: 'If this URL fails, try the Investor Relations page below to find the correct annual report link.'
    },
    {
      title: `${companyName} Investor Relations`,
      url: `${patterns.baseUrl}${patterns.investorRelations}`,
      type: 'Investor Relations',
      year: currentYear,
      confidence: 9, // High confidence for main pages
      relevance_reason: 'Investor relations hub - contains links to annual reports and financial documents',
      is_pdf: false,
      recommendation: 'HIGHLY RECOMMENDED',
      rank: 2,
      relevance_score: 90,
      priority: 9,
      found_via: 'enhanced_pattern_matching',
      document_type: 'Investor Relations',
      note: 'Start here if direct PDF links fail - this page will have links to all annual reports.'
    },
    {
      title: `${companyName} Annual Report ${mostRecentReportYear - 1}`,
      url: `${patterns.baseUrl}${patterns.annualReportPath}/annual-report-${mostRecentReportYear - 1}.pdf`,
      type: 'Annual Report',
      year: mostRecentReportYear - 1,
      confidence: 7,
      relevance_reason: `Previous year annual report (${mostRecentReportYear - 1}) for comparison`,
      is_pdf: true,
      recommendation: 'RECOMMENDED',
      rank: 3,
      relevance_score: 85,
      priority: 8,
      found_via: 'enhanced_pattern_matching',
      document_type: 'Annual Report'
    },
    {
      title: `${companyName} ASX Announcements`,
      url: `${patterns.baseUrl}${patterns.asxAnnouncements}`,
      type: 'ASX Announcements',
      year: currentYear,
      confidence: 8,
      relevance_reason: 'ASX announcements including financial results and regulatory updates',
      is_pdf: false,
      recommendation: 'RECOMMENDED',
      rank: 4,
      relevance_score: 75,
      priority: 7,
      found_via: 'enhanced_pattern_matching',
      document_type: 'ASX Announcements'
    },
    {
      title: `${companyName} Sustainability Report ${mostRecentReportYear}`,
      url: `${patterns.baseUrl}${patterns.sustainability}/sustainability-report-${mostRecentReportYear}.pdf`,
      type: 'Sustainability Report',
      year: mostRecentReportYear,
      confidence: 6,
      relevance_reason: `ESG and sustainability information (${mostRecentReportYear}) relevant to ASRS`,
      is_pdf: true,
      recommendation: 'CONSIDER',
      rank: 5,
      relevance_score: 65,
      priority: 6,
      found_via: 'enhanced_pattern_matching',
      document_type: 'Sustainability Report'
    }
  ]

  return documents
}
