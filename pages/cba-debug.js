import Head from 'next/head'
import { useState } from 'react'

export default function CBADebug() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const testCBAAnalysis = async () => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      console.log('Testing Commonwealth Bank analysis...')
      
      // Test the Gemini analysis directly
      const response = await fetch('/api/gemini-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentUrl: 'https://www.commbank.com.au/content/dam/commbank-assets/investors/docs/results/fy24/2024-Annual-Report_spreads.pdf',
          companyName: 'Commonwealth Bank of Australia'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setResults(data)
      
    } catch (err) {
      console.error('Test error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Head>
        <title>CBA Debug Test - Simple</title>
      </Head>

      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">🔍 Commonwealth Bank Debug Test</h1>
          <p className="text-gray-600 mb-4">
            Simple test to check if Total Assets extraction is working for Commonwealth Bank.
          </p>
          
          <button
            onClick={testCBAAnalysis}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded"
          >
            {loading ? 'Testing...' : 'Test CBA Analysis'}
          </button>
        </div>

        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span>Testing Commonwealth Bank analysis...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {results && (
          <div className="space-y-6">
            {/* Quick Results */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Results</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded">
                  <div className="font-semibold">Total Revenue</div>
                  <div className="text-lg">
                    {results.structured_data?.financial_metrics?.total_revenue?.value 
                      ? `$${(results.structured_data.financial_metrics.total_revenue.value / 1000000000).toFixed(1)}B AUD`
                      : 'Not found'
                    }
                  </div>
                  <div className="text-sm text-gray-600">
                    Confidence: {results.structured_data?.financial_metrics?.total_revenue?.confidence || 0}/10
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded">
                  <div className="font-semibold">Total Assets</div>
                  <div className="text-lg">
                    {results.structured_data?.financial_metrics?.total_assets?.value 
                      ? `$${(results.structured_data.financial_metrics.total_assets.value / 1000000000).toFixed(1)}B AUD`
                      : 'Not found'
                    }
                  </div>
                  <div className="text-sm text-gray-600">
                    Confidence: {results.structured_data?.financial_metrics?.total_assets?.confidence || 0}/10
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded">
                  <div className="font-semibold">Employees</div>
                  <div className="text-lg">
                    {results.structured_data?.financial_metrics?.employee_count?.value 
                      ? results.structured_data.financial_metrics.employee_count.value.toLocaleString()
                      : 'Not found'
                    }
                  </div>
                  <div className="text-sm text-gray-600">
                    Confidence: {results.structured_data?.financial_metrics?.employee_count?.confidence || 0}/10
                  </div>
                </div>
              </div>
            </div>

            {/* ASRS Classification */}
            {results.structured_data?.asrs_classification && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">ASRS Classification</h2>
                <div className="bg-green-50 p-4 rounded">
                  <div className="font-semibold text-green-800">
                    {results.structured_data.asrs_classification.group}
                  </div>
                  <div className="text-green-700">
                    Criteria met: {results.structured_data.asrs_classification.criteria_met?.join(', ')}
                  </div>
                  <div className="text-sm text-green-600">
                    Classification confidence: {results.structured_data.asrs_classification.classification_confidence}/10
                  </div>
                </div>
              </div>
            )}

            {/* Raw Response */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Raw AI Response</h2>
              <div className="bg-gray-50 p-4 rounded text-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                {results.analysis}
              </div>
            </div>

            {/* Structured Data */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Structured Data</h2>
              <details>
                <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                  Click to view JSON data
                </summary>
                <pre className="mt-4 bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                  {JSON.stringify(results.structured_data, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
