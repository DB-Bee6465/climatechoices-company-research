import Head from 'next/head'
import Link from 'next/link'

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>About - Climate Choices</title>
        <meta name="description" content="Learn about Climate Choices company research tool" />
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
              <Link href="/research" className="text-gray-700 hover:text-blue-600">
                Research Tool
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">About Climate Choices</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-gray-600 mb-6">
              Climate Choices is a company research tool designed specifically for Australian businesses. 
              We help you quickly extract key financial and organizational data from company websites and annual reports.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">What We Extract</h2>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li><strong>Financial Data:</strong> Annual revenue, total assets, and key financial metrics</li>
              <li><strong>Employee Information:</strong> FTE staff counts and workforce details</li>
              <li><strong>Company Structure:</strong> Parent companies and organizational hierarchy</li>
              <li><strong>Contact Information:</strong> Email addresses and phone numbers</li>
              <li><strong>Annual Reports:</strong> Links to financial statements and disclosure documents</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How It Works</h2>
            <ol className="list-decimal pl-6 mb-6 space-y-2">
              <li>Enter a company name (Australian companies work best)</li>
              <li>Our system searches for the company's official website</li>
              <li>We analyze the website content and look for annual reports</li>
              <li>Financial data is extracted using advanced pattern recognition</li>
              <li>Results are presented in an easy-to-read format</li>
            </ol>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Sources</h2>
            <p className="mb-4">
              We extract information from publicly available sources including:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Company websites and investor relations pages</li>
              <li>Annual reports and financial statements</li>
              <li>Disclosure documents and regulatory filings</li>
              <li>Public business directories</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Australian Focus</h2>
            <p className="mb-6">
              Our tool is specifically designed for Australian companies and understands:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Australian financial year (July 1 - June 30)</li>
              <li>APRA reporting requirements</li>
              <li>Australian business structures (Pty Ltd, Ltd, etc.)</li>
              <li>Local financial terminology and units</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Privacy & Usage</h2>
            <p className="mb-4">
              We respect privacy and operate transparently:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>We only access publicly available information</li>
              <li>No personal data is collected or stored</li>
              <li>Research results are not permanently stored</li>
              <li>Rate limiting prevents abuse of the service</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Limitations</h2>
            <p className="mb-4">
              Please note the following limitations:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Results depend on publicly available information</li>
              <li>Not all companies publish detailed financial data online</li>
              <li>Private companies may have limited public information</li>
              <li>Data accuracy depends on source quality</li>
            </ul>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Get Started</h3>
              <p className="text-blue-800 mb-4">
                Ready to research Australian companies? Try our tool with any Australian business name.
              </p>
              <Link
                href="/research"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Start Researching
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
