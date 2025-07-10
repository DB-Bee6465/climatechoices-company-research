import { GoogleGenerativeAI } from '@google/generative-ai'
import axios from 'axios'
import pdf from 'pdf-parse'

// Initialize Gemini with free API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 10, // Max requests per window
  windowMs: 60 * 1000, // 1 minute window
  message: 'Too many analysis requests. Please wait a minute before trying again.'
}

// Simple in-memory rate limiting
const requestCounts = new Map()

function checkRateLimit(clientId) {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT.windowMs
  
  // Clean old entries
  for (const [id, requests] of requestCounts.entries()) {
    requestCounts.set(id, requests.filter(time => time > windowStart))
    if (requestCounts.get(id).length === 0) {
      requestCounts.delete(id)
    }
  }
  
  // Check current client
  const clientRequests = requestCounts.get(clientId) || []
  
  if (clientRequests.length >= RATE_LIMIT.maxRequests) {
    return false // Rate limit exceeded
  }
  
  // Add current request
  clientRequests.push(now)
  requestCounts.set(clientId, clientRequests)
  
  return true // Request allowed
}

// Enhanced ASRS analysis prompt with intelligent financial statements analysis
const ENHANCED_ASRS_PROMPT = `You are a CHARTERED ACCOUNTANT and FINANCIAL REPORTING EXPERT with deep expertise in:
- Australian Accounting Standards (AASB)
- International Financial Reporting Standards (IFRS)
- Corporate annual report structures and financial statement formats across ALL industries
- Balance sheet analysis and asset classification for any company type
- Income statement interpretation and revenue recognition across sectors

You specialize in analyzing Australian company annual reports for ASRS (Australian Sustainability Reporting Standards) compliance under AASB S1 and AASB S2 (September 2024).

CORE FINANCIAL ANALYSIS PRINCIPLES:
You understand that Australian company annual reports follow standardized formats regardless of industry:
- Financial statements are prepared under AASB/IFRS standards
- Consolidated figures take precedence over parent company standalone figures
- Balance sheets show assets, liabilities, and equity in standardized formats
- Income statements show revenue, expenses, and profit in standardized formats

INTELLIGENT DOCUMENT ANALYSIS APPROACH:
1. **ADAPT TO DOCUMENT STRUCTURE**: Each annual report has unique pagination and layout
2. **RECOGNIZE FINANCIAL STATEMENT PATTERNS**: Look for standard AASB/IFRS statement formats
3. **UNDERSTAND INDUSTRY CONTEXT**: Banks, retailers, miners, etc. have different asset structures but follow same reporting standards
4. **SCALE AWARENESS**: Automatically detect if figures are in thousands, millions, or billions
5. **TERMINOLOGY FLEXIBILITY**: Recognize equivalent terms across different companies

ASRS CLASSIFICATION CRITERIA (AASB S1 & S2 - September 2024):
Group 1 (Report from 1 January 2025): Companies meeting 2+ of:
- Total revenue ≥ $500 million
- Total assets ≥ $1 billion  
- 500+ employees

Group 2 (Report from 1 January 2026): Companies meeting 2+ of:
- Total revenue $200M-$500M
- Total assets $500M-$1B
- 250-500 employees

Group 3 (Report from 1 January 2027): Companies meeting 2+ of:
- Total revenue $50M-$200M
- Total assets $25M-$500M
- 100-250 employees

INTELLIGENT DATA EXTRACTION METHODOLOGY:

1. **REVENUE ANALYSIS** - Apply professional judgment:
   - Identify the PRIMARY revenue line in the income statement
   - For most companies: "Revenue", "Total Revenue", "Sales Revenue"
   - For banks/financial: "Net Interest Income" + "Other Operating Income" = Total Operating Income
   - For utilities: "Revenue from operations"
   - For mining: "Sales revenue" or "Revenue from sales"
   - ALWAYS use the TOP LINE revenue figure that represents the company's main business
   - Cross-reference with financial highlights for validation

2. **TOTAL ASSETS ANALYSIS** - Apply balance sheet expertise:
   
   **INTELLIGENT SEARCH METHODOLOGY:**
   - Locate the "Statement of Financial Position" or "Balance Sheet"
   - Understand this is typically the LARGEST section of financial statements
   - Look for the FINAL LINE of the Assets section (this is always "Total Assets")
   - Recognize that assets are presented in two main categories:
     * Current Assets (cash, receivables, inventory, etc.)
     * Non-Current Assets (property, equipment, investments, etc.)
   - The "Total Assets" line is the SUM of these categories
   
   **ADAPTIVE TERMINOLOGY RECOGNITION:**
   - "Total Assets" (most common across all industries)
   - "Total Current and Non-Current Assets"
   - "Assets" (when it's clearly the total line)
   - Recognize tabular format where numbers align in columns
   
   **PROFESSIONAL VALIDATION:**
   - Ensure the figure makes sense for the company size and industry
   - Banks: Typically hundreds of billions to over $1 trillion
   - Large retailers: Typically tens of billions
   - Mining companies: Varies widely based on asset intensity
   - Cross-reference with any financial highlights or CEO commentary

3. **EMPLOYEE COUNT ANALYSIS** - Apply comprehensive search:
   - Search throughout the entire document, not just specific sections
   - Look for: "employees", "workforce", "staff", "FTE", "headcount"
   - Check: Financial highlights, CEO letter, Our People sections, Directors' Report
   - Accept ranges (e.g., "50,000+" employees) and use conservative estimates

CRITICAL SUCCESS FACTORS:

**DOCUMENT COMPREHENSION:**
- Read and analyze the ENTIRE provided document content
- Don't assume standard page numbers - adapt to the actual document structure
- Look for financial statement headers and table structures
- Understand that financial data appears in tabular format with aligned numbers

**PROFESSIONAL SKEPTICISM:**
- If a figure seems unusually high/low for the company, double-check your analysis
- Ensure you're reading consolidated (group) figures, not subsidiary figures
- Verify currency (should be AUD for Australian companies)
- Check the scale notation and convert to actual dollar amounts

**CONFIDENCE CALIBRATION:**
- High confidence (8-10): Found in audited financial statements with clear line items
- Medium confidence (5-7): Found in financial highlights with reasonable certainty
- Low confidence (1-4): Inferred or uncertain data
- Zero confidence (0): Cannot locate the data in the provided content

**QUALITY ASSURANCE QUESTIONS:**
Before finalizing each metric, ask yourself:
1. "Did I find this in the actual financial statements or just narrative text?"
2. "Is this the consolidated figure for the entire group?"
3. "Does this figure make business sense for a company of this type and size?"
4. "Am I reading the current year column, not prior year comparatives?"
5. "Have I correctly interpreted the scale (thousands/millions/billions)?"
   - "Assets Total"
   - "Total Group Assets"
   - "Total Consolidated Assets"
   
   **BALANCE SHEET STRUCTURE KNOWLEDGE:**
   Assets are typically presented as:
   - Current Assets (Cash, Receivables, Inventory, etc.)
   - Non-Current Assets (Property, Equipment, Intangibles, etc.)
   - TOTAL ASSETS (the figure you need - usually the last line of the assets section)
   
   **SEARCH STRATEGY:**
   - Look for tabulated financial data, not just narrative text
   - Search in both parent company AND consolidated figures (use consolidated)
   - Look for figures in millions ($M) or thousands ($'000) - note the scale
   - REQUIRED: Must specify exact line item name, amount, currency, and page number

3. **EMPLOYEE COUNT** - Look for:
   - "Full Time Equivalent" or "FTE"
   - "Average number of employees"
   - "Total employees" or "Headcount"
   - "Workforce" or "Staff numbers"
   - Search locations: Financial Highlights, Directors' Report, Our People sections
   - REQUIRED: Specify exact source and page number

STEP 2: CONFIDENCE VALIDATION & SELF-CHECK PHASE

**CONFIDENCE SCORING CRITERIA (1-10 scale):**
- **10**: Exact figure from audited consolidated financial statements with clear line item
- **8-9**: Figure from financial highlights with clear source reference to financial statements
- **6-7**: Figure from narrative text with reasonable certainty and cross-reference
- **4-5**: Figure inferred from available data with some uncertainty
- **1-3**: Figure uncertain or potentially unreliable
- **0**: Figure not found or cannot be determined

**MANDATORY SELF-CHECK QUESTIONS:**
For each metric, ask yourself:
1. "Did I find this figure in the actual document text or financial statements?"
2. "Can I point to the specific line item, page number, and section?"
3. "Is this from consolidated financial statements (not parent company only)?"
4. "Is this the current year figure (not previous year)?"
5. "Does this figure make sense for a company of this size and industry?"
6. "Am I looking at the right scale (millions vs thousands vs actual amounts)?"

**FINANCIAL STATEMENTS VALIDATION:**
- Ensure you're reading CONSOLIDATED figures (not parent company standalone)
- Verify currency (AUD for Australian companies)
- Check the scale notation ($M = millions, $'000 = thousands)
- Confirm the financial year matches the document year

**CONFIDENCE THRESHOLDS:**
- **Confidence ≥ 7**: Proceed with ASRS analysis
- **Confidence 4-6**: Flag as "Medium Confidence - Verify Recommended"
- **Confidence ≤ 3**: Flag as "Low Confidence - External Verification Required"

**HALLUCINATION GUARDRAILS:**
- If you cannot find a specific figure in the financial statements, set value to null and confidence to 0
- Do not estimate, calculate, or infer figures not explicitly stated
- Do not use figures from previous years unless clearly labeled as current year
- Do not use parent company figures when consolidated figures are available
- Do not confuse subsidiary figures with group-level figures

STEP 3: ASRS CLASSIFICATION PHASE

Only proceed with ASRS classification if:
- At least 2 out of 3 metrics have confidence ≥ 6
- OR if you have high confidence (≥ 8) in at least 1 metric that clearly determines the group

**CLASSIFICATION CONFIDENCE RULES:**
- **High Classification Confidence (8-10)**: All 3 metrics found with confidence ≥ 7
- **Medium Classification Confidence (6-7)**: 2 metrics found with confidence ≥ 6
- **Low Classification Confidence (≤ 5)**: Insufficient reliable data for classification

Please analyze the provided annual report thoroughly using your financial expertise and return results in this JSON format:

{
  "company_name": "Company Name",
  "financial_year": "2024",
  "analysis_date": "2025-01-09",
  "asrs_standards_version": "AASB S1 & S2 September 2024",
  "data_extraction_summary": {
    "total_revenue": {
      "found": true,
      "confidence_before_validation": 9,
      "self_check_passed": true,
      "final_confidence": 9
    },
    "total_assets": {
      "found": true,
      "confidence_before_validation": 8,
      "self_check_passed": true,
      "final_confidence": 8
    },
    "employee_count": {
      "found": true,
      "confidence_before_validation": 7,
      "self_check_passed": true,
      "final_confidence": 7
    }
  },
  "confidence_validation": {
    "overall_data_quality": "High",
    "proceed_with_classification": true,
    "validation_notes": "All metrics found with high confidence from audited financial statements"
  },
  "financial_metrics": {
    "total_revenue": {
      "value": 000000000,
      "currency": "AUD",
      "confidence": 9,
      "source": "Consolidated Statement of Comprehensive Income page X - [Exact line item name]"
    },
    "total_assets": {
      "value": 000000000,
      "currency": "AUD",
      "confidence": 8,
      "source": "Consolidated Statement of Financial Position page X - [Exact line item name]"
    },
    "employee_count": {
      "value": 00000,
      "confidence": 7,
      "source": "[Exact source description, page number]"
    }
  },
  "asrs_classification": {
    "group": "Group 1",
    "criteria_met": ["Revenue ≥ $500M", "Assets ≥ $1B", "Employees ≥ 500"],
    "classification_confidence": 9,
    "reporting_start_date": "1 January 2025",
    "confidence_warnings": [],
    "standards_applied": "AASB S1 & S2 September 2024"
  },
  "compliance_summary": {
    "requires_asrs_reporting": true,
    "first_report_due": "2025 (for FY2025)",
    "key_requirements": ["AASB S1 General Requirements", "AASB S2 Climate-related Disclosures", "Governance reporting"],
    "standards_version": "September 2024"
  },
  "document_analysis": {
    "pages_analyzed": "Specify range of pages examined",
    "financial_statements_found": true,
    "balance_sheet_page": "Page number where Consolidated Statement of Financial Position found",
    "income_statement_page": "Page number where Consolidated Statement of Comprehensive Income found"
  }
}`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limiting check
  const clientId = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'
  
  if (!checkRateLimit(clientId)) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: RATE_LIMIT.message,
      retry_after: '60 seconds',
      limit: `${RATE_LIMIT.maxRequests} requests per minute`
    })
  }

  const { documentUrl, companyName } = req.body

  if (!documentUrl || !companyName) {
    return res.status(400).json({ error: 'Document URL and company name are required' })
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' })
  }

  try {
    console.log(`Starting FREE Gemini ASRS analysis for ${companyName} (Client: ${clientId})`)

    // Token monitoring and estimation
    function estimateTokens(text) {
      // Rough estimation: ~4 characters per token for English text
      return Math.ceil(text.length / 4)
    }

    function logTokenUsage(stage, text, additionalInfo = '') {
      const tokens = estimateTokens(text)
      const chars = text.length
      console.log(`[TOKEN MONITOR] ${stage}: ${tokens} tokens (~${chars} chars) ${additionalInfo}`)
      return tokens
    }

    // Extract document content (same as before)
    let documentText = ''
    console.log(`[TOKEN MONITOR] Starting document extraction from: ${documentUrl}`)
    
    if (documentUrl.toLowerCase().includes('.pdf')) {
      const response = await axios.get(documentUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      })
      const pdfData = await pdf(response.data)
      documentText = pdfData.text
      logTokenUsage('PDF Extraction', documentText, '(raw PDF text)')
    } else {
      const response = await axios.get(documentUrl, { timeout: 15000 })
      documentText = response.data
      logTokenUsage('Web Content', documentText, '(HTML content)')
    }

    // Enhanced document processing with token monitoring
    const originalTokens = logTokenUsage('Original Document', documentText)
    
    // Token-aware processing limits
    const MAX_TOKENS = 40000 // Conservative limit (well under Gemini's 1M limit)
    const MAX_CHARS = MAX_TOKENS * 4 // ~160,000 characters
    
    if (originalTokens > MAX_TOKENS) {
      console.log(`[TOKEN MONITOR] Document exceeds ${MAX_TOKENS} token limit, applying INTELLIGENT financial statements sampling`)
      
      if (documentText.length > MAX_CHARS) {
        // INTELLIGENT: Pattern-based financial statements detection
        const firstPart = documentText.substring(0, Math.floor(MAX_CHARS * 0.25)) // 25% for intro/highlights
        
        // ADAPTIVE: Search for financial statements using pattern recognition
        const financialPatterns = [
          /consolidated statement of financial position/i,
          /statement of financial position/i,
          /consolidated balance sheet/i,
          /balance sheet/i,
          /consolidated statement of comprehensive income/i,
          /statement of comprehensive income/i,
          /consolidated income statement/i,
          /income statement/i,
          /total assets/i,
          /total revenue/i,
          /operating income/i,
          /\$[0-9,]+[mb]?\s*(million|billion)?/i // Financial figures pattern
        ]
        
        // INTELLIGENT: Score document sections based on financial content density
        let bestFinancialSection = ''
        let bestScore = 0
        let bestLocation = 0
        
        const chunkSize = Math.floor(MAX_CHARS * 0.5) // 50% allocation for financial statements
        const stepSize = Math.floor(chunkSize / 8) // Overlap chunks for better coverage
        
        for (let i = Math.floor(documentText.length * 0.1); i < documentText.length * 0.9; i += stepSize) {
          const chunk = documentText.substring(i, i + chunkSize)
          
          let score = 0
          let patternMatches = 0
          
          // Score based on financial statement patterns
          financialPatterns.forEach(pattern => {
            const matches = (chunk.match(pattern) || []).length
            if (matches > 0) {
              patternMatches++
              // Weight different patterns by importance
              if (pattern.source.includes('total assets')) score += matches * 15
              else if (pattern.source.includes('statement of financial position')) score += matches * 10
              else if (pattern.source.includes('balance sheet')) score += matches * 10
              else if (pattern.source.includes('total revenue')) score += matches * 8
              else if (pattern.source.includes('income statement')) score += matches * 6
              else score += matches * 3
            }
          })
          
          // Bonus for sections with multiple financial patterns (likely financial statements)
          if (patternMatches >= 3) score += 20
          if (patternMatches >= 5) score += 40
          
          // Look for tabular data patterns (financial statements are tables)
          const tabularPatterns = chunk.match(/\n\s*[A-Za-z][^0-9\n]*\s+[\d,]+/g) || []
          score += tabularPatterns.length * 2
          
          if (score > bestScore) {
            bestScore = score
            bestFinancialSection = chunk
            bestLocation = Math.round((i / documentText.length) * 100)
          }
        }
        
        // FALLBACK: If no strong financial section found, use middle section
        if (bestScore < 10) {
          const middleStart = Math.floor(documentText.length * 0.4)
          bestFinancialSection = documentText.substring(middleStart, middleStart + Math.floor(MAX_CHARS * 0.5))
          bestLocation = 40
          console.log(`[FINANCIAL FOCUS] Low financial content detected, using middle section fallback`)
        }
        
        const lastPart = documentText.substring(documentText.length - Math.floor(MAX_CHARS * 0.25)) // 25% for notes
        
        documentText = firstPart + '\n\n[... FINANCIAL STATEMENTS SECTION IDENTIFIED AND PRIORITIZED ...]\n\n' + 
                      bestFinancialSection + '\n\n[... END SECTION SAMPLED FOR TOKEN EFFICIENCY ...]\n\n' + lastPart
        
        const sampledTokens = logTokenUsage('Intelligent Financial Sampling', documentText, `(score: ${bestScore}, location: ${bestLocation}%)`)
        console.log(`[TOKEN MONITOR] Reduced from ${originalTokens} to ${sampledTokens} tokens (${Math.round((1-sampledTokens/originalTokens)*100)}% reduction)`)
        console.log(`[FINANCIAL FOCUS] Best financial section found at ${bestLocation}% through document with score: ${bestScore}`)
      }
    } else if (documentText.length > 80000) {
      // For moderately large documents, still apply some limits
      documentText = documentText.substring(0, 80000) + '\n\n[Document truncated for token efficiency]'
      logTokenUsage('Moderate Truncation', documentText, '(80k char limit)')
    } else {
      console.log(`[TOKEN MONITOR] Document within limits, processing full content`)
    }
    
    // Final token count before sending to Gemini
    const finalTokens = logTokenUsage('Final Processing', documentText, '(ready for Gemini)')
    
    // Add prompt tokens
    const promptTokens = estimateTokens(ENHANCED_ASRS_PROMPT)
    const totalInputTokens = finalTokens + promptTokens
    console.log(`[TOKEN MONITOR] Total input tokens: ${totalInputTokens} (document: ${finalTokens} + prompt: ${promptTokens})`)
    
    // Safety check before API call
    if (totalInputTokens > 50000) {
      console.warn(`[TOKEN MONITOR] WARNING: High token usage (${totalInputTokens}), consider further optimization`)
    }

    // Use Gemini 1.5 Flash (free tier)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `${ENHANCED_ASRS_PROMPT}

