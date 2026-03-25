import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3 } from 'lucide-react'
import { useMapStore } from '../../store/useMapStore'

const RightPanel: React.FC = () => {
  const { changeResults } = useMapStore()

  const detections = changeResults.length
  const totalAreaSqMeters = changeResults.reduce((acc, curr) => acc + (curr.area_sq_meters || 0), 0)
  const totalAreaHa = (totalAreaSqMeters / 10000).toFixed(1)

  const activeResults = changeResults.map((res: any, i: number) => {
    const typeLabel = res.change_type === 'construction' ? 'Construction' : res.change_type === 'deforestation' ? 'Deforestation' : res.change_type === 'water_body' ? 'Water Body' : 'Other'
    return {
      id: res.id || `res-${i}`,
      type: typeLabel,
      area: `${(res.area_sq_meters / 10000).toFixed(2)} ha`,
      confidence: res.confidence || 0.85,
      date: new Date().toISOString().split('T')[0]
    }
  })

  return (
    <aside className="w-80 bg-astraeus-panel border-l border-astraeus-border flex flex-col h-full shrink-0 shadow-[-4px_0_24px_rgba(0,0,0,0.5)] z-30">
      <div className="h-14 p-4 border-b border-astraeus-border flex items-center justify-between shrink-0">
        <h2 className="text-xs font-semibold text-astraeus-text uppercase tracking-widest flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-astraeus-primary" />
          Insights
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto sidebar-scroll p-4 space-y-6">
        
        {/* Statistics Overview */}
        <section>
          <h3 className="text-[10px] font-semibold text-astraeus-textMuted uppercase tracking-widest mb-3">Analysis Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-astraeus-bg border border-astraeus-border rounded-lg p-3">
              <span className="text-[10px] text-astraeus-textMuted uppercase block mb-1">Total Changed</span>
              <span className="text-lg font-semibold text-astraeus-text">{detections > 0 ? totalAreaHa : '0.0'} <span className="text-xs text-astraeus-textMuted font-normal">ha</span></span>
            </div>
            <div className="bg-astraeus-bg border border-astraeus-border rounded-lg p-3">
              <span className="text-[10px] text-astraeus-textMuted uppercase block mb-1">Detections</span>
              <span className="text-lg font-semibold text-astraeus-text">{detections}</span>
            </div>
          </div>
        </section>

        {/* Results List */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-semibold text-astraeus-textMuted uppercase tracking-widest">Recent Detections</h3>
            {detections > 0 && <span className="text-[10px] text-astraeus-primary bg-[rgba(59,130,246,0.1)] px-2 py-0.5 rounded">High Conf</span>}
          </div>
          
          <div className="space-y-2">
            <AnimatePresence>
              {detections === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-xs text-astraeus-textMuted text-center py-8 border border-dashed border-astraeus-border rounded-lg"
                >
                  No active detections.<br/>Run an analysis to see insights.
                </motion.div>
              ) : (
                activeResults.map((res: any, i: number) => (
                  <motion.div
                    key={res.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                    className="bg-astraeus-bg border border-astraeus-border hover:border-astraeus-primary rounded-lg p-3 cursor-pointer transition-all group shadow-sm hover:shadow-[0_0_8px_rgba(59,130,246,0.2)]"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-1.5">
                        {res.type === 'Construction' ? (
                          <div className="w-2 h-2 rounded-full bg-astraeus-warning"></div>
                        ) : res.type === 'Deforestation' ? (
                          <div className="w-2 h-2 rounded-full bg-astraeus-danger"></div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-astraeus-success"></div>
                        )}
                        <span className="text-xs font-medium text-astraeus-text group-hover:text-astraeus-primary transition-colors">{res.type}</span>
                      </div>
                      <span className="text-[10px] text-astraeus-textMuted">{res.date}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-astraeus-border/50">
                      <span className="text-[11px] text-astraeus-textMuted">Area: <span className="text-astraeus-text">{res.area}</span></span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-astraeus-textMuted">Conf:</span>
                        <span className={`text-[11px] font-medium ${res.confidence > 0.9 ? 'text-astraeus-success' : 'text-astraeus-warning'}`}>
                          {(res.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </section>

      </div>
    </aside>
  )
}

export default RightPanel
