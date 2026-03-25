import { create } from 'zustand'

interface MapState {
  // Map view state
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
  
  // UI state
  isSidebarOpen: boolean
  activeLayers: string[]
  mapTheme: 'dark' | 'light'
  
  // Split view state
  isSplitView: boolean
  compareDate: string | null

  // Temporal Filter
  dateFrom: string
  dateTo: string

  // Chatbot Insight State
  isChatbotOpen: boolean

  // AI Simulation Results
  changeResults: any[]
  
  // Actions
  setViewState: (view: Partial<Omit<MapState, 'setViewState' | 'toggleSidebar' | 'toggleLayer' | 'setLocation' | 'setChangeResults' | 'setMapTheme' | 'setDateRange' | 'toggleChatbot'>>) => void
  setDateRange: (from: string, to: string) => void
  toggleChatbot: () => void
  toggleSidebar: () => void
  toggleLayer: (layerId: string) => void
  setMapTheme: (theme: 'dark' | 'light') => void
  setSplitView: (isSplit: boolean, compareDate?: string) => void
  setLocation: (longitude: number, latitude: number, zoom?: number) => void
  setChangeResults: (results: any[]) => void
}

export const useMapStore = create<MapState>((set) => ({
  // Initial view centered on India
  longitude: 78.9629,
  latitude: 20.5937,
  zoom: 4,
  pitch: 0,
  bearing: 0,
  
  isSidebarOpen: true,
  activeLayers: ['satellite', 'boundaries', 'changes'],
  mapTheme: 'dark',
  
  isSplitView: false,
  compareDate: null,

  dateFrom: '2024-01-01',
  dateTo: '2025-01-01',
  
  isChatbotOpen: false,

  changeResults: [],
  
  setViewState: (view) => set((state) => ({ ...state, ...view })),
  
  toggleSidebar: () => set((state) => ({ 
    isSidebarOpen: !state.isSidebarOpen 
  })),
  
  toggleLayer: (layerId) => set((state) => {
    const isActive = state.activeLayers.includes(layerId)
    return {
      activeLayers: isActive 
        ? state.activeLayers.filter(id => id !== layerId)
        : [...state.activeLayers, layerId]
    }
  }),

  setMapTheme: (theme) => set({ mapTheme: theme }),
  
  setSplitView: (isSplit, compareDate) => set({
    isSplitView: isSplit,
    compareDate: compareDate || null
  }),
  
  setLocation: (longitude, latitude, zoom) => set({
    longitude,
    latitude,
    zoom: zoom || 12
  }),

  toggleChatbot: () => set((state) => ({ isChatbotOpen: !state.isChatbotOpen })),

  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),

  setChangeResults: (results) => set({ changeResults: results })
}))
