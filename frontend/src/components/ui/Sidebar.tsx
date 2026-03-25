import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Calendar, Filter, Map as MapIcon, ChevronRight, ChevronLeft, LocateFixed, Moon, Sun } from 'lucide-react'
import { useMapStore } from '../../store/useMapStore'

const Sidebar: React.FC = () => {
  const { isSidebarOpen, toggleSidebar, activeLayers, toggleLayer, setLocation, mapTheme, setMapTheme, dateFrom, dateTo, setDateRange } = useMapStore()
  const [dataStats, setDataStats] = useState({ scenes: '...', boundaries: '...' })

  useEffect(() => {
    // Fetch and connect DB stats from backend
    Promise.all([
      fetch('/api/scenes?limit=1').then(r => r.json()).catch(() => ({ total: 0 })),
      fetch('/api/boundaries').then(r => r.json()).catch(() => ({ count: 0 }))
    ]).then(([scenesData, boundariesData]) => {
      setDataStats({
        scenes: (scenesData.total || 0).toString(),
        boundaries: (boundariesData.count || 0).toString()
      })
    })
  }, [])


  const mapLayers = [
    { id: 'satellite', name: 'Satellite Imagery', icon: MapIcon },
    { id: 'boundaries', name: 'Admin Boundaries', icon: Layers },
    { id: 'changes', name: 'Change Detection', icon: Filter },
    { id: 'population', name: 'Population Density', icon: Layers },
  ]

  const cities = [
    { name: 'Mumbai', lng: 72.8777, lat: 19.0760 },
    { name: 'Delhi', lng: 77.1025, lat: 28.7041 },
    { name: 'Bangalore', lng: 77.5946, lat: 12.9716 },
  ]

  return (
    <>
      {/* Toggle button when closed */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            onClick={toggleSidebar}
            className="absolute left-0 top-6 z-40 p-2 bg-astraeus-panel border border-l-0 border-astraeus-border rounded-r-md shadow-lg hover:border-astraeus-primary transition-colors group"
          >
            <ChevronRight className="w-5 h-5 text-astraeus-textMuted group-hover:text-astraeus-text" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, x: -300 }}
            animate={{ width: 300, x: 0 }}
            exit={{ width: 0, x: -300 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="bg-astraeus-panel border-r border-astraeus-border flex flex-col h-full z-40 shrink-0 overflow-hidden relative shadow-[4px_0_24px_rgba(0,0,0,0.5)]"
          >
            {/* Header */}
            <div className="h-14 border-b border-astraeus-border flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2 text-astraeus-textMuted">
                <Filter className="w-4 h-4" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-astraeus-text">Control Panel</h2>
              </div>
              <button 
                onClick={toggleSidebar}
                className="p-1.5 hover:bg-astraeus-bg rounded text-astraeus-textMuted hover:text-astraeus-text transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 space-y-8 overflow-y-auto flex-1 sidebar-scroll">
              
              {/* Map Theme Toggle */}
              <section>
                <h3 className="text-[10px] font-semibold text-astraeus-border uppercase tracking-widest mb-3">Map Theme</h3>
                <div className="flex items-center p-1 bg-astraeus-bg border border-astraeus-border rounded shadow-inner">
                  <button
                    onClick={() => setMapTheme('dark')}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-all duration-200 ${
                      mapTheme === 'dark' 
                        ? 'bg-astraeus-panel text-astraeus-primary shadow-[0_0_10px_rgba(59,130,246,0.1)] border border-astraeus-border' 
                        : 'text-astraeus-textMuted hover:text-astraeus-text border border-transparent'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" /> Dark
                  </button>
                  <button
                    onClick={() => setMapTheme('light')}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-all duration-200 ${
                      mapTheme === 'light' 
                        ? 'bg-[whitesmoke] text-black shadow-md border border-gray-300' 
                        : 'text-astraeus-textMuted hover:text-astraeus-text border border-transparent'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" /> Light
                  </button>
                </div>
              </section>

              {/* Layer Toggles */}
              <section>
                <h3 className="text-[10px] font-semibold text-astraeus-border uppercase tracking-widest mb-3">Map Layers</h3>
                <div className="space-y-2">
                  {mapLayers.map((layer, index) => {
                    const Icon = layer.icon
                    const isActive = activeLayers.includes(layer.id)
                    return (
                      <motion.button
                        key={layer.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => toggleLayer(layer.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 border ${
                          isActive 
                            ? 'bg-[rgba(59,130,246,0.1)] border-astraeus-primary text-astraeus-text shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                            : 'bg-astraeus-bg border-astraeus-bg hover:border-astraeus-border text-astraeus-textMuted hover:text-astraeus-text'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-astraeus-primary' : ''}`} />
                        <span className="text-sm tracking-wide">{layer.name}</span>
                        {isActive && (
                          <motion.div 
                            layoutId="layer-active"
                            className="ml-auto w-1.5 h-1.5 bg-astraeus-primary rounded-full shadow-[0_0_6px_rgba(59,130,246,0.8)]" 
                          />
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </section>

              {/* Date Range */}
              <section>
                <h3 className="text-[10px] font-semibold text-astraeus-border uppercase tracking-widest mb-3">Temporal Filter</h3>
                <div className="space-y-3">
                  <div className="bg-astraeus-bg border border-astraeus-border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] text-astraeus-textMuted uppercase tracking-wider">T1 (Baseline)</label>
                      <Calendar className="w-3.5 h-3.5 text-astraeus-primary" />
                    </div>
                    <input 
                      type="date" 
                      className="w-full bg-transparent text-sm text-astraeus-text outline-none focus:ring-1 focus:ring-astraeus-primary rounded p-1 transition-all"
                      value={dateFrom}
                      onChange={(e) => setDateRange(e.target.value, dateTo)}
                    />
                  </div>

                  <div className="bg-astraeus-bg border border-astraeus-border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] text-astraeus-textMuted uppercase tracking-wider">T2 (Current)</label>
                      <Calendar className="w-3.5 h-3.5 text-astraeus-primary" />
                    </div>
                    <input 
                      type="date" 
                      className="w-full bg-transparent text-sm text-astraeus-text outline-none focus:ring-1 focus:ring-astraeus-primary rounded p-1 transition-all"
                      value={dateTo}
                      onChange={(e) => setDateRange(dateFrom, e.target.value)}
                    />
                  </div>
                </div>
              </section>

              {/* Regions Sequence */}
              <section>
                <h3 className="text-[10px] font-semibold text-astraeus-border uppercase tracking-widest mb-3">Target Regions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {cities.map((city, index) => (
                    <motion.button
                      key={city.name}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                      onClick={() => setLocation(city.lng, city.lat, 12)}
                      className="flex items-center gap-2 p-2 bg-astraeus-bg border border-transparent hover:border-astraeus-border rounded text-xs text-astraeus-textMuted hover:text-astraeus-text transition-all group"
                    >
                      <LocateFixed className="w-3 h-3 group-hover:text-astraeus-primary transition-colors" />
                      {city.name}
                    </motion.button>
                  ))}
                </div>
              </section>

              {/* Database Status / Data Explorer */}
              <section>
                <h3 className="text-[10px] font-semibold text-astraeus-border uppercase tracking-widest mb-3">Backend Database</h3>
                <div className="flex flex-col gap-2 p-3 bg-astraeus-bg border border-astraeus-border rounded shadow-inner text-[10px] text-astraeus-textMuted uppercase tracking-wider">
                  <div className="flex justify-between items-center group cursor-help">
                    <span>Total Scenes</span>
                    <span className="text-astraeus-primary font-mono bg-astraeus-panel px-1.5 py-0.5 rounded shadow-[0_0_6px_rgba(59,130,246,0.3)] border border-transparent group-hover:border-astraeus-primary/50 transition-colors">{dataStats.scenes}</span>
                  </div>
                  <div className="flex justify-between items-center group cursor-help mt-1">
                    <span>Admin Bounds</span>
                    <span className="text-astraeus-primary font-mono bg-astraeus-panel px-1.5 py-0.5 rounded shadow-[0_0_6px_rgba(59,130,246,0.3)] border border-transparent group-hover:border-astraeus-primary/50 transition-colors">{dataStats.boundaries}</span>
                  </div>
                </div>
              </section>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

export default Sidebar
