# ClimateChoices App - Agreed Architecture

## 🎯 **Core Principles**
- **Simple, Cheap, Easy** solution
- **Dynamic discovery** - no static databases
- **Free-first approach** - minimize token costs
- **Human confirmation** for critical decisions

## 🏗️ **System Architecture**

### **Phase 1: Document Discovery (Current)**
```
User Input → Dynamic Web Search → Document Discovery → Human Confirmation
```

#### **1.1 Company Website Discovery**
- **NO static company database** (companies change names/websites)
- **Dynamic web search** using intelligent URL construction
- **Pattern-based URL generation** (e.g., companyname.com.au)
- **Company name cleaning** to handle suffixes like "(Australia)"

#### **1.2 Financial Document Discovery**
- **Crawl company websites** for investor relations pages
- **Pattern matching** for annual reports, financial statements
- **Deep crawling** of investor pages (limited to prevent timeouts)
- **URL pattern testing** for common annual report paths
- **Document prioritization** by relevance and recency

#### **1.3 Human Confirmation Interface**
- **Present discovered documents** with metadata (year, type, format)
- **User selects** which document to analyze
- **No automatic processing** without human approval

### **Phase 2: Document Analysis (Free Foundation)**
```
Selected Document → Free Analysis → AI Enhancement (Optional) → ASRS Classification
```

#### **2.1 Free Analysis Tier**
- **Enhanced Pattern Matching** ($0 cost)
  - ASRS-AASB S2 compliance checking
  - Line item validation
  - 75-85% accuracy
  - Instant results

#### **2.2 AI Analysis Tier (Optional)**
- **Google Gemini** (Free tier - 15 requests/minute)
  - 90-95% accuracy
  - Context understanding
  - $0 cost within limits

#### **2.3 Premium Analysis Tier (Optional)**
- **OpenAI GPT-4** (~$1-2 per analysis)
  - 95-98% accuracy
  - Advanced reasoning
  - User's choice for critical analysis

### **Phase 3: ASRS Assessment**
```
Financial Data → ASRS Thresholds → Classification → Reporting Requirements
```

#### **3.1 Data Extraction**
- **Revenue**: From audited income statements
- **Assets**: From audited balance sheets  
- **Employees**: From annual reports or external sources
- **Confidence scoring**: 1-5 scale based on source quality

#### **3.2 ASRS Classification**
- **Group 1**: Report from 1 July 2024 (2+ criteria: Revenue ≥$500M, Assets ≥$1B, Employees ≥500)
- **Group 2**: Report from 1 July 2026 (2+ criteria: Revenue $200M-$500M, Assets $500M-$1B, Employees 250-500)
- **Group 3**: Report from 1 July 2027 (2+ criteria: Revenue $50M-$200M, Assets $25M-$500M, Employees 100-250)
- **No requirement**: If doesn't meet 2+ criteria in any group

## 🔧 **Technical Implementation**

### **API Endpoints**
- `/api/research` - Company discovery and document finding
- `/api/tiered-analysis` - Multi-tier analysis system
- `/api/enhanced-free-analysis` - Free pattern matching
- `/api/gemini-analysis` - Free AI analysis
- `/api/external-employee-data` - External data sourcing

### **Key Features**
- **Rate limiting** - Prevent abuse
- **Timeout handling** - Prevent serverless function timeouts
- **Error recovery** - Graceful fallbacks
- **Responsive UI** - Works on mobile/desktop

## 🎯 **GPT Integration Approach**

### **Your Proven GPT Instructions**
- **Part 1**: Obtain Annual Report (web search)
- **Part 2**: Annual Report Assessment (data extraction)
- **Part 3**: Applicability Assessment (ASRS classification)

### **Integration Strategy**
- **Document Discovery**: Web app finds documents
- **Human Confirmation**: User selects document
- **Analysis**: Use your GPT prompts via API or manual handoff
- **Results**: Structured ASRS assessment

## 💰 **Cost Structure**

### **Always Free**
- Company website discovery
- Document discovery and prioritization
- Enhanced pattern matching analysis
- Basic ASRS classification

### **Free Tier (with limits)**
- Google Gemini AI analysis (15 requests/minute)

### **Premium (user choice)**
- OpenAI GPT-4 analysis (~$1-2 per document)

## 🚀 **Current Status**
- ✅ **Phase 1**: Document discovery working (Westpac, Coles tested)
- ✅ **Phase 2**: Free analysis implemented
- 🔄 **Testing**: Bank of Sydney and other companies
- 📋 **Next**: Refine based on testing feedback

## 🎯 **Success Criteria**
1. **Find annual reports** for 90%+ of Australian companies
2. **Extract basic financial data** with 75%+ accuracy (free tier)
3. **Provide ASRS classification** with confidence scores
4. **Cost under $2** per complete analysis (premium tier)
5. **Simple user experience** - minimal clicks to results

---

**Last Updated**: 2025-07-08
**Version**: 2.0 (Static database removed, dynamic search only)
