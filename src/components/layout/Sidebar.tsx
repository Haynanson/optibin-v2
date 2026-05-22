interface MenuItem {
  id: string
  label: string
  group: '核心' | '扩展'
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', group: '核心' },
  { id: 'spatial', label: '空间诊断', group: '核心' },
  { id: 'analysis', label: '数据分析', group: '核心' },
  { id: 'optimize', label: '配置优化', group: '核心' },
  { id: 'reports', label: '报告中心', group: '核心' },
  { id: 'policy', label: '政策对接', group: '扩展' },
  { id: 'clients', label: '客户管理', group: '扩展' },
  { id: 'market', label: '市场分析', group: '扩展' },
  { id: 'ai', label: 'AI助手', group: '扩展' },
  { id: 'public', label: '公众参与', group: '扩展' },
]

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ currentPage, onNavigate, collapsed, onToggle }: SidebarProps) {
  const groups = ['核心', '扩展'] as const

  return (
    <div className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo" style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s' }}>
        <h1>OptiBin</h1>
        <p>智配平台 · 上海师范大学</p>
      </div>

      {groups.map((group) => {
        const items = MENU_ITEMS.filter((m) => m.group === group)
        return (
          <div key={group} className="sidebar-group" style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s' }}>
            <div className="sidebar-group-label">{group}模块</div>
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id)
                  if (window.innerWidth < 768) onToggle()
                }}
                className={`sidebar-item ${currentPage === item.id ? 'active' : ''}`}
              >
                <span className="indicator" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )
      })}

      <div className="sidebar-footer" style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s' }}>
        <p>
          SEI算法 V2.0<br />
          数据2026-03<br />
          环境与地理科学学院
        </p>
      </div>
    </div>
  )
}
