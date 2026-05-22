import type { Point, UploadResult, FieldMapping, SpaceType } from '../types'
import { SPACE_TYPES, DEFAULT_SEI_CONFIG } from '../types'
import { transformWGS84ToGCJ02 } from './coordinate'

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function detectHeaders(headers: string[]): FieldMapping {
  const lower = headers.map((h) => h.toLowerCase())
  return {
    lng: lower.findIndex(
      (h) => h.includes('lng') || h.includes('lon') || h.includes('经度') || h === 'x'
    ),
    lat: lower.findIndex(
      (h) => h.includes('lat') || h.includes('纬度') || h === 'y'
    ),
    name: lower.findIndex(
      (h) => h.includes('name') || h.includes('名称') || h.includes('点位')
    ),
    type: lower.findIndex(
      (h) => h.includes('type') || h.includes('类型') || h.includes('空间类型')
    ),
    usage: lower.findIndex(
      (h) =>
        h.includes('usage') || h.includes('使用') || h.includes('强度') || h.includes('match')
    ),
  }
}

function matchSpaceType(raw: string): SpaceType {
  const trimmed = raw.trim()
  for (const t of SPACE_TYPES) {
    if (trimmed.includes(t) || t.includes(trimmed)) return t
  }
  return '其他'
}

export function parsePointsCSV(
  csvText: string,
  headerMapping?: FieldMapping
): UploadResult {
  const lines = csvText.split('\n').filter((l) => l.trim())
  if (lines.length < 2) {
    return { success: false, data: [], errors: [], totalLines: 0, validCount: 0, errorCount: 0, headers: [] }
  }

  const headers = parseCSVLine(lines[0])
  const mapping = headerMapping ?? detectHeaders(headers)

  if (mapping.lng === -1 || mapping.lat === -1) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, error: '未找到经纬度列（需要包含lng/lat/经度/纬度等关键词）' }],
      totalLines: lines.length - 1,
      validCount: 0,
      errorCount: lines.length - 1,
      headers,
    }
  }

  const points: Point[] = []
  const errors: { row: number; error: string }[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length < 2) continue

    const lngVal = parseFloat(values[mapping.lng])
    const latVal = parseFloat(values[mapping.lat])

    if (isNaN(lngVal) || isNaN(latVal)) {
      errors.push({ row: i + 1, error: '坐标格式错误' })
      continue
    }
    if (latVal < -90 || latVal > 90) {
      errors.push({ row: i + 1, error: '纬度超出范围(-90~90)' })
      continue
    }
    if (lngVal < -180 || lngVal > 180) {
      errors.push({ row: i + 1, error: '经度超出范围(-180~180)' })
      continue
    }

    const [gcLng, gcLat] = transformWGS84ToGCJ02(lngVal, latVal)
    const rawType = mapping.type >= 0 ? values[mapping.type] : '其他'

    points.push({
      id: i,
      name: mapping.name >= 0 ? values[mapping.name] : `点位${i}`,
      type: matchSpaceType(rawType),
      lng: gcLng,
      lat: gcLat,
      originalLng: lngVal,
      originalLat: latVal,
      usageMatch:
        mapping.usage >= 0
          ? parseFloat(values[mapping.usage]) || DEFAULT_SEI_CONFIG.usageMatchDefault
          : DEFAULT_SEI_CONFIG.usageMatchDefault,
      properties: {},
    })
  }

  return {
    success: true,
    data: points,
    errors,
    totalLines: lines.length - 1,
    validCount: points.length,
    errorCount: errors.length,
    headers,
  }
}

export function parseSurveyCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const surveys: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const survey: Record<string, string> = { id: String(i) }
    headers.forEach((h, idx) => {
      survey[h.toLowerCase()] = values[idx] || ''
    })
    surveys.push(survey)
  }

  return surveys
}
