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
  // Known Australian companies database
  const knownCompanies = {
    'commonwealth bank': 'https://www.commbank.com.au',
    'commonwealth bank australia': 'https://www.commbank.com.au',
    'commonwealth bank of australia': 'https://www.commbank.com.au',
    'cba': 'https://www.commbank.com.au',
    'commbank': 'https://www.commbank.com.au',
    'westpac': 'https://www.westpac.com.au',
    'westpac banking corporation': 'https://www.westpac.com.au',
    'anz': 'https://www.anz.com.au',
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
    'fortescue metals': 'https://www.fmgl.com.au',
    'fortescue metals group': 'https://www.fmgl.com.au',
    'qantas': 'https://www.qantas.com',
    'qantas airways': 'https://www.qantas.com',
    'virgin australia': 'https://www.virginaustralia.com',
    'jetstar': 'https://www.jetstar.com',
    'australian military bank': 'https://www.australianmilitarybank.com.au',
    'defence bank': 'https://www.defencebank.com.au',
    'police bank': 'https://www.policebank.com.au',
    'teachers mutual bank': 'https://www.tmbank.com.au',
    'bendigo bank': 'https://www.bendigobank.com.au',
    'suncorp': 'https://www.suncorp.com.au',
    'suncorp group': 'https://www.suncorp.com.au',
    'insurance australia group': 'https://www.iag.com.au',
    'iag': 'https://www.iag.com.au',
    'medibank': 'https://www.medibank.com.au',
    'bupa': 'https://www.bupa.com.au',
    'harvey norman': 'https://www.harveynorman.com.au',
    'jb hi-fi': 'https://www.jbhifi.com.au',
    'bunnings': 'https://www.bunnings.com.au',
    'officeworks': 'https://www.officeworks.com.au',
    'kmart': 'https://www.kmart.com.au',
    'target': 'https://www.target.com.au',
    'big w': 'https://www.bigw.com.au',
    'myer': 'https://www.myer.com.au',
    'david jones': 'https://www.davidjones.com',
    'wesfarmers': 'https://www.wesfarmers.com.au',
    'stockland': 'https://www.stockland.com.au',
    'mirvac': 'https://www.mirvac.com',
    'lendlease': 'https://www.lendlease.com',
    'goodman group': 'https://www.goodman.com',
    'transurban': 'https://www.transurban.com',
    'sydney airport': 'https://www.sydneyairport.com.au',
    'melbourne airport': 'https://www.melbourneairport.com.au',
    'origin energy': 'https://www.originenergy.com.au',
    'agl energy': 'https://www.agl.com.au',
    'santos': 'https://www.santos.com',
    'woodside': 'https://www.woodside.com',
    'newcrest mining': 'https://www.newcrest.com',
    'northern star resources': 'https://www.nsrltd.com',
    'evolution mining': 'https://www.evolutionmining.com.au',
    'gold road resources': 'https://www.goldroad.com.au',
    'mineral resources': 'https://www.mineralresources.com.au',
    'pilbara minerals': 'https://www.pilbaraminerals.com.au',
    'lynas rare earths': 'https://www.lynasrareearths.com',
    'orica': 'https://www.orica.com',
    'incitec pivot': 'https://www.incitecpivot.com.au',
    'nufarm': 'https://www.nufarm.com',
    'elders': 'https://www.elders.com.au',
    'graincorp': 'https://www.graincorp.com.au',
    'treasury wine estates': 'https://www.tweglobal.com',
    'coca-cola amatil': 'https://www.ccamatil.com',
    'lion': 'https://www.lion.com.au',
    'carlton & united breweries': 'https://www.cub.com.au',
    'foster\'s group': 'https://www.fosters.com.au',
    'arnott\'s': 'https://www.arnotts.com',
    'unilever australia': 'https://www.unilever.com.au',
    'nestle australia': 'https://www.nestle.com.au',
    'kellogg australia': 'https://www.kelloggs.com.au',
    'mars australia': 'https://www.mars.com/australia',
    'mondelez australia': 'https://www.mondelezinternational.com/australia',
    'cadbury': 'https://www.cadbury.com.au',
    'blackmores': 'https://www.blackmores.com.au',
    'cochlear': 'https://www.cochlear.com',
    'csl': 'https://www.csl.com',
    'csl limited': 'https://www.csl.com',
    'resmed': 'https://www.resmed.com',
    'sonic healthcare': 'https://www.sonichealthcare.com',
    'healius': 'https://www.healius.com.au',
    'ramsay health care': 'https://www.ramsayhealth.com',
    'ansell': 'https://www.ansell.com',
    'fisher & paykel healthcare': 'https://www.fphcare.com',
    'computershare': 'https://www.computershare.com',
    'macquarie group': 'https://www.macquarie.com',
    'perpetual': 'https://www.perpetual.com.au',
    'challenger': 'https://www.challenger.com.au',
    'amp': 'https://www.amp.com.au',
    'amp limited': 'https://www.amp.com.au',
    'ioof': 'https://www.ioof.com.au',
    'magellan financial group': 'https://www.magellangroup.com.au',
    'platinum asset management': 'https://www.platinum.com.au',
    'pendal group': 'https://www.pendalgroup.com',
    'janus henderson': 'https://www.janushenderson.com',
    'vanguard australia': 'https://www.vanguard.com.au',
    'blackrock australia': 'https://www.blackrock.com/au',
    'fidelity australia': 'https://www.fidelity.com.au',
    'colonial first state': 'https://www.cfs.com.au',
    'bt financial group': 'https://www.bt.com.au',
    'onepath': 'https://www.onepath.com.au',
    'axa': 'https://www.axa.com.au',
    'zurich australia': 'https://www.zurich.com.au',
    'allianz australia': 'https://www.allianz.com.au',
    'qbe insurance': 'https://www.qbe.com',
    'suncorp insurance': 'https://www.suncorp.com.au',
    'aami': 'https://www.aami.com.au',
    'racv': 'https://www.racv.com.au',
    'nrma': 'https://www.nrma.com.au',
    'rac': 'https://www.rac.com.au',
    'youi': 'https://www.youi.com.au',
    'budget direct': 'https://www.budgetdirect.com.au',
    'real insurance': 'https://www.realinsurance.com.au',
    'woolworths insurance': 'https://www.woolworthsinsurance.com.au',
    'coles insurance': 'https://www.colesinsurance.com.au'
  }
  
  const cleanName = companyName.toLowerCase().trim()
  
  // Check known companies first
  if (knownCompanies[cleanName]) {
    return knownCompanies[cleanName]
  }
  
  // Check partial matches
  for (const [key, url] of Object.entries(knownCompanies)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return url
    }
  }
  
  // Fallback to heuristic approach
  const simpleName = cleanName
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
  
  // Try common Australian domain patterns
  const possibleUrls = [
    `https://www.${simpleName}.com.au`,
    `https://www.${simpleName}.com`,
    `https://${simpleName}.com.au`,
    `https://${simpleName}.com`
  ]
  
  return possibleUrls[0]
}

