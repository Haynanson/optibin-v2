import type { Client, Policy } from '../types'

export const POLICIES: Policy[] = [
  {
    id: 'P1',
    code: '沪绿容〔2023〕175号',
    name: '上海市道路、公共广场等废物箱配置导则（2023版）',
    date: '2023-07-01',
    status: '现行',
    region: '上海',
    relevance: 100,
    keyPoints: '主干道每80m一处 · 旅游景区每50m一处 · 分类标识强制规范',
  },
  {
    id: 'P2',
    code: '2025沪垃圾分类方案',
    name: '2025年上海市生活垃圾分类工作实施方案',
    date: '2025-01-01',
    status: '现行',
    region: '上海',
    relevance: 92,
    keyPoints: '要求提升废物箱精细化配置水平 · 分类实效全面提升',
  },
  {
    id: 'P3',
    code: '国家十五五规划',
    name: '国家"十五五"城市精细化管理与生态文明建设规划',
    date: '2026-01-01',
    status: '待施行',
    region: '全国',
    relevance: 88,
    keyPoints: '城市公共设施数字化管理 · 绿色低碳城市治理核心议题',
  },
  {
    id: 'P4',
    code: '一网统管扩容令',
    name: '上海"一网统管"环卫设施数字接入规范（征求意见稿）',
    date: '2025-06-01',
    status: '征求意见',
    region: '上海',
    relevance: 85,
    keyPoints: '废物箱GPS坐标强制申报 · 智慧清运数据接入平台',
  },
  {
    id: 'P5',
    code: '上海卓越城市行动',
    name: '上海建设卓越全球城市行动计划（2025-2035）',
    date: '2025-01-01',
    status: '现行',
    region: '上海',
    relevance: 72,
    keyPoints: '公共空间品质国际标准 · 城市精细化治理示范区建设',
  },
]

export const CLIENTS: Client[] = [
  {
    id: '1',
    name: '黄浦区绿化和市容管理局',
    type: 'government',
    tier: 'A',
    status: 'active',
    revenue: 28,
    stage: '执行中',
    contact: '王主任',
    date: '2026-03',
    tags: ['区级诊断', '导则修订'],
  },
  {
    id: '2',
    name: '浦东新区城市管理局',
    type: 'government',
    tier: 'A',
    status: 'negotiating',
    revenue: 25,
    stage: '方案沟通',
    contact: '张科长',
    date: '2026-04',
    tags: ['区级诊断'],
  },
  {
    id: '3',
    name: '上海恒隆广场（港汇）',
    type: 'commercial',
    tier: 'B',
    status: 'active',
    revenue: 7.5,
    stage: '执行中',
    contact: '运营总监',
    date: '2026-03',
    tags: ['商业体方案', 'B2B'],
  },
  {
    id: '4',
    name: '南京路步行街管理办公室',
    type: 'government',
    tier: 'B',
    status: 'complete',
    revenue: 6,
    stage: '已完结',
    contact: '办公室主任',
    date: '2026-03',
    tags: ['商业街区', '减桶方案'],
  },
  {
    id: '5',
    name: '上海野生动物园',
    type: 'scenic',
    tier: 'B',
    status: 'negotiating',
    revenue: 9,
    stage: '需求调研',
    contact: '园区总监',
    date: '2026-04',
    tags: ['景区专项', '动态调配'],
  },
]

export const MARKET_TREND = [
  { year: '2018', env: 1363, smart: 162 },
  { year: '2019', env: 1502, smart: 218 },
  { year: '2020', env: 1611, smart: 287 },
  { year: '2021', env: 1734, smart: 365 },
  { year: '2022', env: 1876, smart: 443 },
  { year: '2023', env: 2012, smart: 555 },
  { year: '2024', env: 2146, smart: 664 },
  { year: '2025E', env: 2315, smart: 800 },
]

export const SAT_TYPE_DEFAULT = [
  { name: '浦东绿地', v: 87.4 },
  { name: '浦西绿地', v: 80.2 },
  { name: '城市广场', v: 70.8 },
  { name: '商业中心', v: 69.1 },
  { name: '商业街区', v: 68.1 },
  { name: '街道空间', v: 66.7 },
  { name: '旅游景区', v: 63.7 },
  { name: '交通枢纽', v: 60.5 },
]

export const SAT_DIM_DEFAULT = [
  { name: '卫生状况', v: 78.9 },
  { name: '分类指引', v: 75.2 },
  { name: '设计协调', v: 75.2 },
  { name: '分布合理', v: 64.3 },
  { name: '数量充足', v: 60.2 },
]

export const OPINION_DEFAULT = [
  { name: '文明携带意愿', v: 91.8 },
  { name: '无监管自愿分类', v: 88.3 },
  { name: '认同污染源风险', v: 67.5 },
  { name: '减桶提升风貌', v: 55.8 },
  { name: '支持探索减桶', v: 55.3 },
]

export const PIE_DATA_DEFAULT = [
  { name: '积极对标国际', value: 26.5 },
  { name: '可逐步尝试', value: 28.8 },
  { name: '保持观察', value: 33.4 },
  { name: '不适合上海', value: 11.3 },
]
