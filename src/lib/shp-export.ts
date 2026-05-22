import type { Point, SEIResult } from '../types'

export async function exportToSHP(
  points: Point[],
  seiResults: SEIResult[],
  filename: string = 'optibin-export'
): Promise<void> {
  const shpWrite = await import('shp-write')

  const features = points.map((p) => {
    const sei = seiResults.find((r) => r.pointId === p.id)
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [p.originalLng ?? p.lng, p.originalLat ?? p.lat],
      },
      properties: {
        name: p.name,
        type: p.type,
        usage_match: p.usageMatch,
        sei_score: sei?.sei ?? null,
        overlap_ratio: sei?.overlapRatio ?? null,
        nearest_dist: sei?.nearestDistance ?? null,
        status: sei?.status ?? null,
        ...p.properties,
      },
    }
  })

  const geojson = {
    type: 'FeatureCollection' as const,
    features,
  }

  shpWrite.download(geojson, filename)
}