async function scrapeWebsite(url) {
  try {
    console.log(`Attempting to scrape: ${url}`)
    
    const response = await axios.get(url, {
      timeout: 15000, // Increased timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept redirects
      }
    })

    console.log(`Successfully fetched ${url}, status: ${response.status}`)

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

    console.log(`Extracted data from ${url}: title="${title}", emails=${emails.length}, phones=${phones.length}`)

    return {
      url,
      title,
      description: description.trim(),
      contact_info: {
        emails: emails.slice(0, 3), // Limit to 3
        phones: phones.slice(0, 3)  // Limit to 3
      },
      status: 'success'
    }
  } catch (error) {
    console.error(`Error scraping website ${url}:`, error.message)
    
    // Return more detailed error information
    return {
      url,
      title: 'Website not accessible',
      description: `Could not access website: ${error.message}`,
      contact_info: { emails: [], phones: [] },
      status: 'error',
      error: error.message
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
      data: {}
    }

    // Determine website URL
    const targetUrl = websiteUrl || findCompanyWebsite(companyName)
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
          research_status: 'success'
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
          message: 'Website accessed but financial data extraction failed'
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
        message: `Could not access website: ${targetUrl}. Please check the company name or provide a valid website URL.`,
        suggestions: [
          'Try providing the exact website URL',
          'Check if the company name is spelled correctly',
          'Ensure the company has an online presence'
        ]
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
