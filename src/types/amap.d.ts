/* Minimal AMap type declarations for @amap/amap-jsapi-loader */
/* Full types: npm i -D @amap/amap-jsapi-types (heavy) */

declare global {
  interface Window {
    _AMapSecurityConfig: {
      securityJsCode: string
    }
  }

  namespace AMap {
    class Map {
      constructor(container: string | HTMLElement, opts?: MapOptions)
      destroy(): void
      on(event: string, handler: (...args: unknown[]) => void): void
      off(event: string, handler: (...args: unknown[]) => void): void
      setCenter(center: LngLat | [number, number]): void
      setZoom(zoom: number): void
      add(overlay: Overlay | Overlay[]): void
      remove(overlay: Overlay | Overlay[]): void
      clearMap(): void
      setFitView(
        overlay?: Overlay | Overlay[],
        immediately?: boolean,
        margin?: number | number[],
        maxZoom?: number,
      ): void
    }

    interface MapOptions {
      zoom?: number
      center?: LngLat | [number, number]
      viewMode?: string
      resizeEnable?: boolean
    }

    class LngLat {
      constructor(lng: number, lat: number)
      getLng(): number
      getLat(): number
    }

    class Pixel {
      constructor(x: number, y: number)
    }

    type Overlay = Marker | MarkerCluster

    interface MarkerOptions {
      position: LngLat | [number, number]
      content?: string | HTMLElement
      offset?: Pixel
      ext?: Record<string, unknown>
    }

    class Marker {
      constructor(opts?: MarkerOptions)
      on(event: string, handler: (...args: unknown[]) => void): void
      off(event: string, handler: (...args: unknown[]) => void): void
      setExtData(data: unknown): void
      getExtData(): unknown
    }

    interface MarkerClusterOptions {
      map: Map
      markers: Marker[]
      styles?: ClusterStyle[]
      gridSize?: number
      renderMarker?: (data: { marker: Marker; data: unknown }) => void
    }

    interface ClusterStyle {
      url: string
      size: Size
      offset?: Pixel
      textColor?: string
      textSize?: number
    }

    class MarkerCluster {
      constructor(map: Map, markers: Marker[], opts?: Omit<MarkerClusterOptions, 'map' | 'markers'>)
      setMarkers(markers: Marker[]): void
      clearMarkers(): void
    }

    class Size {
      constructor(width: number, height: number)
    }

    class Icon {
      constructor(opts: { size?: Size; image?: string; imageSize?: Size })
    }
  }
}

export {}
