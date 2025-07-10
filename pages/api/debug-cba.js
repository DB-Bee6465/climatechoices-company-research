import axios from 'axios'
import pdf from 'pdf-parse'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const documentUrl = 'https://www.commbank.com.au/content/dam/commbank-assets/investors/docs/results/fy24/2024-Annual-Report_spreads.pdf'
    
    console.log('Fetching Commonwealth Bank annual report...')
    const response = await axios.get(documentUrl, { 
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: 50 * 1024 * 1024 // 50MB limit
    })
    
    console.log('Parsing PDF...')
    const pdfData = await pdf(response.data)
    const documentText = pdfData.text
    
    console.log(`Document length: ${documentText.length} characters`)
    console.log(`Estimated tokens: ${Math.ceil(documentText.length / 4)}`)
    
    // Search for key financial statement indicators
    const searches = [
      'total assets',
      'consolidated statement of financial position',
      'statement of financial position', 
      'balance sheet',
      'consolidated balance sheet',
      'assets total',
      'total current and non-current assets'
    ]
    
    const results = {}
    
    searches.forEach(term => {
      const regex = new RegExp(term, 'gi')
      const matches = documentText.match(regex) || []
      results[term] = {
        count: matches.length,
        positions: []
      }
      
      // Find positions of matches
      let match
      const searchRegex = new RegExp(term, 'gi')
      while ((match = searchRegex.exec(documentText)) !== null) {
        const position = match.index
        const percentage = Math.round((position / documentText.length) * 100)
        const context = documentText.substring(position - 100, position + 200)
        results[term].positions.push({
          position,
          percentage,
          context: context.replace(/\s+/g, ' ').trim()
        })
      }
    })
    
    // Look for large numbers that might be total assets (in millions/billions)
    const numberPattern = /\$?[\d,]+\.?\d*\s*(million|billion|m|b)\b/gi
    const largeNumbers = []
    let match
    while ((match = numberPattern.exec(documentText)) !== null) {
      const number = match[0]
      const position = match.index
      const percentage = Math.round((position / documentText.length) * 100)
      const context = documentText.substring(position - 50, position + 100)
      
      // Extract numeric value
      const numericValue = parseFloat(number.replace(/[,$]/g, '').replace(/[mb]/i, ''))
      if (numericValue > 100) { // Only large numbers that could be total assets
        largeNumbers.push({
          number,
          numericValue,
          position,
          percentage,
          context: context.replace(/\s+/g, ' ').trim()
        })
      }
    }
    
    // Sort large numbers by value (descending)
    largeNumbers.sort((a, b) => b.numericValue - a.numericValue)
    
    // Sample different sections of the document
    const sections = {
      beginning: documentText.substring(0, 2000),
      quarter: documentText.substring(Math.floor(documentText.length * 0.25), Math.floor(documentText.length * 0.25) + 2000),
      middle: documentText.substring(Math.floor(documentText.length * 0.5), Math.floor(documentText.length * 0.5) + 2000),
      threeQuarter: documentText.substring(Math.floor(documentText.length * 0.75), Math.floor(documentText.length * 0.75) + 2000),
      end: documentText.substring(documentText.length - 2000)
    }
    
    return res.status(200).json({
      document_stats: {
        length: documentText.length,
        estimated_tokens: Math.ceil(documentText.length / 4)
      },
      search_results: results,
      large_numbers: largeNumbers.slice(0, 20), // Top 20 largest numbers
      document_sections: sections,
      analysis: {
        total_assets_mentions: results['total assets'].count,
        balance_sheet_mentions: results['balance sheet'].count + results['consolidated balance sheet'].count,
        financial_position_mentions: results['statement of financial position'].count + results['consolidated statement of financial position'].count
      }
    })
    
  } catch (error) {
    console.error('Debug analysis error:', error)
    return res.status(500).json({ 
      error: 'Debug analysis failed',
      details: error.message 
    })
  }
}
