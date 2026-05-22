import { useStore } from '../../lib/store'
import { identifyRedundantPoints } from '../../lib/geo'
import { generateOptimizationSuggestions } from '../../lib/sei'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function Optimize() {
  const { seiResults, pointsData, config } = useStore()
  const hasData = seiResults.length > 0 && pointsData.length > 0
  const redundantIds = hasData ? identifyRedundantPoints(pointsData, config.bufferRadius, 50) : []
  const suggestions = hasData ? generateOptimizationSuggestions(seiResults, pointsData) : []

  const comparisonData = hasData
    ? [...seiResults].sort((a, b) => a.sei - b.sei).slice(0, 3).map((w) => ({ name: w.pointName, before: Math.round(w.sei), after: Math.min(100, Math.round(w.sei + 15)) }))
    : [{ name: '示例A', before: 45, after: 68 }, { name: '示例B', before: 38, after: 62 }, { name: '示例C', before: 52, after: 67 }]

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <button className="btn btn-primary">🔄 运行完整诊断</button>
        <button className="btn btn-gold">📥 导出优化报告</button>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 14 }}>
        {[
          { v: hasData ? redundantIds.length + '处' : '-', l: '冗余点位', c: 'var(--crit)', b: '#FBEAE6' },
          { v: hasData ? Math.round(redundantIds.length / pointsData.length * 100) + '%' : '-', l: '可削减预测', c: 'var(--warn)', b: '#FBF4E0' },
          { v: hasData ? '15-25%' : '-', l: '潜在运维节省', c: 'var(--good)', b: '#E4F0E8' },
        ].map((o) => (
          <div key={o.l} className="stat-card" style={{ background: o.b }}>
            <div className="stat-value" style={{ color: o.c }}>{o.v}</div>
            <div className="stat-label">{o.l}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">差异化配置优化策略</div>
        <table className="table">
          <thead>
            <tr style={{ background: 'var(--pale)' }}>
              <th>类型</th><th>核心策略</th><th>说明</th><th>优先级</th><th>影响</th>
            </tr>
          </thead>
          <tbody>
            {(suggestions.length > 0 ? suggestions : [
              { type: '交通枢纽', title: '精简冗余布点', description: '重复覆盖率超75%', priority: 'urgent' as const, estimatedImpact: '高' },
              { type: '公共绿地', title: '补充边缘盲区', description: '主游览动线末端存在服务盲区', priority: 'high' as const, estimatedImpact: '高' },
              { type: '商业街区', title: '线性冗余优化', description: '步行街连续多桶现象突出', priority: 'medium' as const, estimatedImpact: '中' },
            ]).map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{r.type}</td>
                <td style={{ color: 'var(--muted)' }}>{r.title}</td>
                <td style={{ color: 'var(--muted)', maxWidth: 160 }}>{r.description}</td>
                <td><span className={`badge badge-${r.priority === 'urgent' ? 'critical' : r.priority === 'high' ? 'warning' : 'normal'}`}>{r.priority === 'urgent' ? '紧急' : r.priority === 'high' ? '高' : '中'}</span></td>
                <td><span className="badge badge-good">{r.estimatedImpact}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-title">优化前后SEI预测对比</div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={comparisonData} margin={{ left: 0, right: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
            <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="before" name="优化前SEI" fill="var(--crit)" radius={[3, 3, 0, 0]} barSize={24} opacity={0.5} />
            <Bar dataKey="after" name="优化后预测" fill="var(--primary)" radius={[3, 3, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
