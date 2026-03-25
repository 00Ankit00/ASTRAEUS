import React, { useState, useRef } from 'react'
import { Search, Loader2, Sparkles, Command, RotateCcw, Bot } from 'lucide-react'
import { useMapStore } from '../../store/useMapStore'

const NaturalLanguageInput: React.FC = () => {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const setLocation = useMapStore((state) => state.setLocation)
  const setChangeResults = useMapStore((state) => state.setChangeResults)
  const changeResults = useMapStore((state) => state.changeResults)
  const pollIntervalRef = useRef<number | null>(null)

  const handleReset = () => {
    setQuery('')
    setChangeResults([])
    setLocation(78.9629, 20.5937, 4) // Default India center
    useMapStore.getState().setDateRange('2024-01-01', '2025-01-01')
  }

  const pollJobStatus = async (jobId: string) => {
    if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current)

    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const statusRes = await fetch(`/api/change-detect/${jobId}/status`)
        if (!statusRes.ok) return
        
        const statusData = await statusRes.json()

        if (statusData.status === 'completed') {
          window.clearInterval(pollIntervalRef.current!)
          
          const resultsRes = await fetch(`/api/change-detect/${jobId}/results?confidence_threshold=0.5`)
          if (resultsRes.ok) {
            const resultsData = await resultsRes.json()
            if (resultsData.changes) setChangeResults(resultsData.changes)
          }
          setIsLoading(false)
        } else if (statusData.status === 'failed') {
          window.clearInterval(pollIntervalRef.current!)
          setIsLoading(false)
        }
      } catch (e) {
        window.clearInterval(pollIntervalRef.current!)
        setIsLoading(false)
      }
    }, 1000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isLoading) return

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, confidence_threshold: 0.7 })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.parsed && data.parsed.location) {
          const CITIES: Record<string, [number, number]> = {
            'mumbai': [72.8777, 19.0760],
            'delhi': [77.1025, 28.7041],
            'bangalore': [77.5946, 12.9716],
            'chennai': [80.2707, 13.0827],
            'kolkata': [88.3639, 22.5726]
          }
          const locStr = String(data.parsed.location).toLowerCase()
          const coords = CITIES[locStr]
          if (coords) {
            setLocation(coords[0], coords[1], 13) 
          }
        }
        
        if (data.parsed && data.parsed.date_from) {
          useMapStore.getState().setDateRange(
            data.parsed.date_from, 
            data.parsed.date_to || new Date().toISOString().split('T')[0]
          )
        }
        
        if (data.job_id) {
          pollJobStatus(data.job_id)
        } else {
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full relative group">
      <form onSubmit={handleSubmit} className="relative z-10">
        <div className="flex items-center gap-3 px-4 py-2 bg-[#090C10] border border-astraeus-border rounded-lg shadow-inner group-hover:border-astraeus-primary/50 transition-colors focus-within:border-astraeus-primary focus-within:ring-1 focus-within:ring-astraeus-primary/50">
          <Sparkles className="w-4 h-4 text-astraeus-primary flex-shrink-0" />
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Show changes in Mumbai 2024-2025..."
            className="flex-1 bg-transparent outline-none text-sm text-astraeus-text placeholder-astraeus-textMuted/50 tracking-wide"
            disabled={isLoading}
          />
          
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1 text-[10px] text-astraeus-textMuted px-1.5 py-0.5 bg-astraeus-panel border border-astraeus-border rounded">
              <Command className="w-3 h-3" /> K
            </span>
            <div className="w-px h-4 bg-astraeus-border mx-1"></div>
            
            {(query.trim() !== '' || changeResults.length > 0) && !isLoading && (
              <button
                type="button"
                onClick={handleReset}
                className="px-2 py-1 text-astraeus-textMuted hover:text-astraeus-warning transition-colors"
                title="Reset Map and Search"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={useMapStore.getState().toggleChatbot}
              className={`px-2 py-1 transition-colors ${useMapStore(s => s.isChatbotOpen) ? 'text-astraeus-primary drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]' : 'text-astraeus-textMuted hover:text-white'}`}
              title="Astraeus AI Chatbot"
            >
              <Bot className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="px-2 py-1 text-astraeus-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-astraeus-primary" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default NaturalLanguageInput
