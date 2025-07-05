import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%232563eb'/><text x='50' y='60' font-family='Arial' font-size='40' font-weight='bold' text-anchor='middle' fill='white'>C</text></svg>" />
        <meta name="description" content="ClimateChoices Company Research Tool - Research Australian companies for financial and organizational data" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
