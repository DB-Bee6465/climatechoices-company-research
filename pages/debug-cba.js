import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import axios from 'axios'

// Debug page for Commonwealth Bank Total Assets analysis - Updated 2025-07-11
export default function DebugCBA() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const runDebugAnalysis = async () => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      console.log('Starting Commonwealth Bank debug analysis...')
      const response = await axios.post('/api/debug-cba', {})
      setResults(response.data)
    } catch (err) {
      console.error('Debug analysis error:', err)
      setError(err.response?.data?.error || 'An error occurred during debug analysis')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Head>
        <title>Commonwealth Bank Debug Analysis - ClimateChoices</title>
        <meta name="description" content="Debug analysis for Commonwealth Bank Total Assets extraction" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-green-600 hover:text-green-700 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🔍 Document Analysis Debug
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Analyze annual reports to understand document structure and data extraction effectiveness
          </p>
        </div>

        {/* Debug Controls */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Debug Analysis</h2>
            <p className="text-gray-600 mb-4">
              This will download and analyze annual reports to identify:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-1">
              <li>Where "Total Assets" appears in the document</li>
              <li>Balance sheet and financial statement locations</li>
              <li>Large financial figures that could be Total Assets</li>
              <li>Document structure and sampling effectiveness</li>
            </ul>
            
            <button
              onClick={runDebugAnalysis}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Analyzing Document...' : 'Run Debug Analysis'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-800">Downloading and analyzing annual report...</span>
              </div>
              <p className="text-blue-600 text-sm mt-2">This may take 30-60 seconds for the full PDF analysis</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-red-800 font-semibold mb-2">Analysis Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Document Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4">📊 Document Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-2xl font-bold text-blue-600">{results.document_stats.length.toLocaleString()}</div>
                  <div className="text-gray-600">Characters</div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-2xl font-bold text-green-600">{results.document_stats.estimated_tokens.toLocaleString()}</div>
                  <div className="text-gray-600">Estimated Tokens</div>
                </div>
              </div>
            </div>

            {/* Search Results Summary */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4">🔍 Key Terms Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 p-4 rounded">
                  <div className="text-2xl font-bold text-red-600">{results.analysis.total_assets_mentions}</div>
                  <div className="text-gray-600">Total Assets Mentions</div>
                </div>
                <div className="bg-blue-50 p-4 rounded">
                  <div className="text-2xl font-bold text-blue-600">{results.analysis.balance_sheet_mentions}</div>
                  <div className="text-gray-600">Balance Sheet Mentions</div>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <div className="text-2xl font-bold text-green-600">{results.analysis.financial_position_mentions}</div>
                  <div className="text-gray-600">Financial Position Mentions</div>
                </div>
              </div>
            </div>

            {/* Total Assets Locations */}
            {results.search_results['total assets'].count > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4">🎯 "Total Assets" Locations</h3>
                <div className="space-y-4">
                  {results.search_results['total assets'].positions.map((pos, index) => (
                    <div key={index} className="border-l-4 border-red-500 pl-4 py-2">
                      <div className="font-semibold text-red-700">Position: {pos.percentage}% through document</div>
                      <div className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded font-mono">
                        {pos.context}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Large Numbers */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4">💰 Large Financial Figures</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left">Figure</th>
                      <th className="px-4 py-2 text-left">Value</th>
                      <th className="px-4 py-2 text-left">Location</th>
                      <th className="px-4 py-2 text-left">Context</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.large_numbers.slice(0, 10).map((num, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2 font-mono font-semibold">{num.number}</td>
                        <td className="px-4 py-2">{num.numericValue}</td>
                        <td className="px-4 py-2">{num.percentage}%</td>
                        <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">{num.context}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Document Sections Sample */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4">📄 Document Sections Sample</h3>
              <div className="space-y-4">
                {Object.entries(results.document_sections).map(([section, content]) => (
                  <div key={section} className="border rounded p-4">
                    <h4 className="font-semibold text-gray-700 mb-2 capitalize">{section} (2000 chars)</h4>
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {content.substring(0, 500)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw JSON Data */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4">🔧 Raw Debug Data</h3>
              <details className="cursor-pointer">
                <summary className="text-blue-600 hover:text-blue-700">Click to view raw JSON data</summary>
                <pre className="mt-4 text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <Link href="/research" className="text-green-600 hover:text-green-700">
            ← Back to Research Tool
          </Link>
        </div>
      </div>
    </div>
  )
}
