import type { OptimizationResult, Point, SEIConfig, SEIResult, SEIStatus } from '../types'
import {
  calculatePointOverlapRatio,
  calculateSpacingValidity,
  findNearestNeighbor,
} from './geo'

function getStatus(sei: number): SEIStatus {
  if (sei >= 70) return 'good'
  if (sei >= 50) return 'normal'
  if (sei >= 35) return 'warning'
  return 'critical'
}

export function calculatePointSEI(
  point: Point,
  allPoints: Point[],
  config: SEIConfig,
  pointOverlapRatio: number,
  nearestDistance: number
): SEIResult {
  const { weights, usageMatchDefault, heatmapFitDefault } = config

  const overlapScore = 100 - pointOverlapRatio

  let distanceScore = 0
  if (nearestDistance <= config.minSpacing) {
    distanceScore = 100
  } else if (nearestDistance <= config.minSpacing * 1.5) {
    distanceScore = 100 - ((nearestDistance - config.minSpacing) / (config.minSpacing * 0.5)) * 50
  } else {
    distanceScore = Math.max(0, 50 - ((nearestDistance - config.minSpacing * 1.5) / config.minSpacing) * 50)
  }

  const usageScore = point.usageMatch ?? usageMatchDefault
  const heatmapScore = heatmapFitDefault

  const sei = Math.min(
    100,
    Math.max(
      0,
      weights.w1 * overlapScore +
        weights.w2 * distanceScore +
        weights.w3 * usageScore +
        weights.w4 * heatmapScore
    )
  )

  return {
    pointId: point.id,
    pointName: point.name,
    sei: Math.round(sei * 10) / 10,
    overlapRatio: Math.round(pointOverlapRatio * 10) / 10,
    nearestDistance: Math.round(nearestDistance * 10) / 10,
    usageMatch: usageScore,
    heatmapFit: heatmapScore,
    status: getStatus(sei),
    subScores: {
      overlapScore: Math.round(overlapScore * 10) / 10,
      distanceScore: Math.round(distanceScore * 10) / 10,
      usageScore,
      heatmapScore,
    },
  }
}

export function calculateBatchSEI(
  points: Point[],
  config: SEIConfig,
  onProgress?: (percent: number) => void
): SEIResult[] {
  if (!points || points.length === 0) return []

  const results: SEIResult[] = []

  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    const { distance: nearestDist } = findNearestNeighbor(point, points)
    const pointOverlapRatio = calculatePointOverlapRatio(point, points, config.bufferRadius)

    const result = calculatePointSEI(point, points, config, pointOverlapRatio, nearestDist)
    results.push(result)

    if (onProgress && (i % Math.max(1, Math.floor(points.length / 10)) === 0 || i === points.length - 1)) {
      onProgress(Math.round(((i + 1) / points.length) * 100))
    }
  }

  return results
}

export interface RedundantPoint {
  pointId: number
  pointName: string
  overlapRatio: number
  seiScore: number
  lng: number
  lat: number
}

export function identifyRedundantPoints(
  results: SEIResult[],
  points: Point[],
  threshold: number = 50
): RedundantPoint[] {
  const redundant: RedundantPoint[] = []
  const processed = new Set<number>()

  // For each point with high overlap, find its actual nearest high-overlap neighbor
  // and mark the lower-SEI one as redundant
  const highOverlap = results
    .filter((r) => r.overlapRatio >= threshold)
    .sort((a, b) => b.overlapRatio - a.overlapRatio)

  for (const result of highOverlap) {
    if (processed.has(result.pointId)) continue

    const point = points.find((p) => p.id === result.pointId)
    if (!point) continue

    // Find the actual nearest neighbor that causes the overlap
    let bestNeighbor: SEIResult | null = null
    let bestDist = Infinity

    for (const other of results) {
      if (other.pointId === result.pointId) continue
      if (processed.has(other.pointId)) continue

      const otherPoint = points.find((p) => p.id === other.pointId)
      if (!otherPoint) continue

      // Check if they are actually close (within 2x radius)
      const dx = (point.lng - otherPoint.lng) * 111320 * Math.cos((point.lat * Math.PI) / 180)
      const dy = (point.lat - otherPoint.lat) * 110540
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 100 && dist < bestDist) { // Within 100m = likely overlapping
        bestDist = dist
        bestNeighbor = other
      }
    }

    if (bestNeighbor) {
      // Mark the lower-SEI one as redundant
      const redundantResult = result.sei <= bestNeighbor.sei ? result : bestNeighbor
      const redundantPoint = points.find((p) => p.id === redundantResult.pointId)

      if (redundantPoint && !processed.has(redundantResult.pointId)) {
        redundant.push({
          pointId: redundantResult.pointId,
          pointName: redundantResult.pointName,
          overlapRatio: redundantResult.overlapRatio,
          seiScore: redundantResult.sei,
          lng: redundantPoint.lng,
          lat: redundantPoint.lat,
        })
        processed.add(redundantResult.pointId)
        // Also mark the neighbor as processed so it's not double-counted
        const keepId = result.sei <= bestNeighbor.sei ? bestNeighbor.pointId : result.pointId
        processed.add(keepId)
      }
    }
  }

  return redundant
}

