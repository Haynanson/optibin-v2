import { useState } from 'react'
import type { Feedback } from '../../types'

export default function PublicFeedback() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map')

  const handleAddFeedback = (type: 'add' | 'remove') => {
    setActiveTab('map')
    const fb: Feedback = {
      id: Date.now(), type,
      lng: 121.4737 + (Math.random() - 0.5) * 0.05, lat: 31.2304 + (Math.random() - 0.5) * 0.05,
      description: type === 'add' ? '建议增设垃圾桶' : '建议减少垃圾桶', status: '待审核', date: new Date().toLocaleDateString(),
    }
    setFeedbackList((prev) => [fb, ...prev])
    alert(type === 'add' ? '已添加增设建议！' : '已添加减少建议！')
  }

  return (
    <div>
      <div className="tabs">
        {([['map', '地图反馈'], ['list', '反馈记录']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id as 'map' | 'list')} className={`tab ${activeTab === id ? 'active' : ''}`}>{label}</button>
        ))}
      </div>

      {activeTab === 'map' && (
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <button className="btn btn-success" style={{ padding: 14, justifyContent: 'center' }} onClick={() => handleAddFeedback('add')}>➕ 点击添加增设建议</button>
              <button className="btn btn-danger" style={{ padding: 14, justifyContent: 'center' }} onClick={() => handleAddFeedback('remove')}>➖ 点击添加减少建议</button>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { if (confirm('确定清除所有反馈？')) setFeedbackList([]) }}>🗑️ 清除所有反馈点位</button>
            <div className="map-placeholder" style={{ height: 400, marginTop: 12 }}>
              <div><div className="icon">🗺️</div><div className="text">集成高德地图后将在此显示反馈点位</div></div>
            </div>
          </div>
          <div className="grid grid-2">
            <div className="stat-card" style={{ textAlign: 'center' }}><div className="stat-value">{feedbackList.filter((f) => f.type === 'add').length}</div><div className="stat-label">增设建议</div></div>
            <div className="stat-card" style={{ textAlign: 'center' }}><div className="stat-value" style={{ color: 'var(--crit)' }}>{feedbackList.filter((f) => f.type === 'remove').length}</div><div className="stat-label">减少建议</div></div>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="card">
          <div className="card-title">公众反馈记录</div>
          {feedbackList.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}><div className="text">暂无反馈记录</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {feedbackList.map((fb) => (
                <div key={fb.id} className="insight-card" style={{ background: 'var(--pale)', borderLeft: `3px solid ${fb.type === 'add' ? 'var(--good)' : 'var(--crit)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="card-title" style={{ marginBottom: 0 }}>{fb.type === 'add' ? '增设需求' : '减少建议'}</span>
                    <span className="stat-label">{fb.date}</span>
                  </div>
                  <div className="stat-label">坐标: {fb.lat.toFixed(4)}, {fb.lng.toFixed(4)}</div>
                  <div className="stat-label" style={{ marginTop: 2 }}>{fb.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
