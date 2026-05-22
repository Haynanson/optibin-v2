import { useState } from 'react'
import { useStore } from '../../lib/store'
import { searchPolicies } from '../../lib/search'
import type { Policy } from '../../types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function PolicyPage() {
  const { policies } = useStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [yearFrom, setYearFrom] = useState('2024')
  const [yearTo, setYearTo] = useState('2026')
  const [region, setRegion] = useState('上海')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Policy[]>([])
  const displayPolicies = searchResults.length > 0 ? searchResults : policies
  const p = selected ? displayPolicies.find((x) => x.id === selected) : null

  const handleSearch = async () => {
    setIsSearching(true)
    const { extracted } = await searchPolicies(region, yearFrom, yearTo)
    if (extracted.length > 0) setSearchResults(extracted.map((e, i) => ({ id: `S${i}`, code: e.code, name: e.name, date: e.date, status: e.status, region, relevance: e.relevance, keyPoints: e.keyPoints })))
    setIsSearching(false)
  }

  return (
    <div>
      <div className="search-bar">
        <div><label>地区</label><select value={region} onChange={(e) => setRegion(e.target.value)}><option>上海</option><option>北京</option><option>深圳</option><option>全国</option></select></div>
        <div><label>起始年</label><input value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} /></div>
        <div><label>截止年</label><input value={yearTo} onChange={(e) => setYearTo(e.target.value)} /></div>
        <button className="btn btn-primary" onClick={handleSearch} disabled={isSearching}>{isSearching ? '⏳ 搜索中...' : '🔍 搜索政策'}</button>
      </div>

      <div className="dark-banner">
        <div style={{ flex: 1 }}>
          <h3>政策雷达 · 实时追踪OptiBin相关法规动态</h3>
          <p>自动比对各政策条文与OptiBin服务耦合度</p>
        </div>
        {[
          { v: displayPolicies.filter((p) => p.status === '现行').length, l: '现行政策', c: 'var(--good)' },
          { v: displayPolicies.filter((p) => p.status === '征求意见').length, l: '征求意见', c: 'var(--warn)' },
          { v: displayPolicies.filter((p) => p.status === '待施行').length, l: '待施行', c: 'var(--light)' },
        ].map((o) => (
          <div key={o.l} style={{ textAlign: 'center', padding: '6px 14px', background: 'rgba(255,255,255,0.08)', borderRadius: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: o.c }}>{o.v}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>{o.l}</div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: p ? '1fr 300px' : '1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayPolicies.map((pol) => (
            <div key={pol.id} onClick={() => setSelected(selected === pol.id ? null : pol.id)} className="card" style={{ cursor: 'pointer', borderLeft: `4px solid ${pol.relevance >= 90 ? 'var(--good)' : pol.relevance >= 80 ? 'var(--primary)' : 'var(--sage)'}`, borderColor: selected === pol.id ? 'var(--primary)' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ flex: 1, marginRight: 10 }}>
                  <div className="card-title" style={{ marginBottom: 3 }}>{pol.name}</div>
                  <div className="stat-label">{pol.code} · {pol.date}</div>
                </div>
                <span className={`badge ${pol.status === '现行' ? 'badge-good' : pol.status === '征求意见' ? 'badge-warning' : 'badge-normal'}`}>{pol.status}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 130 }}>
                  <div className="stat-label" style={{ marginBottom: 3 }}>政策耦合度</div>
                  <div className="progress"><div className="progress-track"><div className="progress-fill" style={{ width: `${pol.relevance}%`, background: pol.relevance >= 90 ? 'var(--good)' : 'var(--primary)' }} /></div><span className="progress-label">{pol.relevance}</span></div>
                </div>
                <div className="desc" style={{ lineHeight: 1.5, flex: 1 }}>{pol.keyPoints}</div>
              </div>
            </div>
          ))}
        </div>

        {p && (
          <div className="detail-panel">
            <div className="detail-header"><span className="card-title" style={{ marginBottom: 0 }}>政策解读</span><button className="detail-close" onClick={() => setSelected(null)}>×</button></div>
            <div className="dark-banner" style={{ flexDirection: 'column', alignItems: 'flex-start', marginBottom: 14 }}>
              <div className="stat-label" style={{ opacity: 0.6 }}>{p.code}</div>
              <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.5, marginTop: 3 }}>{p.name}</div>
              <div className="stat-label" style={{ marginTop: 4, opacity: 0.65 }}>{p.date} · {p.status}</div>
            </div>
            {[
              ['方案合规性支撑', p.relevance],
              ['客户说服材料价值', Math.min(Math.round(p.relevance * 0.95), 100)],
              ['导则修订参考价值', Math.min(Math.round(p.relevance * 1.05), 100)],
            ].map(([label, value]) => (
              <div key={label} style={{ marginBottom: 8 }}>
                <div className="stat-label" style={{ marginBottom: 3 }}>{label}</div>
                <div className="progress"><div className="progress-track"><div className="progress-fill" style={{ width: `${value}%`, background: 'var(--primary)' }} /></div><span className="progress-label">{value}</span></div>
              </div>
            ))}
            <div className="insight-card" style={{ background: 'var(--pale)', marginTop: 10 }}>
              <div className="label" style={{ color: 'var(--primary)', marginBottom: 4 }}>核心条款</div>
              <div className="desc" style={{ lineHeight: 1.6 }}>{p.keyPoints}</div>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-title">政策耦合度分布</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={displayPolicies} margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'var(--muted)' }} angle={-15} textAnchor="end" interval={0} height={50} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--muted)' }} />
            <Tooltip />
            <Bar dataKey="relevance" name="耦合度" radius={[3, 3, 0, 0]} barSize={20}>
              {displayPolicies.map((p, i) => <Cell key={i} fill={p.relevance >= 90 ? 'var(--good)' : p.relevance >= 80 ? 'var(--primary)' : 'var(--sage)'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
