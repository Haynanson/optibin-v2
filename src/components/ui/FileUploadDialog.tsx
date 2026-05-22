import { useState, useMemo } from 'react'
import type { FieldMapping } from '../../types'

interface FileUploadDialogProps {
  headers: string[]
  previewData: string[][]
  onComplete: (mapping: FieldMapping) => void
  onCancel: () => void
}

const FIELD_DEFS: { key: keyof FieldMapping; label: string; required?: boolean; patterns: string[] }[] = [
  { key: 'lng', label: '经度', required: true, patterns: ['lng', 'lon', 'longitude', '经度', 'x'] },
  { key: 'lat', label: '纬度', required: true, patterns: ['lat', 'latitude', '纬度', 'y'] },
  { key: 'name', label: '名称', patterns: ['name', '名称', '点位'] },
  { key: 'type', label: '类型', patterns: ['type', '类型', '空间类型', 'category'] },
  { key: 'usage', label: '使用强度', patterns: ['usage', '使用', '强度', 'match', 'intensity'] },
]

function autoDetect(headers: string[]): FieldMapping {
  const lower = headers.map((h) => h.toLowerCase().trim())
  const r: FieldMapping = { lng: -1, lat: -1, name: -1, type: -1, usage: -1 }
  for (const def of FIELD_DEFS) {
    const idx = lower.findIndex((h) => def.patterns.some((p) => h.includes(p)))
    r[def.key] = idx
  }
  return r
}

export default function FileUploadDialog({ headers, previewData, onComplete, onCancel }: FileUploadDialogProps) {
  const initial = useMemo(() => autoDetect(headers), [headers])
  const [mapping, setMapping] = useState<FieldMapping>(initial)
  const isValid = mapping.lng >= 0 && mapping.lat >= 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div className="card" style={{ width: 840, maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="header-title">字段映射</div>
          <div className="header-subtitle">请确认文件列与系统字段的对应关系</div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {/* Mapping selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
            {FIELD_DEFS.map((def) => (
              <div key={def.key}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 5, fontWeight: 500 }}>
                  {def.label}{def.required && <span style={{ color: 'var(--crit)' }}> *</span>}
                </label>
                <select
                  value={mapping[def.key]}
                  onChange={(e) => setMapping((p) => ({ ...p, [def.key]: Number(e.target.value) }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, background: '#fff', color: mapping[def.key] >= 0 ? 'var(--text)' : 'var(--light)' }}
                >
                  <option value={-1}>-- 未选择 --</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h || `列 ${i + 1}`}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Preview table */}
          <div className="card-title" style={{ marginBottom: 8 }}>数据预览（前 {previewData.length} 行）</div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'auto', maxHeight: 220 }}>
            <table className="table" style={{ minWidth: 'max-content' }}>
              <thead>
                <tr>
                  {headers.map((h, i) => <th key={i} style={{ position: 'sticky', top: 0, background: 'var(--bg)', whiteSpace: 'nowrap' }}>{h || `列 ${i + 1}`}</th>)}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, ri) => (
                  <tr key={ri}>{headers.map((_, ci) => <td key={ci} style={{ whiteSpace: 'nowrap' }}>{row[ci] ?? ''}</td>)}</tr>
                ))}
                {previewData.length === 0 && <tr><td colSpan={headers.length} style={{ textAlign: 'center', padding: 20, color: 'var(--light)' }}>暂无数据</td></tr>}
              </tbody>
            </table>
          </div>

          {!isValid && <div style={{ fontSize: 11, color: 'var(--crit)', marginTop: 10 }}>请至少选择经度和纬度字段</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onCancel} className="btn btn-outline">取消</button>
          <button onClick={() => onComplete(mapping)} disabled={!isValid} className="btn btn-primary" style={{ opacity: isValid ? 1 : 0.5, cursor: isValid ? 'pointer' : 'not-allowed' }}>
            确认导入
          </button>
        </div>
      </div>
    </div>
  )
}
