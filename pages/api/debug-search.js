// Debug endpoint to test search query generation and domain detection
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { companyName, websiteUrl, selectedYear } = req.body

  if (!companyName) {
    return res.status(400).json({ error: 'Company name is required' })
  }

  try {
    console.log(`DEBUG: Testing search logic for: ${companyName}`)

    // Replicate the exact domain detection logic
    let siteDomain = ''
    
    // First, try to extract from provided websiteUrl
    if (websiteUrl && websiteUrl !== 'https://www.company.com.au' && !websiteUrl.includes('company.com.au')) {
      try {
        const url = new URL(websiteUrl)
        siteDomain = url.hostname.replace('www.', '')
        console.log(`DEBUG: Using provided domain: ${siteDomain}`)
      } catch (e) {
        console.log('DEBUG: Could not parse provided website URL')
      }
    }
    
    // If no valid domain provided, detect based on company name
    if (!siteDomain) {
      const companyLower = companyName.toLowerCase()
      if (companyLower.includes('commonwealth bank')) {
        siteDomain = 'commbank.com.au'
      } else if (companyLower.includes('telstra')) {
        siteDomain = 'telstra.com.au'
      } else if (companyLower.includes('westpac')) {
        siteDomain = 'westpac.com.au'
      } else if (companyLower.includes('anz')) {
        siteDomain = 'anz.com.au'
      } else if (companyLower.includes('bhp')) {
        siteDomain = 'bhp.com'
      } else if (companyLower.includes('woolworths')) {
        siteDomain = 'woolworthsgroup.com.au'
      } else if (companyLower.includes('csl')) {
        siteDomain = 'csl.com'
      }
      
      if (siteDomain) {
        console.log(`DEBUG: Auto-detected domain for ${companyName}: ${siteDomain}`)
      } else {
        console.log(`DEBUG: Could not auto-detect domain for ${companyName}`)
      }
    }

    // Replicate the exact search query generation logic
    let searchQueries = []
    
    if (selectedYear) {
      console.log(`DEBUG: Targeting specific year: ${selectedYear} on official domain: ${siteDomain}`)
      searchQueries = [
        `"${companyName}" annual report ${selectedYear} filetype:pdf site:${siteDomain}`,
        `"${companyName}" ${selectedYear} annual report site:${siteDomain}`,
        `annual report ${selectedYear} site:${siteDomain}`,
        `financial statements ${selectedYear} site:${siteDomain}`,
        `investor relations ${selectedYear} site:${siteDomain}`
      ]
    } else {
      console.log(`DEBUG: Searching all recent years on official domain: ${siteDomain}`)
      searchQueries = [
        `annual report 2024 filetype:pdf site:${siteDomain}`,
        `annual report 2023 filetype:pdf site:${siteDomain}`,
        `financial statements 2024 site:${siteDomain}`,
        `investor relations site:${siteDomain}`,
        `sustainability report 2024 site:${siteDomain}`
      ]
    }

    // Return comprehensive debug information
    const debugResults = {
      test_timestamp: new Date().toISOString(),
      input_data: {
        company_name: companyName,
        website_url: websiteUrl,
        selected_year: selectedYear
      },
      domain_detection: {
        company_name_lowercase: companyName.toLowerCase(),
        detected_domain: siteDomain,
        detection_successful: !!siteDomain,
        detection_method: websiteUrl && websiteUrl !== 'https://www.company.com.au' ? 'from_provided_url' : 'auto_detected'
      },
      search_queries: {
        total_queries: searchQueries.length,
        queries: searchQueries,
        year_targeting: selectedYear ? `Specific year: ${selectedYear}` : 'All recent years'
      },
      expected_behavior: {
        should_find_only: `Documents from ${siteDomain}`,
        should_reject: 'All third-party domains',
        search_focus: selectedYear ? `${selectedYear} documents only` : '2024, 2023, 2022 documents'
      },
      next_steps: [
        'These queries will be sent to SerpAPI/Google',
        'Results will be filtered to only include the detected domain',
        'Final results should contain only official company documents'
      ]
    }

    console.log(`DEBUG: Test completed for ${companyName}`)
    res.json(debugResults)

  } catch (error) {
    console.error('DEBUG: Test error:', error.message)
    res.status(500).json({
      error: 'Debug test failed',
      details: error.message,
      company_name: companyName,
      timestamp: new Date().toISOString()
    })
  }
}
