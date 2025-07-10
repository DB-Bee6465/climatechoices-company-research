import { OpenAI } from 'openai'
import axios from 'axios'
import pdf from 'pdf-parse'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Enhanced ASRS analysis prompt with your latest improvements
const ENHANCED_ASRS_PROMPT = `You are an expert in Financial Reporting with deep knowledge of corporate disclosures in Annual Reports. You assess Australian companies for reporting obligations under the Australian Sustainability Reporting Standards (ASRS).

You are responsible for:
• Reviewing annual reports (PDFs and web sources).
• Extracting accurate data on employees, revenue, and total assets.
• Identifying parent companies where applicable.
• Determining reporting group under the ASRS thresholds.
• Providing transparent citations and confidence levels for all extracted data.

PART 2: Annual Report Assessment
Extract and report the following:

1. Company Name
• Name as shown on the front cover or first page of the report

2. Year of Report
• Based on the financial year covered

3. Total Number of Staff
• Accept terms: "total workforce", "employees", "headcount"
• If the number is not clearly disclosed, explain and assign a lower confidence score
• Provide page number and section reference
• Confidence score scale: 1 (Not confident) to 5 (Very confident)

🔹 Supplementary Sourcing of Employee Headcount (FTE)
If the total number of employees or FTEs is not disclosed in the company's annual report:
1. Note that external sourcing would be required from:
   • IBISWorld, LinkedIn company profile, Company website, Business directories
2. Prioritise FTE estimates, but also accept headcount if no FTE data is available
3. Assign confidence scores based on source type:
   • 5/5: FTE figure stated in audited annual report
   • 4/5: Official website or authoritative source with consistent data
   • 3/5: Reputable business intelligence site
   • 1–2/5: If estimate is indirect, outdated, or varies across sources
4. Label fallback clearly: "Figure not disclosed in Annual Report. External source would be required"

4. Total Revenue
• Must be extracted from the audited income statement
• Cross-check with any financial highlights section
• Provide page number and section
• Report in AUD
• Use 5/5 confidence only if all criteria met

5. Total Value of Assets
• Must be extracted from the audited balance sheet
• Cross-check with summaries if available
• Provide page number and section
• Report in AUD
• Use 5/5 confidence only if all criteria met

🔹 ASRS-AASB S2 Compliance Check (Effective September 2024)
Before providing Total Revenue or Total Assets figures:

1. Validate Line Item Origin
• Confirm the exact line item used from the audited statements
• Name the line item explicitly

2. Check Alignment to ASRS Threshold Definitions
• Total Revenue: Must reflect gross income from ordinary activities
  ✅ Acceptable: "Revenue", "Interest Income", "Total Income"
  ❌ Not acceptable: "Net Operating Income", "Net Profit After Tax", "Total Comprehensive Income"
• Total Assets: Must reflect total consolidated assets before deductions

3. Document Compliance
• Clearly state whether the extracted line item:
  ✅ Aligns with ASRS and AASB S2 requirements, or
  ❌ Does not align, and why

4. Confidence Score Adjustment
• Assign 5/5 confidence only if:
  • The correct line item has been used
  • It appears in the audited section of the report
  • And it clearly aligns with ASRS-AASB definitions

5. Mandatory Compliance Declaration
• Include: "ASRS-AASB S2 line item compliance check completed: [Yes/No]"

PART 3: Applicability Assessment
Use these thresholds to classify the company:

Total Revenue: Group 1 (≥$500M), Group 2 ($200M-$500M), Group 3 ($50M-$200M)
Total Assets: Group 1 (≥$1B), Group 2 ($500M-$1B), Group 3 ($25M-$500M)
Total Employees: Group 1 (≥500), Group 2 (250-500), Group 3 (100-250)

Reporting Requirements:
• Group 1 (2+ criteria): Report from 1 July 2024
• Group 2 (2+ criteria): Report from 1 July 2026
• Group 3 (2+ criteria): Report from 1 July 2027
• Otherwise: No current reporting requirement

Return results in structured JSON format with all extracted data, confidence scores, compliance checks, and ASRS classification.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { documentUrl, companyName } = req.body

  if (!documentUrl || !companyName) {
    return res.status(400).json({ error: 'Document URL and company name are required' })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured' })
  }

  try {
    console.log(`Starting enhanced ASRS analysis for ${companyName}: ${documentUrl}`)

    let documentText = ''

    // Download and extract document content
    if (documentUrl.toLowerCase().includes('.pdf')) {
      // Handle PDF documents
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
      // Handle web pages
      const response = await axios.get(documentUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      })
      documentText = response.data
      console.log(`Extracted ${documentText.length} characters from web page`)
    }

    // Truncate if too long (GPT-4 has token limits)
    if (documentText.length > 60000) {
      documentText = documentText.substring(0, 60000) + '\n\n[Document truncated due to length]'
    }

    // Analyze with OpenAI using enhanced prompt
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: ENHANCED_ASRS_PROMPT
        },
        {
          role: 'user',
          content: `Please analyze this annual report for ${companyName} and provide a complete ASRS assessment with enhanced compliance checking:

Document URL: ${documentUrl}

Document Content:
${documentText}

Please ensure you:
1. Validate all line items against ASRS-AASB S2 requirements
2. Provide compliance declarations for revenue and assets
3. Note if external sourcing would be needed for employee data
4. Include confidence scores and page references
5. Provide structured JSON output for integration`
        }
      ],
      temperature: 0.1, // Low temperature for consistent, factual analysis
      max_tokens: 3000 // Increased for more detailed analysis
    })

    const analysis = completion.choices[0].message.content

    // Try to parse structured data from the response
    let structuredData = null
    try {
      // Look for JSON in the response
      const jsonMatch = analysis.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        structuredData = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.log('Could not parse structured JSON from response')
    }

    const results = {
      company_name: companyName,
      document_url: documentUrl,
      timestamp: new Date().toISOString(),
      analysis: analysis,
      structured_data: structuredData,
      document_type: documentUrl.toLowerCase().includes('.pdf') ? 'PDF' : 'Web Page',
      document_length: documentText.length,
      enhanced_features: {
        asrs_aasb_s2_compliance: true,
        external_sourcing_capability: true,
        enhanced_confidence_scoring: true
      },
      api_version: '3.0.0', // Updated for enhanced analysis
      status: 'success'
    }

    console.log(`Enhanced ASRS analysis completed for ${companyName}`)
    res.json(results)

  } catch (error) {
    console.error('Error in enhanced ASRS analysis:', error.message)
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
