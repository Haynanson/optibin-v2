import { useState } from 'react'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import Dashboard from './pages/Dashboard'
import SpatialDiag from './pages/SpatialDiag'
import DataAnalysis from './pages/DataAnalysis'
import Optimize from './pages/Optimize'
import Reports from './pages/Reports'
import PolicyPage from './pages/Policy'
import ClientPage from './pages/Clients'
import MarketPage from './pages/Market'
import AIAssistant from './pages/AI'
import PublicFeedback from './pages/PublicFeedback'

const PAGES: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  spatial: SpatialDiag,
  analysis: DataAnalysis,
  optimize: Optimize,
  reports: Reports,
  policy: PolicyPage,
  clients: ClientPage,
  market: MarketPage,
  ai: AIAssistant,
  public: PublicFeedback,
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const Page = PAGES[page] || Dashboard

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={page}
        onNavigate={setPage}
        collapsed={!sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="app-main">
        <Header
          title={page}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="app-content">
          <Page />
        </div>
      </div>
    </div>
  )
}
