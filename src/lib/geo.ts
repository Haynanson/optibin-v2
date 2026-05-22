import * as turf from '@turf/turf'
import type { Point } from '../types'

export function haversineDistance(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function distance(p1: Point, p2: Point): number {
  const lng1 = p1.originalLng ?? p1.lng
  const lat1 = p1.originalLat ?? p1.lat
  const lng2 = p2.originalLng ?? p2.lng
  const lat2 = p2.originalLat ?? p2.lat
  try {
    const pt1 = turf.point([lng1, lat1])
    const pt2 = turf.point([lng2, lat2])
    return turf.distance(pt1, pt2, { units: 'meters' })
  } catch {
    return haversineDistance(lng1, lat1, lng2, lat2)
  }
}

export function findNearestNeighbor(
  point: Point,
  allPoints: Point[]
): { nearest: Point | null; distance: number } {
  let minDist = Infinity
  let nearest: Point | null = null

  for (const p of allPoints) {
    if (p.id === point.id) continue
    const dist = distance(point, p)
    if (dist < minDist) {
      minDist = dist
      nearest = p
    }
  }

  return { nearest, distance: minDist }
}

export function calculateBufferOverlapRatio(points: Point[], bufferRadius: number): number {
  if (points.length < 2) return 0

  const totalIndividualArea = points.length * Math.PI * bufferRadius * bufferRadius

  const buffers: GeoJSON.Feature<GeoJSON.Polygon>[] = []
  for (const p of points) {
    const pt = turf.point([p.originalLng ?? p.lng, p.originalLat ?? p.lat])
    const buffered = turf.buffer(pt, bufferRadius, { units: 'meters' })
    if (buffered) {
      buffers.push(buffered as GeoJSON.Feature<GeoJSON.Polygon>)
    }
  }

  if (buffers.length === 0) return 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let merged: any = buffers[0]
  for (let i = 1; i < buffers.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fc = turf.featureCollection([merged, buffers[i]]) as any
    const result = turf.union(fc)
    if (result) {
      merged = result
    }
  }

  const unionArea = Math.abs(turf.area(merged))
  const overlapRatio = ((totalIndividualArea - unionArea) / totalIndividualArea) * 100
  return Math.min(100, Math.max(0, overlapRatio))
}

export function calculatePointOverlapRatio(
  point: Point,
  allPoints: Point[],
  radius: number = 50
): number {
  // Gaussian kernel weighted overlap: closer neighbors contribute more
  // This produces differentiated scores even when all points have similar neighbor counts
  let weightedSum = 0
  const sigma = radius / 3 // Gaussian sigma = radius/3

  for (const other of allPoints) {
    if (other.id === point.id) continue

    const dx = (point.lng - other.lng) * 111320 * Math.cos((point.lat * Math.PI) / 180)
    const dy = (point.lat - other.lat) * 110540
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < radius) {
      // Gaussian kernel: exp(-dist² / (2*sigma²))
      const weight = Math.exp(-(dist * dist) / (2 * sigma * sigma))
      weightedSum += weight
    }
  }

  // Normalize: 1 very close neighbor ≈ 40%, 2 close neighbors ≈ 70%, etc.
  return Math.min(100, weightedSum * 40)
}

export function calculateUnionBuffer(
  _points: Point[],
  _radius: number = 50
): any | null {
  // Simplified: return null since findBlindSpots now uses grid-based approach
  return null
}

