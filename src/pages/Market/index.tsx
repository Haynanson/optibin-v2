import { useState } from 'react'
import { MARKET_TREND } from '../../data/constants'
import { searchMarketData } from '../../lib/search'
import type { MarketExtracted } from '../../lib/search'
import { AreaChart, Area, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const FINANCE = [
  { m: '1月', rev: 0, cost: 6, profit: -6 }, { m: '2月', rev: 8, cost: 7, profit: 1 },
  { m: '3月', rev: 15, cost: 8, profit: 7 }, { m: '4月', rev: 22, cost: 9, profit: 13 },
  { m: '5月', rev: 28, cost: 9, profit: 19 }, { m: '6月E', rev: 35, cost: 10, profit: 25 },
]

export default function MarketPage() {
  const [keyword, setKeyword] = useState('智慧环卫')
  const [yearFrom, setYearFrom] = useState('2020')
  const [yearTo, setYearTo] = useState('2025')
  const [isSearching, setIsSearching] = useState(false)
  const [searchData, setSearchData] = useState<MarketExtracted[]>([])

  const handleSearch = async () => {
    setIsSearching(true)
    const { extracted } = await searchMarketData(keyword, yearFrom, yearTo)
    setSearchData(extracted)
    setIsSearching(false)
  }

  const displayTrend = searchData.length > 0
    ? searchData.map((d) => ({ year: d.year, env: d.marketSize, smart: d.smartMarket || d.marketSize * 0.3 }))
    : MARKET_TREND

  return (
    <div>
      <div className="search-bar">
        <div><label>关键词</label><input value={keyword} onChange={(e) => setKeyword(e.target.value)} /></div>
        <div><label>起始年</label><input value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} /></div>
        <div><label>截止年</label><input value={yearTo} onChange={(e) => setYearTo(e.target.value)} /></div>
        <button className="btn btn-primary" onClick={handleSearch} disabled={isSearching}>{isSearching ? '⏳ 搜索中...' : '🔍 搜索市场数据'}</button>
      </div>

      <div className="grid grid-53" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-title">中国城市环卫市场规模趋势（亿元）</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={displayTrend} margin={{ left: 0, right: 14 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} />
              <Area type="monotone" dataKey="env" name="城市环卫市场" stroke="var(--primary)" fill="var(--pale)" strokeWidth={2} />
              <Area type="monotone" dataKey="smart" name="智慧环卫细分" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-title">TAM · SAM · SOM 市场分层</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { l: 'TAM 总可及市场', v: '约80-120亿/年', bg: 'var(--border)', tc: 'var(--text)' },
              { l: 'SAM 可服务市场', v: '约15-25亿/年', bg: 'var(--light)', tc: 'var(--text)' },
              { l: 'SOM 可获得市场', v: '约5000-8000万/年', bg: 'var(--primary)', tc: '#fff' },
            ].map((r, i) => (
              <div key={r.l} className="insight-card" style={{ background: r.bg, marginLeft: i * 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="label" style={{ color: r.tc }}>{r.l}</span>
                  <span className="desc" style={{ color: r.tc, opacity: 0.8 }}>{r.v}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 14 }}>
        {[
          { v: '16.96%', l: '智慧环卫CAGR（2014-2023）', c: 'var(--good)' },
          { v: '35%+', l: '华东地区市场占比', c: 'var(--primary)' },
          { v: '130亿元', l: '2024年投融资总额', c: 'var(--warn)' },
        ].map((o) => (
          <div key={o.l} className="stat-card" style={{ background: 'var(--pale)', borderLeft: `3px solid ${o.c}` }}>
            <div className="stat-value" style={{ color: o.c }}>{o.v}</div>
            <div className="stat-label">{o.l}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">OptiBin 6个月营收预测与盈亏分析</div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={FINANCE} margin={{ left: 0, right: 14 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="m" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} />
            <Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="rev" name="营业收入" fill="var(--primary)" radius={[3, 3, 0, 0]} barSize={18} />
            <Bar dataKey="cost" name="运营成本" fill="var(--light)" radius={[3, 3, 0, 0]} barSize={18} />
            <Line type="monotone" dataKey="profit" name="净利润" stroke="var(--good)" strokeWidth={2.5} dot={{ fill: 'var(--good)', r: 3 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
