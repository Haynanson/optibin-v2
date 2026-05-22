import { useState, useRef } from 'react'
import { useStore, setState } from '../../lib/store'
import { SAT_TYPE_DEFAULT, SAT_DIM_DEFAULT } from '../../data/constants'
import AMapWrapper from '../../components/map/AMapWrapper'
import FileUploadDialog from '../../components/ui/FileUploadDialog'
import type { FieldMapping } from '../../types'
import { transformWGS84ToGCJ02 } from '../../lib/coordinate'
import { SPACE_TYPES, DEFAULT_SEI_CONFIG } from '../../types'
import type { Point, SpaceType } from '../../types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell,
} from 'recharts'

function matchSpaceType(raw: string): SpaceType {
  const t = raw.trim()
  for (const s of SPACE_TYPES) { if (t.includes(s) || s.includes(t)) return s }
  return '其他'
}
function parseCSVLine(line: string): string[] {
  const r: string[] = []; let c = ''; let q = false
  for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"') q = !q; else if (ch === ',' && !q) { r.push(c.trim()); c = '' } else c += ch }
  r.push(c.trim()); return r
}

export default function Dashboard() {
  const { pointsData, seiResults, projectInfo } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [dialogHeaders, setDialogHeaders] = useState<string[]>([])
  const [dialogPreview, setDialogPreview] = useState<string[][]>([])
  const [pendingCSVText, setPendingCSVText] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')

  const avgSEI = seiResults.length > 0 ? Math.round(seiResults.reduce((s, r) => s + r.sei, 0) / seiResults.length) : null
  const worstOverlap = seiResults.length > 0 ? [...seiResults].sort((a, b) => b.overlapRatio - a.overlapRatio)[0] : null
  const avgUsage = seiResults.length > 0 ? (seiResults.reduce((s, r) => s + r.usageMatch, 0) / seiResults.length).toFixed(1) : '-'
  const goodRate = seiResults.length > 0 ? ((seiResults.filter((r) => r.status === 'good').length / seiResults.length) * 100).toFixed(1) : '-'

  const doParse = async (fileArray: File[]) => {
    if (!fileArray || fileArray.length === 0) throw new Error('未选择文件')
    const isSHP = fileArray.some((f) => f.name.toLowerCase().endsWith('.shp'))
    const isZIP = fileArray.length === 1 && fileArray[0].name.toLowerCase().endsWith('.zip')

    if (isZIP) {
      setUploadStatus('正在解析ZIP...')
      const { parseSHPZip } = await import('../../lib/shp')
      const buf = await fileArray[0].arrayBuffer()
      const r = await parseSHPZip(buf)
      if (!r.success) throw new Error(r.error)
      if (r.features.length === 0) throw new Error('ZIP中没有SHP数据')
      return { features: r.features, headers: r.headers, mode: 'shp' as const }
    }

    if (isSHP) {
      setUploadStatus(`正在解析 ${fileArray.map(f => f.name).join(', ')}...`)
      const { parseSHPFiles } = await import('../../lib/shp')
      const r = await parseSHPFiles(fileArray)
      if (!r.success) throw new Error(r.error)
      if (r.features.length === 0) throw new Error('SHP文件中没有要素')
      return { features: r.features, headers: r.headers, mode: 'shp' as const }
    }

    // CSV
    setUploadStatus('正在解析CSV...')
    const file = fileArray[0]
    if (!file) throw new Error('未选择文件')
    const text = await file.text()
    const lines = text.split('\n').filter((l) => l.trim())
    if (lines.length < 2) throw new Error('文件内容为空')
    return { headers: parseCSVLine(lines[0]), csvText: text, mode: 'csv' as const }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target
    const files = inputEl.files
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)
    console.log('Selected files:', fileArray.map(f => f.name))
    inputEl.value = ''
    setUploading(true)
    setUploadStatus('正在解析文件...')

    try {
      const result = await doParse(fileArray)
      setUploadStatus('解析成功！')
      setDialogHeaders(result.headers)
      if (result.mode === 'shp') {
        setDialogPreview(result.features.slice(0, 5).map((f: any) => result.headers.map((h: string) => String(f.properties?.[h] ?? ''))))
        ;(window as any).__shpFeatures = result.features
        setPendingCSVText(null)
      } else {
        const lines = result.csvText.split('\n').filter((l) => l.trim())
        setDialogPreview(lines.slice(1, 6).map((l) => parseCSVLine(l)))
        setPendingCSVText(result.csvText)
        ;(window as any).__shpFeatures = null
      }
      setShowDialog(true)
    } catch (err) {
      alert('解析失败: ' + (err instanceof Error ? err.message : String(err)))
    }
    setUploading(false)
    setUploadStatus('')
  }

  const handleMappingComplete = (mapping: FieldMapping) => {
    setShowDialog(false)
    const features = (window as any).__shpFeatures as any[] | null
    const points: Point[] = []

    if (features) {
      for (let i = 0; i < features.length; i++) {
        const feat = features[i]
        const geom = feat.geometry
        if (!geom || geom.type !== 'Point') continue
        const coords = geom.coordinates as number[]
        const lng = coords[0], lat = coords[1]
        if (isNaN(lng) || isNaN(lat)) continue
        const props = feat.properties || {}
        const [gcLng, gcLat] = transformWGS84ToGCJ02(lng, lat)
        points.push({
          id: i + 1,
          name: mapping.name >= 0 ? String(props[dialogHeaders[mapping.name]] ?? '') || `点位${i + 1}` : `点位${i + 1}`,
          type: mapping.type >= 0 ? matchSpaceType(String(props[dialogHeaders[mapping.type]] ?? '')) : '其他',
          lng: gcLng, lat: gcLat, originalLng: lng, originalLat: lat,
          usageMatch: mapping.usage >= 0 ? parseFloat(String(props[dialogHeaders[mapping.usage]])) || DEFAULT_SEI_CONFIG.usageMatchDefault : DEFAULT_SEI_CONFIG.usageMatchDefault,
          properties: props,
        })
      }
      ;(window as any).__shpFeatures = null
    } else if (pendingCSVText) {
      const lines = pendingCSVText.split('\n').filter((l) => l.trim())
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        if (values.length < 2) continue
        const lngVal = parseFloat(values[mapping.lng]), latVal = parseFloat(values[mapping.lat])
        if (isNaN(lngVal) || isNaN(latVal) || latVal < -90 || latVal > 90 || lngVal < -180 || lngVal > 180) continue
        const [gcLng, gcLat] = transformWGS84ToGCJ02(lngVal, latVal)
        points.push({
          id: i, name: mapping.name >= 0 ? values[mapping.name] || `点位${i}` : `点位${i}`,
          type: mapping.type >= 0 ? matchSpaceType(values[mapping.type]) : '其他',
          lng: gcLng, lat: gcLat, originalLng: lngVal, originalLat: latVal,
          usageMatch: mapping.usage >= 0 ? parseFloat(values[mapping.usage]) || DEFAULT_SEI_CONFIG.usageMatchDefault : DEFAULT_SEI_CONFIG.usageMatchDefault,
          properties: {},
        })
      }
    }

    if (points.length > 0) {
      setState({ pointsData: points, seiResults: [], projectInfo: { name: projectInfo.name || '导入数据', region: '未指定', manager: '', initialized: true } })
    }
    setPendingCSVText(null)
  }

  return (
    <div>
      {showDialog && <FileUploadDialog headers={dialogHeaders} previewData={dialogPreview} onComplete={handleMappingComplete} onCancel={() => { setShowDialog(false); setPendingCSVText(null); (window as any).__shpFeatures = null }} />}

      {/* Map - always visible */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {pointsData.length > 0 ? `已加载 ${pointsData.length} 个点位` : '请上传CSV或SHP文件开始分析'}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {uploadStatus && <span style={{ fontSize: 11, color: uploading ? 'var(--warn)' : 'var(--good)' }}>{uploadStatus}</span>}
            <label className="btn btn-primary" style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
              {uploading ? '⏳ 解析中...' : '📤 上传数据'}
              <input ref={fileInputRef} type="file" accept=".csv,.txt,.shp,.shx,.dbf,.prj,.zip" multiple style={{ display: 'none' }} onChange={handleFileSelect} disabled={uploading} />
            </label>
            {pointsData.length > 0 && (
              <button className="btn btn-outline" onClick={() => { if (confirm('确定清除所有数据？')) setState({ pointsData: [], seiResults: [], projectInfo: { name: '', region: '', manager: '', initialized: false } }) }}>
                🗑️ 重置
              </button>
            )}
          </div>
        </div>
        <AMapWrapper
          height={420}
          markers={pointsData.map((p) => {
            const sei = seiResults.find((r) => r.pointId === p.id)
            return { lng: p.lng, lat: p.lat, name: p.name, sei: sei?.sei }
          })}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: 14 }}>
        <div className="stat-card">
          <div className="stat-label">点位总数</div>
          <div className="stat-value">{pointsData.length}<span className="stat-unit">个</span></div>
          <div className="stat-sub">{projectInfo.region || '待上传'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">有效点位</div>
          <div className="stat-value">{pointsData.filter((p) => p.originalLng).length}<span className="stat-unit">个</span></div>
          <div className="stat-sub">已验证坐标</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">SEI均值</div>
          <div className="stat-value" style={{ color: avgSEI && avgSEI >= 60 ? 'var(--good)' : avgSEI ? 'var(--warn)' : 'var(--muted)' }}>{avgSEI ?? '-'}</div>
          <div className="stat-sub">{avgSEI ? '已计算' : '待诊断'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">项目状态</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--primary)' }}>{projectInfo.initialized ? '运行中' : '未初始化'}</div>
          <div className="stat-sub">{projectInfo.name || '等待配置'}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-53" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-title">各类公共空间综合满意度（%）</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={SAT_TYPE_DEFAULT} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" domain={[50, 95]} tick={{ fontSize: 10, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted)' }} tickLine={false} axisLine={false} width={70} />
              <Tooltip />
              <Bar dataKey="v" radius={[0, 4, 4, 0]} barSize={16}>
                {SAT_TYPE_DEFAULT.map((e, i) => <Cell key={i} fill={e.v >= 75 ? 'var(--good)' : e.v >= 65 ? 'var(--primary)' : 'var(--warn)'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-title">满意度五维度雷达</div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={SAT_DIM_DEFAULT} margin={{ top: 10, bottom: 10 }}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--light)' }} />
              <Radar dataKey="v" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Research findings */}
      <div className="card">
        <div className="card-title">核心研究发现 · 感知-实态悖论</div>
        <div className="grid grid-4">
          {[
            { v: worstOverlap ? worstOverlap.overlapRatio.toFixed(1) + '%' : '-', l: '最高重叠率', s: worstOverlap ? worstOverlap.pointName : '暂无数据', warn: true },
            { v: avgUsage, l: '平均使用匹配度', s: seiResults.length + '个点位', warn: false },
            { v: goodRate !== '-' ? goodRate + '%' : '-', l: '优良率', s: 'SEI≥70的点位占比', warn: false },
            { v: avgSEI ? String(avgSEI) : '-', l: '综合SEI得分', s: '空间效率指数', warn: avgSEI !== null && avgSEI < 50 },
          ].map((item) => (
            <div key={item.l} className="insight-card" style={{ background: item.warn ? '#FBEAE6' : 'var(--pale)', borderLeft: `3px solid ${item.warn ? 'var(--crit)' : 'var(--primary)'}` }}>
              <div className="value" style={{ color: item.warn ? 'var(--crit)' : 'var(--primary)' }}>{item.v}</div>
              <div className="label">{item.l}</div>
              <div className="desc">{item.s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
