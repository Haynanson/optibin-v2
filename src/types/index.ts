export interface Point {
  id: number
  name: string
  type: SpaceType
  lng: number
  lat: number
  originalLng: number
  originalLat: number
  usageMatch: number
  properties: Record<string, unknown>
}

export type SpaceType =
  | '商业街区'
  | '交通枢纽'
  | '城市广场'
  | '公共绿地'
  | '旅游景区'
  | '街道空间'
  | '商业中心'
  | '其他'

export const SPACE_TYPES: SpaceType[] = [
  '商业街区',
  '交通枢纽',
  '城市广场',
  '公共绿地',
  '旅游景区',
  '街道空间',
  '商业中心',
]

export interface SEIResult {
  pointId: number
  pointName: string
  sei: number
  overlapRatio: number
  nearestDistance: number
  usageMatch: number
  heatmapFit: number
  status: SEIStatus
  subScores: {
    overlapScore: number
    distanceScore: number
    usageScore: number
    heatmapScore: number
  }
}

export interface OptimizationResult {
  redundantPoints: {
    pointId: number
    pointName: string
    overlapRatio: number
    seiScore: number
    lng: number
    lat: number
  }[]
  blindSpots: {
    lng: number
    lat: number
    radius: number
  }[]
  beforeStats: {
    avgSEI: number
    totalPoints: number
    overlapRatio: number
  }
  afterStats: {
    avgSEI: number
    totalPoints: number
    overlapRatio: number
  }
  savedPointCount: number
  coverageChange: number
  suggestedAdditions: {
    lng: number
    lat: number
    reason: string
    expectedSei: number
  }[]
}

export type SEIStatus = 'good' | 'normal' | 'warning' | 'critical'

export interface SEIConfig {
  bufferRadius: number
  minSpacing: number
  serviceRadius: number
  usageMatchDefault: number
  heatmapFitDefault: number
  weights: {
    w1: number
    w2: number
    w3: number
    w4: number
  }
}

export const DEFAULT_SEI_CONFIG: SEIConfig = {
  bufferRadius: 50,
  minSpacing: 80,
  serviceRadius: 100,
  usageMatchDefault: 70,
  heatmapFitDefault: 70,
  weights: {
    w1: 0.3,
    w2: 0.25,
    w3: 0.25,
    w4: 0.2,
  },
}

export interface Project {
  id: string
  name: string
  region: string
  manager: string
  config: SEIConfig
  createdAt: string
}

export interface Client {
  id: string
  name: string
  type: 'government' | 'commercial' | 'scenic'
  tier: 'A' | 'B' | 'C'
  status: 'prospect' | 'active' | 'negotiating' | 'complete'
  revenue: number
  contact: string
  tags: string[]
  stage: string
  date: string
}

export interface Survey {
  id: number
  respondentType: string
  spaceType: string
  satisfaction: number
  dimCleanliness: number
  dimClassification: number
  dimDesign: number
  dimDistribution: number
  dimQuantity: number
  supportReduce: boolean
  willingCarry: boolean
  attitude: string
}

export interface Policy {
  id: string
  code: string
  name: string
  date: string
  status: string
  region: string
  relevance: number
  keyPoints: string
  sourceUrl?: string
}

export interface Feedback {
  id: number
  type: 'add' | 'remove'
  lng: number
  lat: number
  description: string
  status: string
  date: string
}

export interface FieldMapping {
  lng: number
  lat: number
  name: number
  type: number
  usage: number
}

export interface UploadResult {
  success: boolean
  data: Point[]
  errors: { row: number; error: string }[]
  totalLines: number
  validCount: number
  errorCount: number
  headers: string[]
}
