import { useEffect, useRef, useState } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'

export interface MapMarker {
  lng: number
  lat: number
  name: string
  color?: string
  sei?: number
}

export interface AMapWrapperProps {
  center?: [number, number]
  zoom?: number
  markers?: MapMarker[]
  height?: number | string
  onMapClick?: (lng: number, lat: number) => void
  blindSpots?: { lng: number; lat: number; radius: number }[]
  redundantMarkers?: { lng: number; lat: number; name: string }[]
  idealPoints?: { lng: number; lat: number; reason: string; expectedSei: number }[]
  gridSize?: number
  layerVisibility?: {
    retained: boolean
    redundant: boolean
    blindSpots: boolean
    ideal: boolean
  }
}

function seiColor(sei?: number): string {
  if (sei == null) return '#4A6B5C'
  if (sei >= 70) return '#22C55E'
  if (sei >= 50) return '#EAB308'
  if (sei >= 35) return '#F97316'
  return '#EF4444'
}

const ICON_URL = 'https://s41.ax1x.com/2026/04/24/peW6GTA.png'
const FALLBACK_URL = 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png'

function markerHTML(name: string, sei: number | undefined): string {
  const seiLabel = sei != null ? `<span style="position:absolute;top:-8px;right:-8px;width:18px;height:18px;border-radius:50%;background:${seiColor(sei)};font-size:9px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3);">${Math.round(sei)}</span>` : ''
  return `<div style="position:relative;width:32px;height:32px;cursor:pointer;"><img src="${ICON_URL}" width="32" height="32" onerror="this.onerror=null;this.src='${FALLBACK_URL}'" />${seiLabel}<span style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:10px;color:#333;background:rgba(255,255,255,.85);padding:1px 4px;border-radius:3px;pointer-events:none;">${name}</span></div>`
}

function idealPointHTML(_reason: string, expectedSei: number): string {
  return `<div style="position:relative;width:28px;height:28px;cursor:pointer;"><div style="width:28px;height:28px;border-radius:50%;background:#C4A882;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,.3);">★</div><span style="position:absolute;top:-8px;right:-8px;width:18px;height:18px;border-radius:50%;background:#C4A882;font-size:9px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;border:1.5px solid #fff;">${expectedSei}</span><span style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:10px;color:#333;background:rgba(255,255,255,.85);padding:1px 4px;border-radius:3px;pointer-events:none;">建议补点</span></div>`
}

