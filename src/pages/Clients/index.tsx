import { useState } from 'react'
import { useClients } from '../../lib/store'
import type { Client } from '../../types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const typeIcon: Record<string, string> = { government: '🏛', commercial: '🏢', scenic: '🌿' }

export default function ClientPage() {
  const { clients, addClient } = useClients()
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState('全部')
  const [showAdd, setShowAdd] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', type: 'commercial' as Client['type'], tier: 'B' as Client['tier'], revenue: 0, contact: '' })

  const filtered = filter === '全部' ? clients : clients.filter((x) => { const m: Record<string, string> = { 政府: 'government', 商业体: 'commercial', 景区: 'scenic' }; return x.type === m[filter] })
  const totalRev = clients.reduce((a, b) => a + b.revenue, 0)
  const c = selected ? clients.find((x) => x.id === selected) : null
  const stageFunnel = [
    { name: '意向', v: clients.filter((c) => c.status === 'prospect').length },
    { name: '洽谈', v: clients.filter((c) => c.status === 'negotiating').length },
    { name: '执行', v: clients.filter((c) => c.status === 'active').length },
    { name: '完结', v: clients.filter((c) => c.status === 'complete').length },
  ]

  return (
    <div>
      <div className="grid grid-4" style={{ marginBottom: 14 }}>
        {[
          { v: clients.length, u: '家', l: '客户总数', c: 'var(--primary)' },
          { v: clients.filter((x) => x.status === 'active').length, u: '家', l: '进行中', c: 'var(--good)' },
          { v: '¥' + totalRev.toFixed(1), u: '万', l: '合同总额', c: 'var(--primary)' },
          { v: '¥' + (clients.length > 0 ? (totalRev / clients.length).toFixed(1) : '0'), u: '万', l: '客单价均值', c: 'var(--sage)' },
        ].map((o) => (
          <div key={o.l} className="stat-card" style={{ background: 'var(--pale)' }}>
            <div className="stat-value" style={{ color: o.c }}>{o.v}<span className="stat-unit">{o.u}</span></div>
            <div className="stat-label">{o.l}</div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: c ? '1fr 1fr 280px' : '1.4fr 1fr' }}>
        <div className="card">
          <div className="filter-bar">
            {['全部', '政府', '商业体', '景区'].map((f) => <button key={f} onClick={() => setFilter(f)} className={`filter-pill ${filter === f ? 'active' : ''}`}>{f}</button>)}
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowAdd(!showAdd)}>{showAdd ? '取消' : '+ 新增客户'}</button>
          </div>
          {showAdd && (
            <div className="card" style={{ background: 'var(--pale)', marginBottom: 12 }}>
              <div className="search-bar" style={{ marginBottom: 10 }}>
                <input placeholder="客户名称" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
                <select value={newClient.type} onChange={(e) => setNewClient({ ...newClient, type: e.target.value as Client['type'] })}><option value="government">政府</option><option value="commercial">商业体</option><option value="scenic">景区</option></select>
                <input type="number" placeholder="合同金额（万）" value={newClient.revenue} onChange={(e) => setNewClient({ ...newClient, revenue: parseFloat(e.target.value) || 0 })} />
                <input placeholder="联系人" value={newClient.contact} onChange={(e) => setNewClient({ ...newClient, contact: e.target.value })} />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { if (!newClient.name.trim()) { alert('请输入客户名称'); return }; addClient({ ...newClient, id: String(Date.now()), status: 'prospect', stage: '意向评估', date: new Date().toISOString().slice(5, 10), tags: [] }); setShowAdd(false); setNewClient({ name: '', type: 'commercial', tier: 'B', revenue: 0, contact: '' }) }}>确认添加</button>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map((cl) => (
              <div key={cl.id} onClick={() => setSelected(selected === cl.id ? null : cl.id)} className={`list-item ${selected === cl.id ? 'active' : ''}`}>
                <div className="icon-box">{typeIcon[cl.type] || '○'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="card-title" style={{ marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cl.name}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span className={`badge badge-${cl.status}`} /><span className="stat-label">{cl.stage}</span></div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="card-title" style={{ color: 'var(--primary)' }}>¥{cl.revenue}万</div>
                  <div className="stat-label" style={{ fontSize: 9 }}>{cl.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">销售漏斗</div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={stageFunnel} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <Tooltip /><Bar dataKey="v" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {c && (
          <div className="detail-panel">
            <div className="detail-header"><span className="card-title" style={{ marginBottom: 0 }}>客户档案</span><button className="detail-close" onClick={() => setSelected(null)}>×</button></div>
            <div className="insight-card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, background: 'var(--pale)' }}>
              <div className="icon-box" style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--dark)', fontSize: 16 }}>{typeIcon[c.type]}</div>
              <div><div className="card-title">{c.name}</div><div className="stat-label">{c.contact}</div></div>
            </div>
            {[
              ['合同预估', '¥' + c.revenue + '万'], ['接触日期', c.date], ['当前阶段', c.stage], ['客户等级', 'Tier ' + c.tier],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="stat-label">{k}</span>
                <span style={{ fontSize: 11, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {c.tags.map((t) => <span key={t} className="badge badge-normal">{t}</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