export function simulateOptimization(
  points: Point[],
  results: SEIResult[],
  config: SEIConfig,
  redundantIds: number[]
): { optimizedPoints: Point[]; optimizedResults: SEIResult[] } {
  const optimizedPoints = points.filter((p) => !redundantIds.includes(p.id))
  const optimizedResults = calculateBatchSEI(optimizedPoints, config)
  return { optimizedPoints, optimizedResults }
}

export interface SEIStatistics {
  count: number
  avgSEI: number
  minSEI: number
  maxSEI: number
  distribution: {
    good: number
    normal: number
    warning: number
    critical: number
  }
  overallOverlapRatio: number
  spacingEfficiency: number
  avgNearestDistance: number
}

export function calculateStatistics(results: SEIResult[], minSpacing?: number): SEIStatistics {
  if (results.length === 0) {
    return {
      count: 0,
      avgSEI: 0,
      minSEI: 0,
      maxSEI: 0,
      distribution: { good: 0, normal: 0, warning: 0, critical: 0 },
      overallOverlapRatio: 0,
      spacingEfficiency: 0,
      avgNearestDistance: 0,
    }
  }

  const seis = results.map((r) => r.sei)
  const avgSEI = seis.reduce((a, b) => a + b, 0) / seis.length

  return {
    count: results.length,
    avgSEI: Math.round(avgSEI * 100) / 100,
    minSEI: Math.round(Math.min(...seis) * 100) / 100,
    maxSEI: Math.round(Math.max(...seis) * 100) / 100,
    distribution: {
      good: results.filter((r) => r.status === 'good').length,
      normal: results.filter((r) => r.status === 'normal').length,
      warning: results.filter((r) => r.status === 'warning').length,
      critical: results.filter((r) => r.status === 'critical').length,
    },
    overallOverlapRatio: results[0]?.overlapRatio ?? 0,
    spacingEfficiency:
      (results.filter((r) => r.nearestDistance <= (minSpacing ?? 80)).length / results.length) * 100,
    avgNearestDistance:
      results.reduce((s, r) => s + r.nearestDistance, 0) / results.length,
  }
}

export interface OptimizationSuggestion {
  type: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  title: string
  description: string
  estimatedImpact: string
}

export function generateOptimizationSuggestions(
  results: SEIResult[],
  points: Point[]
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []
  const stats = calculateStatistics(results)

  if (stats.overallOverlapRatio > 40) {
    suggestions.push({
      type: 'redundancy',
      priority: 'high',
      title: '减少冗余布点',
      description: `当前缓冲重叠率为${stats.overallOverlapRatio.toFixed(1)}%，建议撤除重叠区域的冗余点位。`,
      estimatedImpact: '预计可减少15-25%的点位数量',
    })
  }

  if (stats.spacingEfficiency < 60) {
    suggestions.push({
      type: 'spacing',
      priority: 'medium',
      title: '优化点位间距',
      description: `当前间距有效率为${stats.spacingEfficiency.toFixed(1)}%，部分点位间距过大导致服务盲区。`,
      estimatedImpact: `需补充${Math.ceil(stats.count * 0.1)}-${Math.ceil(stats.count * 0.2)}个点位`,
    })
  }

  if (stats.distribution.critical > 0) {
    suggestions.push({
      type: 'critical',
      priority: 'urgent',
      title: '紧急优化问题点位',
      description: `有${stats.distribution.critical}个点位SEI得分低于35，需要立即处理。`,
      estimatedImpact: '影响整体配置合理性',
    })
  }

  const typeGroups: Record<string, { count: number; totalSei: number }> = {}
  for (const p of points) {
    const type = p.type || '其他'
    if (!typeGroups[type]) typeGroups[type] = { count: 0, totalSei: 0 }
    typeGroups[type].count++
    const seiResult = results.find((r) => r.pointId === p.id)
    if (seiResult) typeGroups[type].totalSei += seiResult.sei
  }

  for (const [type, group] of Object.entries(typeGroups)) {
    const typeAvg = group.totalSei / group.count
    if (typeAvg < 50) {
      suggestions.push({
        type: 'type_specific',
        priority: 'medium',
        title: `${type}区域需要重点关注`,
        description: `${type}类型的点位平均SEI仅为${typeAvg.toFixed(1)}，低于正常水平。`,
        estimatedImpact: '需针对性优化',
      })
    }
  }

  return suggestions
}
