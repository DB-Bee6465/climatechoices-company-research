import axios from 'axios'
import pdf from 'pdf-parse'

// Ollama runs locally - completely free
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { documentUrl, companyName } = req.body

  if (!documentUrl || !companyName) {
    return res.status(400).json({ error: 'Document URL and company name are required' })
  }

  try {
    console.log(`Starting FREE Ollama ASRS analysis for ${companyName}`)

    // Extract document content
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

    // Truncate for local model
    if (documentText.length > 20000) {
      documentText = documentText.substring(0, 20000) + '\n\n[Document truncated]'
    }

    // Call local Ollama instance
    const ollamaResponse = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: `You are an expert in Financial Reporting analyzing Australian companies for ASRS compliance.

Extract from this annual report for ${companyName}:
1. Company Name
2. Financial Year
3. Total Employees (with confidence 1-5)
4. Total Revenue in AUD (with confidence 1-5)
5. Total Assets in AUD (with confidence 1-5)
6. ASRS Group classification (1, 2, 3, or none)

Document: ${documentText}

Provide structured analysis:`,
      stream: false
    }, {
      timeout: 60000 // Local models can be slower
    })

    const analysis = ollamaResponse.data.response

    const results = {
      company_name: companyName,
      document_url: documentUrl,
      timestamp: new Date().toISOString(),
      analysis: analysis,
      ai_provider: `Ollama ${OLLAMA_MODEL} (Free Local)`,
      cost: '$0.00',
      processing_time: 'Variable (local)',
      status: 'success'
    }

    console.log(`FREE Ollama analysis completed for ${companyName}`)
    res.json(results)

  } catch (error) {
    console.error('Ollama analysis error:', error.message)
    
    // Provide helpful setup instructions if Ollama isn't running
    if (error.code === 'ECONNREFUSED') {
      return res.status(500).json({
        error: 'Ollama not running',
        setup_instructions: [
          '1. Install Ollama: https://ollama.ai',
          '2. Run: ollama pull llama3.1:8b',
          '3. Start: ollama serve',
          '4. Set OLLAMA_URL environment variable if needed'
        ],
        status: 'setup_required'
      })
    }

    res.status(500).json({
      error: 'Ollama analysis failed',
      details: error.message,
      status: 'error'
    })
  }
}