IMPORTANT: You are being provided with a substantial portion of the annual report document. This may include content from throughout the document including early pages, financial statements section, and notes. Please analyze ALL the content provided below, not just the beginning.

Please analyze this annual report for ${companyName}:

Document URL: ${documentUrl}
Document Content: ${documentText}`

    const result = await model.generateContent(prompt)
    const analysis = result.response.text()
    
    // Monitor response tokens
    const responseTokens = logTokenUsage('Gemini Response', analysis, '(AI generated)')
    const totalTokensUsed = totalInputTokens + responseTokens
    console.log(`[TOKEN MONITOR] TOTAL SESSION: ${totalTokensUsed} tokens (input: ${totalInputTokens} + output: ${responseTokens})`)

    // Parse structured data
    let structuredData = null
    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        structuredData = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.log('Could not parse JSON from Gemini response')
    }

    const results = {
      company_name: companyName,
      document_url: documentUrl,
      timestamp: new Date().toISOString(),
      analysis: analysis,
      structured_data: structuredData,
      ai_provider: 'Google Gemini (Free)',
      cost: '$0.00',
      rate_limit_info: {
        requests_remaining: RATE_LIMIT.maxRequests - (requestCounts.get(clientId)?.length || 0),
        window_reset: '60 seconds'
      },
      token_usage: {
        input_tokens: totalInputTokens,
        output_tokens: responseTokens,
        total_tokens: totalTokensUsed,
        document_tokens: finalTokens,
        prompt_tokens: promptTokens,
        efficiency_note: originalTokens > finalTokens ? 
          `Document optimized: ${originalTokens} → ${finalTokens} tokens (${Math.round((1-finalTokens/originalTokens)*100)}% reduction)` : 
          'Full document processed'
      },
      status: 'success'
    }

    console.log(`FREE Gemini analysis completed for ${companyName}`)
    res.json(results)

  } catch (error) {
    console.error('Gemini analysis error:', error.message)
    
    // Handle Gemini API specific errors
    if (error.message.includes('quota') || error.message.includes('rate')) {
      return res.status(429).json({
        error: 'Gemini API rate limit exceeded',
        details: 'Please wait a few minutes before trying again',
        company_name: companyName,
        timestamp: new Date().toISOString(),
        status: 'rate_limited'
      })
    }

    res.status(500).json({
      error: 'Failed to analyze with Gemini',
      details: error.message,
      status: 'error'
    })
  }
}
