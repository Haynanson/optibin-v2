interface HeaderProps {
  title: string
  onToggleSidebar: () => void
}

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  spatial: '空间诊断',
  analysis: '数据分析',
  optimize: '配置优化',
  reports: '报告中心',
  policy: '政策对接',
  clients: '客户管理',
  market: '市场分析',
  ai: 'AI助手',
  public: '公众参与',
}

export default function Header({ title, onToggleSidebar }: HeaderProps) {
  return (
    <div className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onToggleSidebar}
          className="btn btn-outline"
          style={{ padding: '4px 8px', fontSize: 18 }}
        >
          ☰
        </button>
        <div>
          <div className="header-title">{PAGE_LABELS[title] || title}</div>
          <div className="header-subtitle">上海市公共空间废物箱精细化配置与智慧治理决策服务平台</div>
        </div>
      </div>
      <div className="header-status">
        <span className="header-badge badge-good">系统在线</span>
        <span className="header-badge badge-normal">SEI v2.0</span>
      </div>
    </div>
  )
}
