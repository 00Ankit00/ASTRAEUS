import React, { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'

import { useMapStore } from '../../store/useMapStore'
import 'maplibre-gl/dist/maplibre-gl.css'

const MapContainer: React.FC = () => {
  const mapContainerLeft = useRef<HTMLDivElement>(null)
  const mapContainerRight = useRef<HTMLDivElement>(null)
  const mapLeft = useRef<maplibregl.Map | null>(null)
  const mapRight = useRef<maplibregl.Map | null>(null)
  const currentLeftSatUrl = useRef<string>('')
  const currentRightSatUrl = useRef<string>('')
  const { longitude, latitude, zoom, pitch, bearing, setViewState, activeLayers, changeResults, mapTheme, dateFrom, dateTo } = useMapStore()
  
  const [viewMode, setViewMode] = useState<'before' | 'after'>('after')
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const isSplitMode = activeLayers.includes('changes')

  useEffect(() => {
    if (!mapContainerLeft.current || !mapContainerRight.current) return

    const getSharedStyle = () => ({
      version: 8,
      sources: {
        'light-matter': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
        }
      },
      layers: [
        {
          id: 'light-matter-layer',
          type: 'raster',
          source: 'light-matter',
          paint: {
            'raster-opacity': 1.0
          }
        }
      ]
    });

    mapLeft.current = new maplibregl.Map({
      container: mapContainerLeft.current,
      style: getSharedStyle() as any,
      center: [longitude, latitude],
      zoom: zoom,
      pitch: pitch,
      bearing: bearing,
      attributionControl: false
    })

    mapRight.current = new maplibregl.Map({
      container: mapContainerRight.current,
      style: getSharedStyle() as any,
      center: [longitude, latitude],
      zoom: zoom,
      pitch: pitch,
      bearing: bearing,
      attributionControl: false
    })

    // Add controls to right map (which sits on top)
    mapRight.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')

    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) setIsMapLoaded(true);
    };

    mapLeft.current.on('load', checkLoaded)
    mapRight.current.on('load', checkLoaded)

    let isSyncingLeft = false;
    let isSyncingRight = false;

    mapLeft.current.on('move', () => {
      if (!mapLeft.current || !mapRight.current) return;
      if (isSyncingRight) return;
      isSyncingLeft = true;
      mapRight.current.jumpTo({
        center: mapLeft.current.getCenter(),
        zoom: mapLeft.current.getZoom(),
        bearing: mapLeft.current.getBearing(),
        pitch: mapLeft.current.getPitch()
      })
      isSyncingLeft = false;

      const center = mapLeft.current.getCenter()
      setViewState({
        longitude: center.lng,
        latitude: center.lat,
        zoom: mapLeft.current.getZoom(),
        pitch: mapLeft.current.getPitch(),
        bearing: mapLeft.current.getBearing()
      })
    })

    mapRight.current.on('move', () => {
      if (!mapLeft.current || !mapRight.current) return;
      if (isSyncingLeft) return;
      isSyncingRight = true;
      mapLeft.current.jumpTo({
        center: mapRight.current.getCenter(),
        zoom: mapRight.current.getZoom(),
        bearing: mapRight.current.getBearing(),
        pitch: mapRight.current.getPitch()
      })
      isSyncingRight = false;
    })

    // Setup ResizeObserver to fix distortion when Sidebar opens/closes
    const resizeObserver = new ResizeObserver(() => {
      mapLeft.current?.resize()
      mapRight.current?.resize()
    })
    resizeObserver.observe(mapContainerLeft.current)

    return () => {
      resizeObserver.disconnect()
      if (mapLeft.current) {
        mapLeft.current.remove()
        mapLeft.current = null
      }
      if (mapRight.current) {
        mapRight.current.remove()
        mapRight.current = null
      }
    }
  }, [])

  // Sync external state changes gracefully to avoid stutter loops
  useEffect(() => {
    if (mapLeft.current && isMapLoaded) {
      const center = mapLeft.current.getCenter()
      const currentZoom = mapLeft.current.getZoom()
      
      const dist = Math.sqrt(Math.pow(center.lng - longitude, 2) + Math.pow(center.lat - latitude, 2))
      if (dist > 0.05 || Math.abs(currentZoom - zoom) > 0.5) {
        mapLeft.current.flyTo({
          center: [longitude, latitude],
          zoom,
          pitch,
          bearing,
          duration: 1500,
          essential: true
        })
      }
    }
  }, [longitude, latitude, zoom, pitch, bearing, isMapLoaded])

  // Handle layer toggles
  useEffect(() => {
    if (!mapLeft.current || !isMapLoaded) return
    
    // Process exact chronological bounds assigned natively by NLP UI intent
    const yearLeftStr = dateFrom ? dateFrom.substring(0, 4) : '2024'
    const yearRightStr = dateTo ? dateTo.substring(0, 4) : '2025'
    
    // Helper to dynamically switch raster streams based dynamically on temporal timeframe
    const getSatelliteUrl = (yStr: string, isLeft: boolean) => {
      const y = parseInt(yStr) || 2024;
      // Real-time chronologically accurate Sentinel-2 cloudless maps natively compiled for requested year (2016-2023)
      if (y >= 2016 && y <= 2023) return `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${y}_3857/default/g/{z}/{y}/{x}.jpg`;
      if (y < 2016) return `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2016_3857/default/g/{z}/{y}/{x}.jpg`;
      // Return modern high-res proxy for >2023
      return isLeft ? 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}' : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }

    const targetLeftUrl = getSatelliteUrl(yearLeftStr, true);
    const targetRightUrl = getSatelliteUrl(yearRightStr, false);

    const setupSatellite = (mapInstance: maplibregl.Map, url: string, currentUrlRef: React.MutableRefObject<string>) => {
      if (activeLayers.includes('satellite')) {
        // Drop outdated chronological layer to immediately enforce map re-render matching OSM engine
        if (mapInstance.getSource('satellite') && currentUrlRef.current !== url) {
          if (mapInstance.getLayer('satellite-layer')) mapInstance.removeLayer('satellite-layer')
          mapInstance.removeSource('satellite')
        }
        
        if (!mapInstance.getSource('satellite')) {
          mapInstance.addSource('satellite', {
            type: 'raster',
            tiles: [url],
            tileSize: 256,
            maxzoom: 14 // Upscale dynamically since Sentinel-2 cuts natively at z14
          })
          const layerDef: maplibregl.LayerSpecification = {
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite',
            paint: { 'raster-opacity': 1.0 }
          }
          if (mapInstance.getLayer('boundaries-layer')) {
            mapInstance.addLayer(layerDef, 'boundaries-layer')
          } else {
            mapInstance.addLayer(layerDef)
          }
          currentUrlRef.current = url;
        }
      } else {
        if (mapInstance.getLayer('satellite-layer')) mapInstance.removeLayer('satellite-layer')
        if (mapInstance.getSource('satellite')) {
            mapInstance.removeSource('satellite')
            currentUrlRef.current = ''
        }
      }
    }

    setupSatellite(mapLeft.current, targetLeftUrl, currentLeftSatUrl);
    if (mapRight.current) setupSatellite(mapRight.current, targetRightUrl, currentRightSatUrl);
    
    const maps = [mapLeft.current, mapRight.current].filter(Boolean) as maplibregl.Map[]
    
    maps.forEach((mapInstance) => {
      // Admin Boundaries
      if (activeLayers.includes('boundaries')) {
        if (!mapInstance.getSource('boundaries')) {
          mapInstance.addSource('boundaries', {
            type: 'geojson',
            data: 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson'
          })
          mapInstance.addLayer({
            id: 'boundaries-layer',
            type: 'line',
            source: 'boundaries',
            paint: {
              'line-color': '#000000',
              'line-width': 1.5,
              'line-opacity': 0.8
            }
          })
        }
      } else {
        if (mapInstance.getLayer('boundaries-layer')) mapInstance.removeLayer('boundaries-layer')
        if (mapInstance.getSource('boundaries')) mapInstance.removeSource('boundaries')
      }

      // Population Density
      if (activeLayers.includes('population')) {
        if (!mapInstance.getSource('population')) {
          mapInstance.addSource('population', {
            type: 'raster',
            tiles: [
              'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png'
            ],
            tileSize: 256,
            maxzoom: 8,
            attribution: '&copy; NASA EOSDIS GIBS'
          })
          const layerDef: maplibregl.LayerSpecification = {
            id: 'population-layer',
            type: 'raster',
            source: 'population',
            paint: { 'raster-opacity': 0.7 }
          }
          if (mapInstance.getLayer('boundaries-layer')) {
            mapInstance.addLayer(layerDef, 'boundaries-layer')
          } else {
            mapInstance.addLayer(layerDef)
          }
        }
      } else {
        if (mapInstance.getLayer('population-layer')) mapInstance.removeLayer('population-layer')
        if (mapInstance.getSource('population')) mapInstance.removeSource('population')
      }
    })

    // Change Detection Overlay: render on BOTH maps so polygons are visible across the full viewport.
    // The slider contrast comes from the satellite imagery year (2025 vs 2026), not polygon presence.
    const sourceId = 'simulated-changes'
    const fillLayerId = 'simulated-changes-fill'
    const lineLayerId = 'simulated-changes-line'

    if (activeLayers.includes('changes') && changeResults.length > 0) {
      const geojsonData = {
        type: 'FeatureCollection',
        features: changeResults.filter((c: any) => c.geometry).map((c: any) => ({
          type: 'Feature',
          geometry: c.geometry,
          properties: { confidence: c.confidence, type: c.change_type, area: c.area_sq_meters }
        }))
      }
      // Render on both maps
      maps.forEach(m => {
        if (!m.getSource(sourceId)) {
          m.addSource(sourceId, { type: 'geojson', data: geojsonData as any })
          m.addLayer({
            id: fillLayerId, type: 'fill', source: sourceId,
            paint: {
              'fill-color': ['match', ['get', 'type'], 'construction', '#FF8000', 'deforestation', '#FF0000', 'water_body', '#00FFFF', '#00FF00'],
              'fill-opacity': 0.65
            }
          })
          m.addLayer({
            id: lineLayerId, type: 'line', source: sourceId,
            paint: {
              'line-color': ['match', ['get', 'type'], 'construction', '#FF8000', 'deforestation', '#FF0000', 'water_body', '#00FFFF', '#FFFFFF'],
              'line-width': 3
            }
          })
        } else {
          (m.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojsonData as any)
        }
      })
    } else {
      maps.forEach(m => {
        if (m.getLayer(fillLayerId)) m.removeLayer(fillLayerId)
        if (m.getLayer(lineLayerId)) m.removeLayer(lineLayerId)
        if (m.getSource(sourceId)) m.removeSource(sourceId)
      })
    }


  }, [activeLayers, changeResults, isMapLoaded, dateFrom, dateTo])

  // Compute common map styles (excluding clipPath)
  const computeMapStyle = () => {
    if (activeLayers.includes('satellite')) return {}
    if (mapTheme === 'dark') return { filter: "invert(100%) hue-rotate(180deg) contrast(110%) brightness(95%)" }
    return { filter: "contrast(115%) grayscale(5%)" }
  }

  const yearFrom = dateFrom ? dateFrom.substring(0, 4) : '2024'
  const yearTo = dateTo ? dateTo.substring(0, 4) : '2025'

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Container for LEFT MapLibre Instance (Baseline / AFTER with polygons) */}
      <div 
        ref={mapContainerLeft} 
        className="w-full h-full map-container absolute inset-0 z-0 bg-[#0B0F14]" 
        style={computeMapStyle()}
      />

      {/* Container for RIGHT MapLibre Instance (Clean baseline, transitions over left) */}
      <div 
        ref={mapContainerRight} 
        className="w-full h-full map-container absolute inset-0 z-0" 
        style={{
          ...computeMapStyle(),
          // Before: fully cover the left map (show clean baseline). After: slide away to reveal left (with polygons).
          clipPath: isSplitMode
            ? (viewMode === 'before' ? 'inset(0 0 0 0%)' : 'inset(0 0 0 100%)')
            : 'inset(0 0 0 0)',
          transition: 'clip-path 700ms cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      />
      
      {/* Before / After Toggle Button */}
      {isSplitMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.25)] border border-white/10">
          <button
            onClick={() => setViewMode('before')}
            className={`px-5 py-2 text-[11px] uppercase tracking-widest font-semibold transition-all duration-300 ${
              viewMode === 'before'
                ? 'bg-astraeus-primary text-white shadow-inner'
                : 'bg-black/70 text-astraeus-textMuted hover:bg-white/5'
            }`}
          >
            {yearFrom} Baseline
          </button>
          <div className="w-px h-6 bg-white/10" />
          <button
            onClick={() => setViewMode('after')}
            className={`px-5 py-2 text-[11px] uppercase tracking-widest font-semibold transition-all duration-300 ${
              viewMode === 'after'
                ? 'bg-astraeus-primary text-white shadow-inner'
                : 'bg-black/70 text-astraeus-textMuted hover:bg-white/5'
            }`}
          >
            {yearTo} Current ●
          </button>
        </div>
      )}
    </div>
  )
}

export default MapContainer
