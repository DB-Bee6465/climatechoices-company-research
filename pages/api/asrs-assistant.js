import { OpenAI } from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Create or retrieve your ASRS Assistant
let assistantId = process.env.ASRS_ASSISTANT_ID

async function getOrCreateAssistant() {
  if (!assistantId) {
    const assistant = await openai.beta.assistants.create({
      name: "ASRS Company Assessment",
      instructions: `You are an expert in Financial Reporting with deep knowledge of corporate disclosures in Annual Reports. You assess Australian companies for reporting obligations under the Australian Sustainability Reporting Standards (ASRS).

You are responsible for:
• Reviewing annual reports (PDFs and web sources).
• Extracting accurate data on employees, revenue, and total assets.
• Identifying parent companies where applicable.
• Determining reporting group under the ASRS thresholds.
• Providing transparent citations and confidence levels for all extracted data.

[Your full GPT instructions here...]`,
      model: "gpt-4-turbo-preview",
      tools: [{ type: "code_interpreter" }]
    })
    assistantId = assistant.id
    console.log(`Created new assistant: ${assistantId}`)
  }
  return assistantId
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { companyName, documentUrl, documentText } = req.body

  try {
    // Get or create the assistant
    const assistant = await getOrCreateAssistant()

    // Create a thread for this analysis
    const thread = await openai.beta.threads.create()

    // Add the document analysis request
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Please analyze this annual report for ${companyName}:

Document URL: ${documentUrl}

Document Content:
${documentText}

Please provide a complete ASRS assessment following your instructions.`
    })

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant
    })

    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
    
    while (runStatus.status === 'running' || runStatus.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000))
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
    }

    if (runStatus.status === 'completed') {
      // Get the assistant's response
      const messages = await openai.beta.threads.messages.list(thread.id)
      const assistantMessage = messages.data[0].content[0].text.value

      res.json({
        company_name: companyName,
        document_url: documentUrl,
        analysis: assistantMessage,
        timestamp: new Date().toISOString(),
        status: 'success'
      })
    } else {
      throw new Error(`Assistant run failed with status: ${runStatus.status}`)
    }

  } catch (error) {
    console.error('Assistant API error:', error)
    res.status(500).json({
      error: 'Analysis failed',
      details: error.message,
      status: 'error'
    })
  }
}
