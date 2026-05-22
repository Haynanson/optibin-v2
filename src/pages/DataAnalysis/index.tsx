import { useState } from 'react'
import { useStore } from '../../lib/store'
import { SAT_TYPE_DEFAULT, SAT_DIM_DEFAULT, OPINION_DEFAULT, PIE_DATA_DEFAULT } from '../../data/constants'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell,
} from 'recharts'

const PIE_COLS = ['var(--good)', 'var(--primary)', 'var(--sage)', 'var(--crit)']

export default function DataAnalysis() {
  const { seiResults } = useStore()
  const [tab, setTab] = useState<'sat' | 'gis' | 'opinion'>('sat')

  return (
    <div>
      <div className="tabs">
        {([['sat', '满意度分析'], ['gis', 'GIS诊断指标'], ['opinion', '公众意愿']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`tab ${tab === id ? 'active' : ''}`}>{label}</button>
        ))}
      </div>

      {tab === 'sat' && (
        <div>
          <div className="grid grid-2" style={{ marginBottom: 14 }}>
            <div className="card">
              <div className="card-title">各空间类型满意度对比</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={SAT_TYPE_DEFAULT} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" domain={[50, 95]} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted)' }} width={70} />
                  <Tooltip />
                  <Bar dataKey="v" radius={[0, 4, 4, 0]} barSize={16}>
                    {SAT_TYPE_DEFAULT.map((e, i) => <Cell key={i} fill={e.v >= 75 ? 'var(--good)' : e.v >= 65 ? 'var(--primary)' : 'var(--warn)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <div className="card-title">满意度五维度雷达</div>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={SAT_DIM_DEFAULT} margin={{ top: 10, bottom: 10 }}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--light)' }} />
                  <Radar dataKey="v" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <div className="card-title">感知-实态交叉验证 · 核心悖论</div>
            <div className="grid grid-3">
              {[
                { site: '浦西公共绿地', per: '满意度 80.2%', real: '间距有效率 45-51%' },
                { site: '旅游景区', per: '愿意携带 99%', real: '混投率 42%' },
                { site: '交通枢纽', per: '满意度 60.5%', real: '覆盖有效率 49.3%' },
              ].map((item) => (
                <div key={item.site} className="insight-card" style={{ background: 'var(--pale)' }}>
                  <div className="label" style={{ color: 'var(--primary)', marginBottom: 6 }}>{item.site}</div>
                  <div className="desc" style={{ marginBottom: 3 }}><span style={{ color: 'var(--sage)' }}>问卷感知：</span>{item.per}</div>
                  <div className="desc" style={{ marginBottom: 6 }}><span style={{ color: 'var(--warn)' }}>实态测量：</span>{item.real}</div>
                  <div className="desc" style={{ fontWeight: 500, color: 'var(--primary)' }}>→ 感知与实态系统性偏差</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'gis' && (
        <div>
          <div className="grid grid-4" style={{ marginBottom: 14 }}>
            {[
              { v: seiResults.length > 0 ? (seiResults.reduce((s, r) => s + r.overlapRatio, 0) / seiResults.length).toFixed(1) + '%' : '-', l: '平均重叠率', c: 'var(--crit)' },
              { v: seiResults.length > 0 ? ((seiResults.filter((r) => r.nearestDistance <= 80).length / seiResults.length) * 100).toFixed(1) + '%' : '-', l: '间距有效率', c: 'var(--warn)' },
              { v: seiResults.length > 0 ? (seiResults.reduce((s, r) => s + r.usageMatch, 0) / seiResults.length).toFixed(1) : '-', l: '使用强度均值', c: 'var(--crit)' },
              { v: seiResults.length > 0 ? Math.min(...seiResults.map((r) => r.sei)).toFixed(0) : '-', l: '最低SEI', c: 'var(--warn)' },
            ].map((o) => (
              <div key={o.l} className="stat-card" style={{ background: 'var(--crit)', borderLeft: `3px solid ${o.c}` }}>
                <div className="stat-value" style={{ color: o.c }}>{o.v}</div>
                <div className="stat-label">{o.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'opinion' && (
        <div className="grid grid-2">
          <div className="card">
            <div className="card-title">公众意愿核心指标（n=733）</div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={OPINION_DEFAULT} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted)' }} width={100} />
                <Tooltip />
                <Bar dataKey="v" radius={[0, 4, 4, 0]} barSize={16}>
                  {OPINION_DEFAULT.map((e, i) => <Cell key={i} fill={e.v >= 80 ? 'var(--good)' : e.v >= 60 ? 'var(--primary)' : 'var(--sage)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <div className="card-title">减桶态度分布</div>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={PIE_DATA_DEFAULT} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ value }) => `${value}%`}>
                  {PIE_DATA_DEFAULT.map((_, i) => <Cell key={i} fill={PIE_COLS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              {PIE_DATA_DEFAULT.map((d, i) => (
                <span key={d.name} className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLS[i], display: 'inline-block' }} />
                  {d.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
