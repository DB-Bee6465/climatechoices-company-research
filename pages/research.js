import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Research() {
  const [companyName, setCompanyName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [hostname, setHostname] = useState('Loading...')

  // Get company name from URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const company = urlParams.get('company')
      if (company) {
        setCompanyName(company)
      }
      // Set hostname to avoid hydration mismatch
      setHostname(window.location.hostname)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!companyName.trim()) return

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await axios.post('/api/research', {
        companyName: companyName.trim(),
        websiteUrl: websiteUrl.trim() || null
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
            <nav className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600">
                Home
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600">
                About
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
                placeholder="https://www.company.com.au"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                autoComplete="url"
              />
              <p className="mt-1 text-sm text-gray-500">
                If not provided, we'll try to find the company's website automatically
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
                <h3 className="text-lg font-medium text-blue-900">Researching {companyName}</h3>
                <p className="text-blue-700">This may take 10-30 seconds while we analyze the company data...</p>
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
              {results.data?.website && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Company Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p><strong>Website:</strong> <a href={results.data.website.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{results.data.website.url}</a></p>
                    {results.data.website.description && (
                      <p className="mt-2"><strong>Description:</strong> {results.data.website.description}</p>
                    )}
                    {results.data.financial_year && (
                      <p className="mt-2"><strong>Financial Year:</strong> {results.data.financial_year}</p>
                    )}
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
              <div>Frontend: v1.3.0 | Build: {new Date().toISOString().split('T')[0]}</div>
              <div>Deployment URL: {hostname}</div>
              <div>Last Updated: {new Date().toLocaleString()}</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
