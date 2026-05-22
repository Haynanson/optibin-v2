declare module 'shp-write' {
  interface GeoJSON {
    type: 'FeatureCollection'
    features: Array<{
      type: 'Feature'
      geometry: { type: string; coordinates: unknown }
      properties: Record<string, unknown>
    }>
  }
  export function download(geojson: GeoJSON, filename?: string): void
}
