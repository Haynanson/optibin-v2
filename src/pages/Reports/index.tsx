import { useState } from 'react'
import { useStore } from '../../lib/store'

const REPORTS = [
  { id: 1, title: '黄浦区公共空间废物箱配置诊断报告', type: '区级诊断', date: '2025-03', st: 'complete', pages: 42 },
  { id: 2, title: '上海市交通枢纽废物箱SEI评估报告', type: '专项研究', date: '2025-02', st: 'complete', pages: 28 },
  { id: 3, title: '南京路步行街配置优化专项方案', type: '商业体方案', date: '2025-03', st: 'complete', pages: 19 },
  { id: 4, title: '2025年上海市公共空间废物箱指数年报', type: '年度报告', date: '2025-04', st: 'draft', pages: 65 },
]

export default function Reports() {
  const { projectInfo } = useStore()
  const [selected, setSelected] = useState<number | null>(null)
  const reports = projectInfo.initialized
    ? [{ id: 99, title: `${projectInfo.name} - SEI诊断报告`, type: '自动生成', date: new Date().toISOString().slice(0, 10), st: 'complete', pages: 15 }, ...REPORTS]
    : REPORTS
  const r = selected ? reports.find((x) => x.id === selected) : null

  return (
    <div>
      <div className="grid grid-4" style={{ marginBottom: 14 }}>
        {[
          { v: reports.filter((r) => r.st === 'complete').length, l: '已完成报告', c: 'var(--good)' },
          { v: reports.filter((r) => r.st === 'draft').length, l: '草稿进行中', c: 'var(--warn)' },
          { v: reports.filter((r) => r.type.includes('诊断')).length, l: '政府诊断报告', c: 'var(--primary)' },
          { v: reports.filter((r) => r.type.includes('方案')).length, l: '商业专项方案', c: 'var(--sage)' },
        ].map((o) => (
          <div key={o.l} className="stat-card" style={{ background: 'var(--pale)' }}>
            <div className="stat-value" style={{ color: o.c }}>{o.v}</div>
            <div className="stat-label">{o.l}</div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: r ? '1fr 320px' : '1fr' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="card-title" style={{ marginBottom: 0 }}>报告列表</span>
            <button className="btn btn-primary">+ 新建报告</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reports.map((rr) => (
              <div key={rr.id} onClick={() => setSelected(selected === rr.id ? null : rr.id)} className={`list-item ${selected === rr.id ? 'active' : ''}`}>
                <div className="icon-box" style={{ background: rr.st === 'complete' ? 'var(--pale)' : 'var(--warn)', color: rr.st === 'complete' ? 'var(--primary)' : 'var(--warn)', fontSize: 16 }}>■</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="card-title" style={{ marginBottom: 3 }}>{rr.title}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="badge badge-normal">{rr.type}</span>
                    <span className="stat-label">{rr.date}</span>
                    <span className="stat-label">{rr.pages}页</span>
                  </div>
                </div>
                <span className={`badge ${rr.st === 'complete' ? 'badge-good' : 'badge-warning'}`}>{rr.st === 'complete' ? '已完成' : '草稿'}</span>
              </div>
            ))}
          </div>
        </div>

        {r && (
          <div className="detail-panel">
            <div className="detail-header">
              <span className="card-title" style={{ marginBottom: 0 }}>报告预览</span>
              <button className="detail-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="insight-card" style={{ background: 'var(--pale)', marginBottom: 14 }}>
              <div className="desc" style={{ fontWeight: 500, color: 'var(--primary)', marginBottom: 4 }}>{r.type}</div>
              <div className="label" style={{ lineHeight: 1.4 }}>{r.title}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <span className="stat-label">{r.date}</span>
                <span className="stat-label">{r.pages}页</span>
              </div>
            </div>
            <div className="stat-label" style={{ fontWeight: 500, marginBottom: 8 }}>报告结构</div>
            {['执行摘要与核心发现', 'SEI空间效率指数分析', '冗余区识别与优化建议', '盲区检测与补点方案', '差异化配置策略', '附录：原始数据清单'].map((s, i) => (
              <div key={i} className="list-item" style={{ marginBottom: 6, padding: '6px 10px', cursor: 'default' }}>
                <span className="icon-box" style={{ width: 18, height: 18, borderRadius: 4, fontSize: 9, fontWeight: 600 }}>{i + 1}</span>
                <span style={{ fontSize: 11 }}>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
