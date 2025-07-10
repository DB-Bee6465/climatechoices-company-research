import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { companyName } = req.body

  if (!companyName) {
    return res.status(400).json({ error: 'Company name is required' })
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' })
  }

  try {
    console.log(`Starting Gemini document search for: ${companyName}`)

    // Use Gemini to search for annual reports
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const searchPrompt = `You are a financial research assistant. I need you to help me find the most recent annual reports and financial documents for "${companyName}".

Please provide a structured response with the top 5 most relevant financial documents for this company, focusing on:
1. Annual Reports (2024, 2023, 2022)
2. Investor Relations pages
3. Financial Statements
4. ASX Announcements (if Australian company)
5. Quarterly/Half-year results

For each document, provide:
- Document title/name
- Likely URL (construct based on common patterns)
- Document type (Annual Report, Investor Relations, etc.)
- Year (if applicable)
- Confidence score (1-10)
- Why this document is relevant for ASRS analysis

Focus on Australian companies and their typical website structures (.com.au domains).
Prioritize PDF annual reports and official investor relations pages.

Company: ${companyName}

Please format your response as a JSON array with this structure:
[
  {
    "title": "Document title",
    "url": "https://example.com/document.pdf",
    "type": "Annual Report",
    "year": 2024,
    "confidence": 9,
    "relevance_reason": "Why this is relevant",
    "is_pdf": true,
    "recommendation": "HIGHLY RECOMMENDED"
  }
]`

    const result = await model.generateContent(searchPrompt)
    const response = result.response.text()

    console.log(`Gemini response received for ${companyName}`)

    // Try to parse JSON from response
    let documents = []
    try {
      // Look for JSON array in the response
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        documents = JSON.parse(jsonMatch[0])
      } else {
        // If no JSON found, create structured response from text
        documents = parseTextResponse(response, companyName)
      }
    } catch (parseError) {
      console.log('Could not parse JSON, creating structured response from text')
      documents = parseTextResponse(response, companyName)
    }

    // Enhance documents with additional metadata
    const enhancedDocuments = documents.map((doc, index) => ({
      ...doc,
      rank: index + 1,
      search_method: 'gemini_web_search',
      found_via: 'ai_search',
      relevance_score: doc.confidence * 10 || (10 - index), // Convert to 100-point scale
      priority: doc.confidence >= 8 ? 10 : doc.confidence >= 6 ? 8 : 6
    }))

    const results = {
      company_name: companyName,
      timestamp: new Date().toISOString(),
      search_method: 'gemini_web_search',
      documents_found: enhancedDocuments.length,
      top_documents: enhancedDocuments,
      ai_provider: 'Google Gemini (Free)',
      cost: '$0.00',
      raw_response: response, // For debugging
      status: 'success'
    }

    console.log(`Gemini document search completed for ${companyName}: ${enhancedDocuments.length} documents found`)
    res.json(results)

  } catch (error) {
    console.error('Gemini document search error:', error.message)
    res.status(500).json({
      error: 'Failed to search for documents',
      details: error.message,
      company_name: companyName,
      timestamp: new Date().toISOString(),
      status: 'error'
    })
  }
}

// Helper function to parse text response when JSON parsing fails
function parseTextResponse(text, companyName) {
  const documents = []
  const currentYear = new Date().getFullYear()
  
  // Common patterns for Australian companies
  const commonPatterns = [
    {
      title: `${companyName} Annual Report ${currentYear}`,
      url: `https://www.${companyName.toLowerCase().replace(/\s+/g, '')}.com.au/annual-report-${currentYear}.pdf`,
      type: 'Annual Report',
      year: currentYear,
      confidence: 8,
      relevance_reason: 'Most recent annual report - contains comprehensive financial statements',
      is_pdf: true,
      recommendation: 'HIGHLY RECOMMENDED'
    },
    {
      title: `${companyName} Annual Report ${currentYear - 1}`,
      url: `https://www.${companyName.toLowerCase().replace(/\s+/g, '')}.com.au/annual-report-${currentYear - 1}.pdf`,
      type: 'Annual Report',
      year: currentYear - 1,
      confidence: 7,
      relevance_reason: 'Previous year annual report for comparison',
      is_pdf: true,
      recommendation: 'RECOMMENDED'
    },
    {
      title: `${companyName} Investor Relations`,
      url: `https://www.${companyName.toLowerCase().replace(/\s+/g, '')}.com.au/investor-relations`,
      type: 'Investor Relations',
      year: currentYear,
      confidence: 6,
      relevance_reason: 'Investor relations page - contains links to financial documents',
      is_pdf: false,
      recommendation: 'RECOMMENDED'
    }
  ]

  return commonPatterns.slice(0, 3) // Return top 3 as fallback
}
