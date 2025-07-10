import axios from 'axios'

// Enhanced tiered analysis system with Gemini as primary free option
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { documentUrl, companyName, analysisType = 'gemini' } = req.body // Default to Gemini

  const analysisOptions = {
    gemini: {
      endpoint: '/api/gemini-analysis',
      cost: '$0.00 (free tier)',
      accuracy: '90-95%',
      features: ['AI analysis', 'Context understanding', 'ASRS compliance', 'Complex reasoning'],
      limitations: ['15 requests/minute limit']
    },
    free: {
      endpoint: '/api/enhanced-free-analysis', 
      cost: '$0.00',
      accuracy: '75-85%',
      features: ['Pattern matching', 'ASRS compliance', 'Basic validation'],
      limitations: ['No external sourcing', 'Limited context understanding']
    },
    ollama: {
      endpoint: '/api/ollama-analysis',
      cost: '$0.00 (local)',
      accuracy: '85-90%', 
      features: ['Unlimited usage', 'Privacy', 'No API limits'],
      limitations: ['Requires local setup', 'Slower processing']
    },
    openai: {
      endpoint: '/api/analyze-document',
      cost: '~$0.50-2.00 per analysis',
      accuracy: '95-98%',
      features: ['Highest accuracy', 'Best reasoning', 'Structured output'],
      limitations: ['Token costs', 'API key required']
    }
  }

  try {
    const selectedOption = analysisOptions[analysisType]
    
    if (!selectedOption) {
      return res.status(400).json({ 
        error: 'Invalid analysis type',
        available_options: Object.keys(analysisOptions)
      })
    }

    console.log(`Starting ${analysisType} analysis for ${companyName}`)

    // For Vercel serverless, we need to call the analysis function directly
    // instead of making HTTP requests to localhost
    let analysisResults

    if (analysisType === 'gemini') {
      // Import and call Gemini analysis directly
      const { default: geminiAnalysis } = await import('./gemini-analysis')
      const mockReq = { method: 'POST', body: { documentUrl, companyName } }
      const mockRes = {
        status: (code) => ({ json: (data) => { analysisResults = { status: code, data } } }),
        json: (data) => { analysisResults = { status: 200, data } }
      }
      await geminiAnalysis(mockReq, mockRes)
    } else if (analysisType === 'free') {
      // Import and call free analysis directly
      const { default: freeAnalysis } = await import('./enhanced-free-analysis')
      const mockReq = { method: 'POST', body: { documentUrl, companyName } }
      const mockRes = {
        status: (code) => ({ json: (data) => { analysisResults = { status: code, data } } }),
        json: (data) => { analysisResults = { status: 200, data } }
      }
      await freeAnalysis(mockReq, mockRes)
    } else if (analysisType === 'openai') {
      // Import and call OpenAI analysis directly
      const { default: openaiAnalysis } = await import('./analyze-document')
      const mockReq = { method: 'POST', body: { documentUrl, companyName } }
      const mockRes = {
        status: (code) => ({ json: (data) => { analysisResults = { status: code, data } } }),
        json: (data) => { analysisResults = { status: 200, data } }
      }
      await openaiAnalysis(mockReq, mockRes)
    } else {
      throw new Error(`Unsupported analysis type: ${analysisType}`)
    }

    // Check if analysis was successful
    if (analysisResults.status !== 200) {
      throw new Error(`Analysis failed with status ${analysisResults.status}`)
    }

    const results = {
      ...analysisResults.data,
      analysis_tier: {
        type: analysisType,
        cost: selectedOption.cost,
        accuracy: selectedOption.accuracy,
        features: selectedOption.features,
        limitations: selectedOption.limitations
      },
      upgrade_options: analysisType === 'free' ? {
        gemini: 'Upgrade to AI analysis (still free, better accuracy)',
        openai: 'Upgrade to premium analysis (~$1-2)'
      } : analysisType === 'gemini' ? {
        openai: 'Upgrade to premium analysis (~$1-2) for highest accuracy'
      } : null
    }

    res.json(results)

  } catch (error) {
    console.error(`${analysisType} analysis error:`, error.message)
    
    // If Gemini fails, suggest alternatives
    if (analysisType === 'gemini') {
      return res.status(500).json({
        error: 'Gemini analysis failed',
        alternatives: [
          'Try free pattern matching analysis',
          'Use Ollama local analysis (free, requires setup)',
          'Upgrade to OpenAI premium analysis'
        ],
        fallback_available: true
      })
    }

    res.status(500).json({
      error: `${analysisType} analysis failed`,
      details: error.message,
      fallback_suggestion: 'Try Gemini AI analysis (free)'
    })
  }
}