export default function AMapWrapper({
  center = [121.4737, 31.2304],
  zoom = 11,
  markers = [],
  height = 400,
  onMapClick,
  blindSpots,
  redundantMarkers,
  idealPoints,
  gridSize = 60,
  layerVisibility = { retained: true, redundant: true, blindSpots: true, ideal: true },
}: AMapWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const clusterRef = useRef<any>(null)
  const retainedRef = useRef<any[]>([])
  const redundantRef = useRef<any[]>([])
  const blindSpotsRef = useRef<any[]>([])
  const idealRef = useRef<any[]>([])
  const clickRef = useRef(onMapClick)
  const [mapReady, setMapReady] = useState(false)
  const currentZoomRef = useRef(zoom)
  clickRef.current = onMapClick

  // Init map
  useEffect(() => {
    const key = import.meta.env.VITE_AMAP_KEY as string | undefined
    const code = import.meta.env.VITE_AMAP_SECURITY_CODE as string | undefined
    if (!key || !containerRef.current) return

    ;(window as any)._AMapSecurityConfig = { securityJsCode: code ?? '' }

    let destroyed = false

    AMapLoader.load({ key, version: '2.0', plugins: ['AMap.MarkerCluster'] })
      .then((AMap: any) => {
        if (destroyed || !containerRef.current) return
        const map = new AMap.Map(containerRef.current, {
          zoom,
          center: new AMap.LngLat(center[0], center[1]),
          viewMode: '2D',
          resizeEnable: true,
        })
        map.on('click', (e: any) => {
          if (e.lnglat && clickRef.current) clickRef.current(e.lnglat.getLng(), e.lnglat.getLat())
        })
        map.on('zoomchange', () => {
          currentZoomRef.current = map.getZoom()
        })
        mapRef.current = map
        setMapReady(true)
      })
      .catch((err: any) => console.error('[AMap] load failed', err))

    return () => {
      destroyed = true
      clusterRef.current = null
      retainedRef.current = []
      redundantRef.current = []
      blindSpotsRef.current = []
      idealRef.current = []
      mapRef.current?.destroy()
      mapRef.current = null
      setMapReady(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync retained markers (cluster or individual)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    // Clear old cluster/markers
    if (clusterRef.current) {
      try { clusterRef.current.setMap(null) } catch {}
      try { clusterRef.current.setData([]) } catch {}
      clusterRef.current = null
    }
    if (retainedRef.current.length) {
      try { map.remove(retainedRef.current) } catch {}
      retainedRef.current = []
    }

    if (!markers.length || !layerVisibility.retained) return

    const AMap = (window as any).AMap
    if (!AMap) return

    if (markers.length > 30 && typeof AMap.MarkerCluster === 'function') {
      try {
        const clusterData = markers.map((m) => ({
          lnglat: [m.lng, m.lat],
          name: m.name,
          sei: m.sei,
        }))
        const cluster = new AMap.MarkerCluster(map, clusterData, {
          gridSize,
          maxZoom: 15,
          renderClusterMarker: (context: any) => {
            const count = context.count
            const size = Math.min(44, 20 + Math.sqrt(count) * 2)
            const div = document.createElement('div')
            div.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;text-align:center;line-height:${size}px;font-size:${Math.max(10, Math.floor(size / 3))}px;font-weight:bold;color:#fff;background:#4A6B5C;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);`
            div.innerHTML = String(count)
            context.marker.setContent(div)
            context.marker.setOffset(new AMap.Pixel(-size / 2, -size / 2))
          },
          renderMarker: (context: any) => {
            const data = context.data
            const el = document.createElement('div')
            el.innerHTML = markerHTML(data.name, data.sei)
            context.marker.setContent(el.firstElementChild as HTMLElement)
            context.marker.setOffset(new AMap.Pixel(-16, -16))
          },
        })
        clusterRef.current = cluster
      } catch (e) {
        console.warn('[AMap] MarkerCluster failed, using individual markers', e)
        const amapMarkers = markers.map((m) => {
          const el = document.createElement('div')
          el.innerHTML = markerHTML(m.name, m.sei)
          return new AMap.Marker({
            position: new AMap.LngLat(m.lng, m.lat),
            content: el.firstElementChild as HTMLElement,
            offset: new AMap.Pixel(-16, -16),
          })
        })
        map.add(amapMarkers)
        retainedRef.current = amapMarkers
      }
    } else {
      const amapMarkers = markers.map((m) => {
        const el = document.createElement('div')
        el.innerHTML = markerHTML(m.name, m.sei)
        return new AMap.Marker({
          position: new AMap.LngLat(m.lng, m.lat),
          content: el.firstElementChild as HTMLElement,
          offset: new AMap.Pixel(-16, -16),
        })
      })
      map.add(amapMarkers)
      retainedRef.current = amapMarkers
    }

    try { map.setFitView(null, false, [60, 60, 60, 60]) } catch {}
  }, [markers, mapReady, gridSize, layerVisibility.retained])

  // Sync redundant markers
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    if (redundantRef.current.length) {
      try { map.remove(redundantRef.current) } catch {}
      redundantRef.current = []
    }

    if (!redundantMarkers?.length || !layerVisibility.redundant) return

    const AMap = (window as any).AMap
    if (!AMap) return

    const newOverlays = redundantMarkers.map((rm) => {
      const el = document.createElement('div')
      el.innerHTML = `<div style="width:24px;height:24px;border-radius:50%;background:#EF4444;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.3);">✕</div>`
      return new AMap.Marker({
        position: new AMap.LngLat(rm.lng, rm.lat),
        content: el.firstElementChild as HTMLElement,
        offset: new AMap.Pixel(-12, -12),
      })
    })

    map.add(newOverlays)
    redundantRef.current = newOverlays
  }, [redundantMarkers, mapReady, layerVisibility.redundant])

  // Sync blind spots
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    if (blindSpotsRef.current.length) {
      try { map.remove(blindSpotsRef.current) } catch {}
      blindSpotsRef.current = []
    }

    if (!blindSpots?.length || !layerVisibility.blindSpots) return

    const AMap = (window as any).AMap
    if (!AMap) return

    const newOverlays = blindSpots.map((spot) => {
      return new AMap.Circle({
        center: new AMap.LngLat(spot.lng, spot.lat),
        radius: spot.radius,
        fillColor: '#EF4444',
        fillOpacity: 0.15,
        strokeColor: '#EF4444',
        strokeOpacity: 0.4,
        strokeWeight: 1,
        strokeStyle: 'dashed',
      })
    })

    map.add(newOverlays)
    blindSpotsRef.current = newOverlays
  }, [blindSpots, mapReady, layerVisibility.blindSpots])

  // Sync ideal points
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    if (idealRef.current.length) {
      try { map.remove(idealRef.current) } catch {}
      idealRef.current = []
    }

    if (!idealPoints?.length || !layerVisibility.ideal) return

    const AMap = (window as any).AMap
    if (!AMap) return

    const newOverlays = idealPoints.map((ip) => {
      const el = document.createElement('div')
      el.innerHTML = idealPointHTML(ip.reason, ip.expectedSei)
      return new AMap.Marker({
        position: new AMap.LngLat(ip.lng, ip.lat),
        content: el.firstElementChild as HTMLElement,
        offset: new AMap.Pixel(-14, -14),
      })
    })

    map.add(newOverlays)
    idealRef.current = newOverlays
  }, [idealPoints, mapReady, layerVisibility.ideal])

  const h = typeof height === 'number' ? `${height}px` : height
  return <div ref={containerRef} style={{ width: '100%', height: h, borderRadius: 8, overflow: 'hidden' }} />
}
