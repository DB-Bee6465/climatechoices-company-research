# Climate Choices - Company Research Tool

A Next.js web application for researching Australian companies and extracting key financial data from their websites and annual reports.

## Features

- **Company Research**: Extract key business information from Australian companies
- **Financial Data**: Annual revenue, total assets, employee counts
- **Website Analysis**: Automatic website discovery and content extraction
- **Rate Limited**: Built-in rate limiting to prevent abuse
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Next.js API Routes (Serverless Functions)
- **Deployment**: Vercel
- **Domain**: climatechoices.com.au

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd climatechoices-app
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Deploy
```bash
vercel
```

### 3. Add Custom Domain
```bash
vercel domains add climatechoices.com.au
```

### 4. Configure DNS at GoDaddy
Add these DNS records at GoDaddy:
- **Type**: CNAME, **Name**: www, **Value**: cname.vercel-dns.com
- **Type**: A, **Name**: @, **Value**: 76.76.19.61 (Vercel's IP)

## API Endpoints

### POST /api/research
Research a company and extract key data.

**Request Body:**
```json
{
  "companyName": "Australian Military Bank",
  "websiteUrl": "https://www.australianmilitarybank.com.au" // optional
}
```

**Response:**
```json
{
  "company_name": "Australian Military Bank",
  "timestamp": "2024-07-04T12:00:00.000Z",
  "data": {
    "website": {
      "url": "https://www.australianmilitarybank.com.au",
      "title": "Australian Military Bank",
      "description": "...",
      "contact_info": {
        "emails": ["info@amb.com.au"],
        "phones": ["1300 13 23 28"]
      }
    },
    "employee_count": {
      "count": 151,
      "source": "website_text",
      "type": "estimated"
    },
    "annual_revenue": {
      "amount": "3.1",
      "unit": "million",
      "source": "website_text"
    },
    "total_assets": {
      "amount": "1623.1",
      "unit": "million",
      "source": "website_text"
    },
    "financial_year": "2024",
    "parent_company": "Independent"
  }
}
```

## Rate Limiting

- **Limit**: 5 requests per hour per IP address
- **Window**: 1 hour rolling window
- **Response**: 429 status code when exceeded

## Project Structure

```
climatechoices-app/
├── pages/
│   ├── index.js          # Landing page
│   ├── research.js       # Research form and results
│   ├── about.js          # About page
│   ├── _app.js           # App wrapper
│   └── api/
│       └── research.js   # Company research API
├── styles/
│   └── globals.css       # Global styles with Tailwind
├── public/               # Static assets
├── package.json          # Dependencies
├── next.config.js        # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── README.md            # This file
```

## Environment Variables

For production, you may want to add:

```bash
# .env.local
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW_MS=3600000
```

## Future Enhancements

- [ ] PDF annual report processing
- [ ] User accounts and search history
- [ ] Advanced financial analysis
- [ ] Bulk company research
- [ ] Data export functionality
- [ ] Real-time company monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and proprietary.

## Support

For support, contact: [your-email@domain.com]
