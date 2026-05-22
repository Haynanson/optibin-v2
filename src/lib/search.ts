export interface SearchResult {
  title: string
  content: string
  url: string
  score: number
}

export interface PolicyExtracted {
  code: string
  name: string
  date: string
  status: string
  relevance: number
  keyPoints: string
}

export interface MarketExtracted {
  year: string
  marketSize: number
  smartMarket: number
  growthRate: number
  source: string
}

interface TavilyResult {
  title?: unknown
  content?: unknown
  url?: unknown
  score?: unknown
}

interface TavilyResponse {
  results?: TavilyResult[]
}

function parseTavilyResults(data: TavilyResponse): SearchResult[] {
  return (data.results || []).map((r) => ({
    title: typeof r.title === 'string' ? r.title : '',
    content: typeof r.content === 'string' ? r.content : '',
    url: typeof r.url === 'string' ? r.url : '',
    score: typeof r.score === 'number' ? r.score : 0,
  }))
}

async function tavilySearch(
  apiKey: string,
  query: string,
  maxResults = 10
): Promise<SearchResult[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      max_results: maxResults,
    }),
  })

  if (!response.ok) {
    const status = response.status
    const text = await response.text().catch(() => 'unknown')
    throw new Error(`Tavily API error ${status}: ${text}`)
  }

  const data: TavilyResponse = await response.json()
  return parseTavilyResults(data)
}

export async function searchPolicies(
  region: string,
  yearFrom: string,
  yearTo: string
): Promise<{ results: SearchResult[]; extracted: PolicyExtracted[] }> {
  const query = `${region} ${yearFrom}-${yearTo} 公共空间废物箱配置 垃圾分类 城市精细化管理 政策法规`

  const tavilyApiKey = import.meta.env.VITE_TAVILY_API_KEY
  if (!tavilyApiKey) {
    console.warn('[search] VITE_TAVILY_API_KEY not set, skipping policy search')
    return { results: [], extracted: [] }
  }

  try {
    const results = await tavilySearch(tavilyApiKey, query)
    const extracted = extractPolicyData(results)
    return { results, extracted }
  } catch (err) {
    console.error('[search] Policy search failed:', err)
    return { results: [], extracted: [] }
  }
}

export async function searchMarketData(
  keyword: string,
  yearFrom: string,
  yearTo: string
): Promise<{ results: SearchResult[]; extracted: MarketExtracted[] }> {
  const query = `${keyword} ${yearFrom}-${yearTo} 市场规模 产业规模 增长率 融资`

  const tavilyApiKey = import.meta.env.VITE_TAVILY_API_KEY
  if (!tavilyApiKey) {
    console.warn('[search] VITE_TAVILY_API_KEY not set, skipping market search')
    return { results: [], extracted: [] }
  }

  try {
    const results = await tavilySearch(tavilyApiKey, query)
    const extracted = extractMarketData(results)
    return { results, extracted }
  } catch (err) {
    console.error('[search] Market search failed:', err)
    return { results: [], extracted: [] }
  }
}

/**
 * Extract policy document codes from Chinese text.
 * Matches common formats:
 *   - 国发〔2023〕15号, 建城〔2021〕86号
 *   - 国务院令第735号
 *   - XX字〔YYYY〕N号
 */
function extractPolicyData(results: SearchResult[]): PolicyExtracted[] {
  const policies: PolicyExtracted[] = []
  for (const r of results) {
    // Match policy code patterns: issuer + bracket year + number + 号
    const codeMatch =
      r.content.match(/[一-鿿]+[〔\[]\d{4}[〕\]]\d+号?/) ||
      r.content.match(/[一-鿿]+令第\d+号/)
    // Match dates: 2023年1月15日 or 2023-01-15
    const dateMatch = r.content.match(/\d{4}[-年]\d{1,2}[-月]\d{1,2}[日]?/)
    policies.push({
      code: codeMatch?.[0] || '',
      name: r.title,
      date: dateMatch?.[0] || '',
      status: '现行',
      relevance: Math.round(r.score * 100),
      keyPoints: r.content.slice(0, 200),
    })
  }
  return policies.slice(0, 5)
}

/**
 * Extract market data (year, size in 亿) from Chinese text.
 * Matches patterns like: 2023年市场规模达100亿元, 1,234.5亿元
 */
function extractMarketData(results: SearchResult[]): MarketExtracted[] {
  const data: MarketExtracted[] = []
  for (const r of results) {
    const yearMatch = r.content.match(/20[12]\d/)
    // Match numbers with optional comma separators and decimals before 亿
    const sizeMatch = r.content.match(/([\d]+(?:,\d{3})*(?:\.\d+)?)\s*亿/)
    if (yearMatch && sizeMatch) {
      const marketSize = parseFloat(sizeMatch[1].replace(/,/g, ''))
      if (!isNaN(marketSize)) {
        data.push({
          year: yearMatch[0],
          marketSize,
          smartMarket: 0,
          growthRate: 0,
          source: r.title,
        })
      }
    }
  }
  return data.slice(0, 8)
}
