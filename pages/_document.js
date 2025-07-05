import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        <meta name="description" content="ClimateChoices Company Research Tool - Research Australian companies for financial and organizational data" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
