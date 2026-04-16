import { useEffect, useState, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'

interface ActivityMapProps {
  polyline: string
}

export function ActivityMap({ polyline }: ActivityMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<LeafletMap | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return

    let cancelled = false

    async function initMap() {
      try {
        const [L, polylineLib] = await Promise.all([
          import('leaflet'),
          import('@mapbox/polyline'),
        ])

        // Import leaflet CSS
        await import('leaflet/dist/leaflet.css')

        if (cancelled || !mapRef.current) return

        const coords = polylineLib.decode(polyline)
        if (coords.length === 0) {
          setError(true)
          return
        }

        const latLngs = coords.map(([lat, lng]: [number, number]) => L.default.latLng(lat, lng))

        const map = L.default.map(mapRef.current, {
          zoomControl: true,
          attributionControl: false,
        })
        leafletMapRef.current = map

        // Dark CartoDB tiles to match app theme
        L.default.tileLayer(
          'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          { maxZoom: 19 }
        ).addTo(map)

        // Route line in accent color
        const routeLine = L.default.polyline(latLngs, {
          color: '#14b8a6',
          weight: 3,
          opacity: 0.9,
        }).addTo(map)

        // Start marker (green)
        L.default.circleMarker(latLngs[0], {
          radius: 7,
          fillColor: '#14b8a6',
          fillOpacity: 1,
          color: '#0e1515',
          weight: 2,
        }).addTo(map)

        // End marker (red)
        L.default.circleMarker(latLngs[latLngs.length - 1], {
          radius: 7,
          fillColor: '#f87171',
          fillOpacity: 1,
          color: '#111919',
          weight: 2,
        }).addTo(map)

        map.fitBounds(routeLine.getBounds(), { padding: [30, 30] })
      } catch {
        setError(true)
      }
    }

    initMap()

    return () => {
      cancelled = true
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [polyline])

  if (error) {
    return (
      <div className="h-80 rounded-[var(--radius-lg)] bg-bg-secondary border border-border-subtle flex items-center justify-center text-text-muted">
        Failed to load map
      </div>
    )
  }

  return (
    <div
      ref={mapRef}
      className="h-80 rounded-[var(--radius-lg)] border border-border-subtle overflow-hidden"
    />
  )
}