export function findBlindSpots(
  points: Point[],
  _unionBuffer: any,
  radius: number = 50
): { lng: number; lat: number; radius: number }[] {
  if (points.length === 0) return []

  // Grid-based blind spot detection (no Turf.js needed)
  // Find bounding box of all points
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const p of points) {
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
  }

  // Convert radius (meters) to approximate degrees
  const radiusDeg = radius / 111320
  const step = radiusDeg * 2 // Coarse grid for performance
  const blindSpots: { lng: number; lat: number; radius: number }[] = []

  for (let lng = minLng - radiusDeg; lng <= maxLng + radiusDeg; lng += step) {
    for (let lat = minLat - radiusDeg; lat <= maxLat + radiusDeg; lat += step) {
      // Check if this grid point is far enough from ALL data points
      let covered = false
      for (const p of points) {
        const dx = (lng - p.lng) * 111320 * Math.cos((lat * Math.PI) / 180)
        const dy = (lat - p.lat) * 110540
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < radius) {
          covered = true
          break
        }
      }
      if (!covered) {
        blindSpots.push({ lng, lat, radius })
      }
    }
  }

  // Grid step is already 2× radius, so blind spots are well-separated
  // Just limit to top 10 by distance from center (most important ones)
  const centerLng = (minLng + maxLng) / 2
  const centerLat = (minLat + maxLat) / 2
  return blindSpots
    .sort((a, b) => {
      const da = Math.sqrt((a.lng - centerLng) ** 2 + (a.lat - centerLat) ** 2)
      const db = Math.sqrt((b.lng - centerLng) ** 2 + (b.lat - centerLat) ** 2)
      return da - db
    })
    .slice(0, 10)
}

export function calculateSpacingValidity(points: Point[], minSpacing: number): number {
  if (points.length === 0) return 0

  let validCount = 0
  for (const point of points) {
    const { distance: dist } = findNearestNeighbor(point, points)
    if (dist <= minSpacing) {
      validCount++
    }
  }

  return (validCount / points.length) * 100
}

export function identifyRedundantPoints(
  points: Point[],
  bufferRadius: number,
  threshold: number = 50
): number[] {
  if (points.length < 2) return []

  const buffers: { id: number; feature: GeoJSON.Feature<GeoJSON.Polygon> }[] = []
  for (const p of points) {
    const pt = turf.point([p.originalLng ?? p.lng, p.originalLat ?? p.lat])
    const buffered = turf.buffer(pt, bufferRadius, { units: 'meters' })
    if (buffered) {
      buffers.push({ id: p.id, feature: buffered as GeoJSON.Feature<GeoJSON.Polygon> })
    }
  }

  const redundantIds: number[] = []
  for (let i = 0; i < buffers.length; i++) {
    for (let j = i + 1; j < buffers.length; j++) {
      const intersection = turf.intersect(
        turf.featureCollection([buffers[i].feature, buffers[j].feature])
      )
      if (intersection) {
        const overlapArea = Math.abs(turf.area(intersection))
        const singleArea = Math.abs(turf.area(buffers[i].feature))
        const overlapPercent = (overlapArea / singleArea) * 100
        if (overlapPercent >= threshold) {
          if (!redundantIds.includes(buffers[i].id)) redundantIds.push(buffers[i].id)
          if (!redundantIds.includes(buffers[j].id)) redundantIds.push(buffers[j].id)
        }
      }
    }
  }

  return redundantIds
}

export interface IdealPoint {
  lng: number
  lat: number
  reason: string
  expectedSei: number
}

/**
 * Generate ideal waste bin locations to fill blind spots.
 * For each blind spot, place a new point at its center.
 */
export function generateIdealPoints(
  blindSpots: { lng: number; lat: number; radius: number }[],
  existingPoints: Point[],
  bufferRadius: number = 50
): IdealPoint[] {
  if (blindSpots.length === 0) return []

  const idealPoints: IdealPoint[] = []

  for (const spot of blindSpots) {
    // Check this location is far enough from existing points
    let tooClose = false
    for (const p of existingPoints) {
      const dx = (spot.lng - p.lng) * 111320 * Math.cos((spot.lat * Math.PI) / 180)
      const dy = (spot.lat - p.lat) * 110540
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < bufferRadius) {
        tooClose = true
        break
      }
    }

    if (!tooClose) {
      // Calculate how many neighbors this new point would have within radius
      let neighborCount = 0
      for (const p of existingPoints) {
        const dx = (spot.lng - p.lng) * 111320 * Math.cos((spot.lat * Math.PI) / 180)
        const dy = (spot.lat - p.lat) * 110540
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < bufferRadius * 2) neighborCount++
      }

      // Expected SEI: good spacing + no overlap = high score
      const expectedSei = Math.min(95, 70 + neighborCount * 3)

      idealPoints.push({
        lng: spot.lng,
        lat: spot.lat,
        reason: `服务盲区补点（${neighborCount}个邻居在2倍半径内）`,
        expectedSei,
      })
    }
  }

  return idealPoints
}
