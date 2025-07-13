import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Research() {
  const [companyName, setCompanyName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [selectedYear, setSelectedYear] = useState('') // New year selection state
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [analysisResults, setAnalysisResults] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisType, setAnalysisType] = useState('gemini') // Default to Gemini AI

  // Get company name from URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const company = urlParams.get('company')
      if (company) {
        setCompanyName(company)
      }
    }
  }, [])

  const handleEnhancedAnalysis = async (documentUrl, companyName, selectedAnalysisType = analysisType) => {
    setAnalysisLoading(true)
    setAnalysisResults(null)

    try {
      console.log(`Starting Gemini AI analysis for ${companyName}`)
      
      // Call Gemini analysis directly (simplified approach)
      const response = await axios.post('/api/gemini-analysis', {
        documentUrl,
        companyName
      })

      setAnalysisResults(response.data)
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err.response?.data?.error || 'An error occurred during ASRS analysis')
    } finally {
      setAnalysisLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!companyName.trim()) return

    setLoading(true)
    setError(null)
    setResults(null)
    setAnalysisResults(null) // Clear previous analysis

    try {
      // Use dynamic SerpAPI search for real-time document discovery
      const response = await axios.post('/api/dynamic-search', {
        companyName: companyName.trim(),
        websiteUrl: websiteUrl.trim() || null,
        selectedYear: selectedYear || null
      })

      setResults(response.data)
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while researching the company')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Company Research - Climate Choices</title>
        <meta name="description" content="Research Australian companies and extract key financial data" />
      </Head>

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Climate Choices</h1>
              <span className="ml-2 text-sm text-gray-500">Company Research</span>
            </Link>
            <nav className="flex space-x-4 md:space-x-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600 text-sm md:text-base">
                Home
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600 text-sm md:text-base">
                About
              </Link>
              <Link href="/debug-cba" className="text-blue-600 hover:text-blue-700 font-medium text-sm md:text-base">
                🔍 Debug CBA
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Research Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Research a Company</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                Company Name *
              </label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Australian Military Bank"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                autoComplete="organization"
                required
              />
            </div>

            <div>
              <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">
                Website URL (Optional)
              </label>
              <input
                type="url"
                id="websiteUrl"
                name="websiteUrl"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder=""
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                autoComplete="url"
              />
              <p className="mt-1 text-sm text-gray-500">
                If not provided, we'll try to find the company's website automatically
              </p>
            </div>

            {/* New Year Selection Field */}
            <div>
              <label htmlFor="selectedYear" className="block text-sm font-medium text-gray-700">
                Report Year (Optional)
              </label>
              <select
                id="selectedYear"
                name="selectedYear"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">All Recent Years (2024, 2023, 2022)</option>
                <option value="2024">2024 Only</option>
                <option value="2023">2023 Only</option>
                <option value="2022">2022 Only</option>
                <option value="2021">2021 Only</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Select a specific year to focus the search, or leave blank for recent years
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !companyName.trim()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Researching...
                </>
              ) : (
                'Research Company'
              )}
            </button>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div>
                <h3 className="text-lg font-medium text-blue-900">🤖 AI-Powered Research: {companyName}</h3>
                <p className="text-blue-700">Using Google Gemini to find the best annual reports and financial documents...</p>
                <p className="text-blue-600 text-sm mt-1">This is much faster and more accurate than web crawling!</p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-lg font-medium text-red-900">Research Failed</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Research Results: {results.company_name}
            </h2>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {results.data?.parent_company || 'Independent'}
                </div>
                <div className="text-sm text-gray-600">Parent Company</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {results.data?.employee_count ? 
                    `${results.data.employee_count.count}` : 
                    'Not Found'
                  }
                </div>
                <div className="text-sm text-gray-600">FTE Employees</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">
                  {results.data?.annual_revenue ? 
                    `$${results.data.annual_revenue.amount}${results.data.annual_revenue.unit === 'millions' ? 'M' : results.data.annual_revenue.unit === 'thousands' ? 'K' : ''}` : 
                    'Not Found'
                  }
                </div>
                <div className="text-sm text-gray-600">Annual Revenue</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-lg font-bold text-orange-600">
                  {results.data?.total_assets ? 
                    `$${results.data.total_assets.amount}${results.data.total_assets.unit === 'millions' ? 'M' : results.data.total_assets.unit === 'thousands' ? 'K' : ''}` : 
                    'Not Found'
                  }
                </div>
                <div className="text-sm text-gray-600">Total Assets</div>
              </div>
            </div>

            {/* Detailed Information */}
            <div className="space-y-6">
              {/* Company Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Company Information</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {results.website && (
                    <p><strong>Website:</strong> <a href={results.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{results.website}</a></p>
                  )}
                  {results.data?.website?.url && !results.website && (
                    <p><strong>Website:</strong> <a href={results.data.website.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{results.data.website.url}</a></p>
                  )}
                  {results.description && (
                    <p className="mt-2"><strong>Description:</strong> {results.description}</p>
                  )}
                  {results.data?.website?.description && (
                    <p className="mt-2"><strong>Description:</strong> {results.data.website.description}</p>
                  )}
                  {results.data?.financial_year && (
                    <p className="mt-2"><strong>Financial Year:</strong> {results.data.financial_year}</p>
                  )}
                </div>
              </div>

              {/* Deep Crawl Results - NEW SECTION */}
              {(results.data?.website?.deep_crawl_results?.length > 0 || results.data?.website?.url_pattern_results?.length > 0) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🔍 Enhanced Discovery Results</h3>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3 mb-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-600 font-bold">🔍</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-indigo-800 font-medium">Deep Crawl & Pattern Detection</h4>
                        <p className="text-indigo-700 text-sm mt-1">
                          Enhanced search found additional financial documents by crawling investor pages and testing common URL patterns.
                        </p>
                      </div>
                    </div>
                    
                    {results.data.website.url_pattern_results?.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-indigo-800 mb-2">📍 URL Pattern Detection ({results.data.website.url_pattern_results.length})</h5>
                        <div className="space-y-2">
                          {results.data.website.url_pattern_results.map((doc, index) => (
                            <div key={index} className="bg-white border border-indigo-200 rounded p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <span className="font-medium text-gray-900">{doc.text}</span>
                                  <p className="text-sm text-gray-600 break-all">{doc.url}</p>
                                </div>
                                <button
                                  onClick={() => window.open(doc.url, '_blank')}
                                  className="ml-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm hover:bg-indigo-200"
                                >
                                  Visit
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {results.data.website.deep_crawl_results?.length > 0 && (
                      <div>
                        <h5 className="font-medium text-indigo-800 mb-2">🕷️ Deep Crawl Results ({results.data.website.deep_crawl_results.length})</h5>
                        <div className="space-y-2">
                          {results.data.website.deep_crawl_results.map((doc, index) => (
                            <div key={index} className="bg-white border border-indigo-200 rounded p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-medium text-gray-900">{doc.text}</span>
                                    {doc.likely_year && (
                                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{doc.likely_year}</span>
                                    )}
                                    {doc.is_pdf && (
                                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">PDF</span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 break-all">{doc.url}</p>
                                  <p className="text-xs text-gray-500">Found via: {doc.source_page}</p>
                                </div>
                                <button
                                  onClick={() => window.open(doc.url, '_blank')}
                                  className="ml-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm hover:bg-indigo-200"
                                >
                                  {doc.is_pdf ? 'Download' : 'Visit'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Analysis Disclaimer */}
              {results.data?.recent_financial_documents && results.data.recent_financial_documents.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                        <span className="text-amber-600 font-bold">⚠️</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-amber-800 font-medium">AI Analysis Disclaimer</h4>
                      <p className="text-amber-700 text-sm mt-1">
                        This system uses <strong>Google Gemini AI</strong> to analyse financial documents and determine ASRS compliance. 
                        While AI analysis provides valuable insights, <strong>all results should be reviewed and verified by qualified professionals</strong> before making any business or compliance decisions.
                      </p>
                      <p className="text-amber-700 text-sm mt-2">
                        <strong>Human oversight is essential</strong> for accurate ASRS classification and regulatory compliance.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Financial Documents Found */}
              {results.data?.recent_financial_documents && results.data.recent_financial_documents.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📄 Top 5 Financial Documents (Recommended)</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3 mb-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-bold">🏆</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-green-800 font-medium">Top Recommendations Ready</h4>
                        <p className="text-green-700 text-sm mt-1">
                          Found {results.data.recent_financial_documents.length} top financial document(s) ranked by relevance for ASRS analysis. 
                          Documents marked "RECOMMENDED" are most likely to contain comprehensive financial data.
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {results.data.recent_financial_documents.map((doc, index) => (
                        <div key={index} className="bg-white border border-green-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {doc.document_type}
                                </span>
                                {doc.likely_year && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {doc.likely_year}
                                  </span>
                                )}
                                {doc.is_pdf && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    PDF
                                  </span>
                                )}
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Score: {doc.relevance_score}
                                </span>
                              </div>
                              
                              <h5 className="font-medium text-gray-900 mb-1">
                                {doc.text || 'Financial Document'}
                              </h5>
                              
                              <p className="text-sm text-gray-600 break-all mb-2">
                                {doc.url}
                              </p>
                              
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>Type: {doc.type.replace(/_/g, ' ')}</span>
                                <span>Priority: {doc.priority}</span>
                                {doc.likely_year && <span>Year: {doc.likely_year}</span>}
                              </div>
                            </div>
                            
                            <div className="flex-shrink-0 ml-4 space-y-2">
                              <button
                                onClick={() => window.open(doc.url, '_blank')}
                                className="w-full inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm leading-4 font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Review
                              </button>
                              
                              <button
                                onClick={() => handleEnhancedAnalysis(doc.url, results.company_name, analysisType)}
                                disabled={analysisLoading}
                                className="w-full inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {analysisLoading ? 'Analysing...' : 'Analyse'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">Next Steps</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>1. Click "Review" to examine each document</p>
                            <p>2. Identify the most recent annual report or financial statements</p>
                            <p>3. Future enhancement: Select document for automated analysis</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Debug Tools Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">🔍 Debug Tools</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p className="mb-2">For developers and advanced users:</p>
                        <Link 
                          href="/debug-cba" 
                          className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          🔍 Debug Commonwealth Bank Analysis
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ASRS Analysis Results - NEW SECTION */}
              {analysisResults && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 ASRS Analysis Results</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    
                    {/* Analysis Header */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b">
                      <div>
                        <h4 className="text-xl font-semibold text-gray-900">{analysisResults.company_name}</h4>
                        <p className="text-sm text-gray-600">Analysis completed: {new Date(analysisResults.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-blue-600">GEMINI Analysis</div>
                        <div className="text-xs text-gray-500">Cost: {analysisResults.cost}</div>
                      </div>
                    </div>

                    {/* Key Metrics */}
                    {analysisResults.structured_data && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        
                        {/* Financial Year */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm font-medium text-gray-600">Financial Year</div>
                          <div className="text-lg font-bold text-gray-900">
                            {analysisResults.structured_data?.financial_year || 'Not found'}
                          </div>
                        </div>

                        {/* Total Revenue */}
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="text-sm font-medium text-green-600">Total Revenue</div>
                          <div className="text-lg font-bold text-green-900">
                            {analysisResults.structured_data?.financial_metrics?.total_revenue?.value ? 
                              `$${(analysisResults.structured_data.financial_metrics.total_revenue.value / 1000000000).toFixed(1)}B AUD` : 
                              'Not found'
                            }
                          </div>
                          {analysisResults.structured_data?.financial_metrics?.total_revenue?.confidence && (
                            <div className="text-xs text-green-600">
                              Confidence: {analysisResults.structured_data.financial_metrics.total_revenue.confidence}/10
                            </div>
                          )}
                        </div>

                        {/* Total Assets */}
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="text-sm font-medium text-blue-600">Total Assets</div>
                          <div className="text-lg font-bold text-blue-900">
                            {analysisResults.structured_data?.financial_metrics?.total_assets?.value ? 
                              `$${(analysisResults.structured_data.financial_metrics.total_assets.value / 1000000000).toFixed(1)}B AUD` : 
                              'Not found'
                            }
                          </div>
                          {analysisResults.structured_data?.financial_metrics?.total_assets?.confidence && (
                            <div className="text-xs text-blue-600">
                              Confidence: {analysisResults.structured_data.financial_metrics.total_assets.confidence}/10
                            </div>
                          )}
                        </div>

                        {/* Employees */}
                        <div className="bg-purple-50 rounded-lg p-4">
                          <div className="text-sm font-medium text-purple-600">Total Employees</div>
                          <div className="text-lg font-bold text-purple-900">
                            {analysisResults.structured_data?.financial_metrics?.employee_count?.value ? 
                              analysisResults.structured_data.financial_metrics.employee_count.value.toLocaleString() : 
                              'External sourcing required'
                            }
                          </div>
                          {analysisResults.structured_data?.financial_metrics?.employee_count?.confidence && (
                            <div className="text-xs text-purple-600">
                              Confidence: {analysisResults.structured_data.financial_metrics.employee_count.confidence}/10
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ASRS Classification */}
                    {analysisResults.structured_data?.asrs_classification && (
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 mb-6">
                        <h5 className="text-lg font-semibold text-gray-900 mb-3">🏛️ ASRS Classification</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          
                          {/* ASRS Group */}
                          <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">
                              {analysisResults.structured_data.asrs_classification.group || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-600">ASRS Classification</div>
                            <div className="text-xs text-green-600 mt-1">
                              Confidence: {analysisResults.structured_data.asrs_classification.confidence}/10
                            </div>
                          </div>

                          {/* Reporting From Date */}
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {analysisResults.structured_data.asrs_classification.reporting_start_date || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-600">Reporting from</div>
                          </div>

                          {/* Compliance Status */}
                          <div className="text-center">
                            <div className="text-lg font-bold text-orange-600">
                              {analysisResults.structured_data.compliance_summary?.requires_asrs_reporting ? 'Required' : 'Not Required'}
                            </div>
                            <div className="text-sm text-gray-600">ASRS Reporting</div>
                            {analysisResults.structured_data.compliance_summary?.first_report_due && (
                              <div className="text-xs text-orange-600 mt-1">
                                First report due: {analysisResults.structured_data.compliance_summary.first_report_due}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Criteria Met */}
                        {analysisResults.structured_data.asrs_classification.criteria_met && (
                          <div className="mt-4">
                            <div className="text-sm font-medium text-gray-700 mb-2">Criteria Met:</div>
                            <div className="flex flex-wrap gap-2">
                              {analysisResults.structured_data.asrs_classification.criteria_met.map((criteria, index) => (
                                <span key={index} className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  ✅ {criteria}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Raw Analysis (Collapsible) */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                        View Detailed Analysis
                      </summary>
                      <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-96">
                          {typeof analysisResults.analysis === 'string' ? 
                            analysisResults.analysis : 
                            JSON.stringify(analysisResults.analysis, null, 2)
                          }
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>
              )}

              {/* Analysis Loading State */}
              {analysisLoading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-blue-800 font-medium">Analysing annual report...</p>
                  <p className="text-blue-600 text-sm">This may take 30-60 seconds depending on document size</p>
                </div>
              )}

              {/* Financial Links */}
              {results.data?.website?.financial_links && results.data.website.financial_links.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">All Financial Resources Found</h3>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-800 mb-3">
                      Found {results.data.website.financial_links.length} financial-related link(s) on the company website:
                    </p>
                    <ul className="space-y-2">
                      {results.data.website.financial_links.map((link, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="flex-shrink-0 mt-1 space-x-1">
                            {link.is_pdf ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                PDF
                              </span>
                            ) : link.is_document ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                DOC
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                WEB
                              </span>
                            )}
                            {link.priority >= 8 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                HIGH
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <a 
                              href={link.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:underline text-sm font-medium"
                            >
                              {link.text || 'Financial Resource'}
                            </a>
                            <p className="text-xs text-gray-500 mt-1">
                              Type: {link.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} • 
                              Priority: {link.priority || 'N/A'} •
                              <span className="ml-1 break-all">{link.url}</span>
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Data Sources */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Sources</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <ul className="space-y-1 text-sm text-gray-600">
                    {results.data?.annual_revenue?.source && (
                      <li>• Revenue: {results.data.annual_revenue.source}</li>
                    )}
                    {results.data?.total_assets?.source && (
                      <li>• Assets: {results.data.total_assets.source}</li>
                    )}
                    {results.data?.employee_count?.source && (
                      <li>• Employees: {results.data.employee_count.source}</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Timestamp and Version Info */}
              <div className="text-sm text-gray-500 text-center pt-4 border-t space-y-1">
                <div>Research completed: {new Date(results.timestamp).toLocaleString()}</div>
                {results.api_version && (
                  <div>API Version: {results.api_version}</div>
                )}
                {results.data?.debug_info?.api_version && (
                  <div>Debug API Version: {results.data.debug_info.api_version}</div>
                )}
                {results.data?.research_status && (
                  <div>Status: {results.data.research_status}</div>
                )}
                {results.data?.search_method && (
                  <div>Search Method: {results.data.search_method}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer with Version Info */}
      <footer className="bg-gray-100 border-t mt-8">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-600 space-y-2">
            <div className="font-semibold">ClimateChoices Company Research Tool</div>
            <div className="space-y-1 text-xs">
              <div>Frontend: v2.0.0</div>
              <div>Build: 2025-07-08 (Phase 1: Free Foundation)</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
