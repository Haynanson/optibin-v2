import { useState } from 'react'
import { useStore, setState } from '../../lib/store'
import AMapWrapper from '../../components/map/AMapWrapper'
import type { MapMarker } from '../../components/map/AMapWrapper'
import type { SEIResult, OptimizationResult } from '../../types'
import { DEFAULT_SEI_CONFIG } from '../../types'
import { calculateBatchSEI, identifyRedundantPoints, simulateOptimization } from '../../lib/sei'
import { findBlindSpots, generateIdealPoints } from '../../lib/geo'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  good: { label: '优良', color: '#22C55E', bg: '#F0FDF4' },
  normal: { label: '正常', color: '#3B82F6', bg: '#EFF6FF' },
  warning: { label: '需关注', color: '#F97316', bg: '#FFF7ED' },
  critical: { label: '紧急', color: '#EF4444', bg: '#FEF2F2' },
}

function seiColor(sei: number): string {
  if (sei >= 70) return '#22C55E'
  if (sei >= 50) return '#EAB308'
  if (sei >= 35) return '#F97316'
  return '#EF4444'
}

export default function SpatialDiag() {
  const { pointsData, seiResults } = useStore()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedPoint, setSelectedPoint] = useState<SEIResult | null>(null)
  const [viewMode, setViewMode] = useState<'map' | 'table'>('map')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Cluster control
  const [gridSize, setGridSize] = useState(60)

  // Optimization state
  const [optimizing, setOptimizing] = useState(false)
  const [optProgress, setOptProgress] = useState(0)
  const [optResult, setOptResult] = useState<OptimizationResult | null>(null)
  const [showOptMap, setShowOptMap] = useState(false)

  // Layer visibility
  const [layerVisibility, setLayerVisibility] = useState({
    retained: true,
    redundant: true,
    blindSpots: true,
    ideal: true,
  })

  const toggleLayer = (key: keyof typeof layerVisibility) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const filteredResults = typeFilter === 'all'
    ? seiResults
    : seiResults.filter((r) => {
        const point = pointsData.find((p) => p.id === r.pointId)
        return point?.type === typeFilter
      })

  const types = [...new Set(pointsData.map((p) => p.type))]

  const runDiagnosis = async () => {
    if (pointsData.length === 0) return
    setRunning(true)
    setProgress(0)

    await new Promise((r) => requestAnimationFrame(r))

    const results = calculateBatchSEI(pointsData, DEFAULT_SEI_CONFIG, (p) => setProgress(p))
    setState({ seiResults: results })
    setRunning(false)
  }

  const runOptimization = async () => {
    if (seiResults.length === 0 || pointsData.length === 0) return
    setOptimizing(true)
    setOptProgress(0)

    await new Promise((r) => setTimeout(r, 50))
    setOptProgress(10)

    // 1. Identify redundant points
    const redundant = identifyRedundantPoints(seiResults, pointsData, 50)
    setOptProgress(30)
    await new Promise((r) => setTimeout(r, 10))

    // 2. Find blind spots
    const blindSpots = findBlindSpots(pointsData, null, DEFAULT_SEI_CONFIG.bufferRadius)
    setOptProgress(50)
    await new Promise((r) => setTimeout(r, 10))

    // 3. Generate ideal points for blind spots
    const ideal = generateIdealPoints(blindSpots, pointsData, DEFAULT_SEI_CONFIG.bufferRadius)
    setOptProgress(60)
    await new Promise((r) => setTimeout(r, 10))

    // 4. Simulate optimization
    const redundantIds = redundant.map((r) => r.pointId)
    const { optimizedResults } = simulateOptimization(pointsData, seiResults, DEFAULT_SEI_CONFIG, redundantIds)
    setOptProgress(90)
    await new Promise((r) => setTimeout(r, 10))

    // 5. Calculate stats
    const beforeAvg = seiResults.reduce((s, r) => s + r.sei, 0) / seiResults.length
    const afterAvg = optimizedResults.length > 0
      ? optimizedResults.reduce((s, r) => s + r.sei, 0) / optimizedResults.length
      : 0

    // Estimate SEI with ideal points added
    const withIdealAvg = ideal.length > 0
      ? (afterAvg * optimizedResults.length + ideal.reduce((s, ip) => s + ip.expectedSei, 0)) /
        (optimizedResults.length + ideal.length)
      : afterAvg

    const result: OptimizationResult = {
      redundantPoints: redundant,
      blindSpots,
      suggestedAdditions: ideal,
      beforeStats: {
        avgSEI: Math.round(beforeAvg * 100) / 100,
        totalPoints: pointsData.length,
        overlapRatio: seiResults[0]?.overlapRatio ?? 0,
      },
      afterStats: {
        avgSEI: Math.round(withIdealAvg * 100) / 100,
        totalPoints: optimizedResults.length + ideal.length,
        overlapRatio: optimizedResults[0]?.overlapRatio ?? 0,
      },
      savedPointCount: redundant.length,
      coverageChange: ideal.length,
    }

    setOptResult(result)
    setShowOptMap(true)
    setOptProgress(100)
    setOptimizing(false)
  }

  // Build markers for map
  const markers: MapMarker[] = (showOptMap && optResult
    ? filteredResults.filter((r) => !optResult.redundantPoints.find((rp) => rp.pointId === r.pointId))
    : filteredResults
  ).map((r) => {
    const point = pointsData.find((p) => p.id === r.pointId)
    return {
      lng: point?.lng ?? 0,
      lat: point?.lat ?? 0,
      name: r.pointName,
      sei: r.sei,
      color: seiColor(r.sei),
    }
  })

  const redundantMarkers = showOptMap && optResult
    ? optResult.redundantPoints.map((rp) => ({ lng: rp.lng, lat: rp.lat, name: rp.pointName }))
    : []

  const blindSpots = showOptMap && optResult ? optResult.blindSpots : []
  const idealPoints = showOptMap && optResult ? optResult.suggestedAdditions : []

  const layerButtons = [
    { key: 'retained' as const, label: '保留点位', color: '#4A6B5C', icon: '●' },
    { key: 'redundant' as const, label: '冗余点位', color: '#EF4444', icon: '✕' },
    { key: 'blindSpots' as const, label: '服务盲区', color: '#EF4444', icon: '○' },
    { key: 'ideal' as const, label: '建议新增', color: '#C4A882', icon: '★' },
  ]

  return (
    <div>
      {/* Top controls */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={runDiagnosis}
            disabled={running || pointsData.length === 0}
          >
            {running ? `⏳ 诊断中 ${progress}%` : '📊 运行SEI诊断'}
          </button>

          {seiResults.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={runOptimization}
              disabled={optimizing}
              style={{ background: '#7A9B8C' }}
            >
              {optimizing ? `⏳ 模拟中 ${optProgress}%` : '🎯 最优布点模拟'}
            </button>
          )}

          {/* Cluster granularity control */}
          {viewMode === 'map' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
              <span>聚集</span>
              <input
                type="range"
                min={30}
                max={200}
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                style={{ width: 80, accentColor: '#4A6B5C' }}
              />
              <span style={{ width: 24, textAlign: 'right' }}>{gridSize}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            <button
              className={`btn ${viewMode === 'map' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('map')}
            >
              🗺️ 地图
            </button>
            <button
              className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('table')}
            >
              📋 表格
            </button>
          </div>
        </div>

        {/* Type filter */}
        {seiResults.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              className={`btn ${typeFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTypeFilter('all')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              全部 ({seiResults.length})
            </button>
            {types.map((t) => {
              const count = seiResults.filter((r) => {
                const p = pointsData.find((pp) => pp.id === r.pointId)
                return p?.type === t
              }).length
              return (
                <button
                  key={t}
                  className={`btn ${typeFilter === t ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setTypeFilter(t)}
                  style={{ fontSize: 11, padding: '4px 10px' }}
                >
                  {t} ({count})
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Map with layer controls */}
      {viewMode === 'map' && (
        <div className="card" style={{ marginBottom: 14 }}>
          {/* Layer toggle bar */}
          {showOptMap && (
            <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', lineHeight: '28px' }}>图层:</span>
              {layerButtons.map((lb) => (
                <button
                  key={lb.key}
                  onClick={() => toggleLayer(lb.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 14, fontSize: 11, border: 'none',
                    cursor: 'pointer',
                    background: layerVisibility[lb.key] ? lb.color + '20' : '#f3f4f6',
                    color: layerVisibility[lb.key] ? lb.color : '#9ca3af',
                    fontWeight: layerVisibility[lb.key] ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{lb.icon}</span>
                  {lb.label}
                </button>
              ))}
            </div>
          )}
          <AMapWrapper
            height={500}
            markers={markers}
            blindSpots={blindSpots}
            redundantMarkers={redundantMarkers}
            idealPoints={idealPoints}
            gridSize={gridSize}
            layerVisibility={layerVisibility}
          />
        </div>
      )}

      {/* Table view */}
      {viewMode === 'table' && (
        <div className="card" style={{ marginBottom: 14, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>点位名称</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>类型</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>SEI得分</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>重叠率%</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>最近邻(m)</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>状态</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r) => {
                const point = pointsData.find((p) => p.id === r.pointId)
                const st = STATUS_MAP[r.status] || STATUS_MAP.normal
                return (
                  <tr
                    key={r.pointId}
                    onClick={() => setSelectedPoint(r)}
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      background: selectedPoint?.pointId === r.pointId ? 'var(--pale)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '8px 12px' }}>{r.pointName}</td>
                    <td style={{ padding: '8px 12px' }}>{point?.type || '其他'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        <div style={{ width: 60, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${r.sei}%`, height: '100%', background: seiColor(r.sei), borderRadius: 3 }} />
                        </div>
                        <span style={{ fontWeight: 600, color: seiColor(r.sei) }}>{r.sei.toFixed(1)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{r.overlapRatio.toFixed(1)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{r.nearestDistance.toFixed(1)}m</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, background: st.bg, color: st.color, fontWeight: 600 }}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Optimization results */}
      {optResult && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-title">🎯 优化模拟结果</div>

          {/* Stats comparison */}
          <div className="grid grid-4" style={{ marginBottom: 14 }}>
            <div className="insight-card" style={{ background: '#FEF2F2', borderLeft: '3px solid #EF4444' }}>
              <div className="value" style={{ color: '#EF4444' }}>{optResult.beforeStats.avgSEI}</div>
              <div className="label">优化前平均SEI</div>
              <div className="desc">{optResult.beforeStats.totalPoints}个点位</div>
            </div>
            <div className="insight-card" style={{ background: '#F0FDF4', borderLeft: '3px solid #22C55E' }}>
              <div className="value" style={{ color: '#22C55E' }}>{optResult.afterStats.avgSEI}</div>
              <div className="label">优化后平均SEI</div>
              <div className="desc">{optResult.afterStats.totalPoints}个点位（含建议新增）</div>
            </div>
            <div className="insight-card" style={{ background: '#FEF2F2', borderLeft: '3px solid #EF4444' }}>
              <div className="value" style={{ color: '#EF4444' }}>{optResult.savedPointCount}</div>
              <div className="label">建议撤除</div>
              <div className="desc">冗余布点</div>
            </div>
            <div className="insight-card" style={{ background: '#FFFBEB', borderLeft: '3px solid #C4A882' }}>
              <div className="value" style={{ color: '#C4A882' }}>{optResult.suggestedAdditions.length}</div>
              <div className="label">建议新增</div>
              <div className="desc">盲区补点</div>
            </div>
          </div>

          {/* Redundant points list */}
          {optResult.redundantPoints.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#EF4444' }}>
                ⚠️ 建议撤除的冗余点位（{optResult.redundantPoints.length}个）
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflow: 'auto' }}>
                {optResult.redundantPoints.map((rp) => (
                  <div key={rp.pointId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#FEF2F2', borderRadius: 6, fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{rp.pointName}</span>
                    <span style={{ color: '#666' }}>重叠率 {rp.overlapRatio.toFixed(1)}%</span>
                    <span style={{ color: '#666' }}>SEI {rp.seiScore.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ideal points list */}
          {optResult.suggestedAdditions.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#C4A882' }}>
                ★ 建议新增的点位（{optResult.suggestedAdditions.length}个）
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflow: 'auto' }}>
                {optResult.suggestedAdditions.map((ip, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#FFFBEB', borderRadius: 6, fontSize: 12 }}>
                    <span style={{ fontWeight: 600, color: '#C4A882' }}>★ 补点 {i + 1}</span>
                    <span style={{ color: '#666' }}>{ip.reason}</span>
                    <span style={{ color: '#666' }}>预期SEI {ip.expectedSei}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blind spots list */}
          {optResult.blindSpots.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#F97316' }}>
                📍 识别的服务盲区（{optResult.blindSpots.length}个）
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflow: 'auto' }}>
                {optResult.blindSpots.map((bs, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#FFF7ED', borderRadius: 6, fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>盲区 {i + 1}</span>
                    <span style={{ color: '#666' }}>经度 {bs.lng.toFixed(6)}</span>
                    <span style={{ color: '#666' }}>纬度 {bs.lat.toFixed(6)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected point detail */}
      {selectedPoint && (
        <div className="card">
          <div className="card-title">📋 点位详情 — {selectedPoint.pointName}</div>
          <div className="grid grid-4">
            <div className="insight-card" style={{ background: 'var(--pale)', borderLeft: `3px solid ${seiColor(selectedPoint.sei)}` }}>
              <div className="value" style={{ color: seiColor(selectedPoint.sei) }}>{selectedPoint.sei.toFixed(1)}</div>
              <div className="label">SEI得分</div>
            </div>
            <div className="insight-card" style={{ background: 'var(--pale)', borderLeft: '3px solid var(--primary)' }}>
              <div className="value">{selectedPoint.overlapRatio.toFixed(1)}%</div>
              <div className="label">缓冲区重叠率</div>
            </div>
            <div className="insight-card" style={{ background: 'var(--pale)', borderLeft: '3px solid var(--primary)' }}>
              <div className="value">{selectedPoint.nearestDistance.toFixed(1)}m</div>
              <div className="label">最近邻距离</div>
            </div>
            <div className="insight-card" style={{ background: 'var(--pale)', borderLeft: '3px solid var(--primary)' }}>
              <div className="value">{selectedPoint.usageMatch.toFixed(0)}</div>
              <div className="label">使用匹配度</div>
            </div>
          </div>

          <div style={{ marginTop: 12, padding: 12, background: 'var(--pale)', borderRadius: 8, fontSize: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>诊断结论</div>
            {selectedPoint.status === 'good' && <div style={{ color: '#22C55E' }}>该点位空间效率优良，服务覆盖合理。</div>}
            {selectedPoint.status === 'normal' && <div style={{ color: '#3B82F6' }}>该点位空间效率正常，可适当优化间距。</div>}
            {selectedPoint.status === 'warning' && <div style={{ color: '#F97316' }}>该点位需要关注，可能存在覆盖不足或过度重叠。</div>}
            {selectedPoint.status === 'critical' && <div style={{ color: '#EF4444' }}>该点位空间效率低下，建议重新选址或调整配置。</div>}
          </div>
        </div>
      )}
    </div>
  )
}
