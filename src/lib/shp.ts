import type { Point } from '../types'
import { DEFAULT_SEI_CONFIG } from '../types'
import { transformWGS84ToGCJ02 } from './coordinate'

export interface ShpParseResult {
  success: boolean
  features: Record<string, unknown>[]
  headers: string[]
  error?: string
}

function extractResult(geojson: any): ShpParseResult {
  const fc = Array.isArray(geojson) ? geojson[0] : geojson
  const features: Record<string, unknown>[] = fc.features || []
  if (features.length === 0) return { success: false, features: [], headers: [], error: '没有找到要素' }
  const headers = features[0].properties ? Object.keys(features[0].properties as Record<string, unknown>) : []
  return { success: true, features, headers }
}

export async function parseSHPFiles(files: FileList | File[]): Promise<ShpParseResult> {
  const shpjs = await import('shpjs')
  const fileArray = Array.from(files)
  const shpFile = fileArray.find((f) => f.name.toLowerCase().endsWith('.shp'))
  const dbfFile = fileArray.find((f) => f.name.toLowerCase().endsWith('.dbf'))
  const prjFile = fileArray.find((f) => f.name.toLowerCase().endsWith('.prj'))

  if (!shpFile) return { success: false, features: [], headers: [], error: '未找到.shp文件' }

  try {
    const shpBuffer = await shpFile.arrayBuffer()
    const shpObj: any = { shp: shpBuffer }
    if (dbfFile) shpObj.dbf = await dbfFile.arrayBuffer()
    if (prjFile) {
      try { shpObj.prj = await prjFile.text() } catch {}
    }

    // Use default export (getShapefile) which accepts {shp, dbf, prj} objects
    const fn = shpjs.default || shpjs.parseZip
    if (!fn) return { success: false, features: [], headers: [], error: 'shpjs不可用' }

    const result = await (fn as any)(shpObj)
    return extractResult(result)
  } catch (err) {
    return { success: false, features: [], headers: [], error: `SHP解析失败: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function parseSHPZip(buffer: ArrayBuffer): Promise<ShpParseResult> {
  const shpjs = await import('shpjs')
  try {
    const fn = shpjs.default || shpjs.parseZip
    if (!fn) return { success: false, features: [], headers: [], error: 'shpjs不可用' }
    const result = await (fn as any)(buffer)
    return extractResult(result)
  } catch (err) {
    return { success: false, features: [], headers: [], error: `ZIP解析失败: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export function convertSHPToPoints(features: Record<string, unknown>[]): Point[] {
  const points: Point[] = []
  for (let i = 0; i < features.length; i++) {
    const feat = features[i]
    const geom = feat.geometry as { type: string; coordinates: number[] | number[][] } | undefined
    if (!geom) continue
    let lng: number, lat: number
    if (geom.type === 'Point') { const c = geom.coordinates as number[]; lng = c[0]; lat = c[1] }
    else if (geom.type === 'MultiPoint') { const c = geom.coordinates as number[][]; lng = c[0][0]; lat = c[0][1] }
    else continue
    if (isNaN(lng) || isNaN(lat)) continue
    const props = (feat.properties || {}) as Record<string, unknown>
    const [gcLng, gcLat] = transformWGS84ToGCJ02(lng, lat)
    points.push({ id: i + 1, name: `点位${i + 1}`, type: '其他', lng: gcLng, lat: gcLat, originalLng: lng, originalLat: lat, usageMatch: DEFAULT_SEI_CONFIG.usageMatchDefault, properties: props })
  }
  return points
}
