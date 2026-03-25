
import MapContainer from './components/map/MapContainer'
import Header from './components/ui/Header'
import Sidebar from './components/ui/Sidebar'
import RightPanel from './components/ui/RightPanel'
import NaturalLanguageInput from './components/query/NaturalLanguageInput'
import ChatbotInterface from './components/chat/ChatbotInterface'
import { useMapStore } from './store/useMapStore'

function App() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-astraeus-bg text-astraeus-text">
      {/* Top Navigation */}
      <Header>
        <NaturalLanguageInput />
      </Header>
      
      {/* Main Workspace Area */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* Left Control Panel / Sidebar */}
        <Sidebar />
        
        {/* Center Canvas: Map & Split View OR Chatbot Matrix */}
        <div className="flex-1 relative bg-[#06080A]">
          {useMapStore(s => s.isChatbotOpen) ? (
            <ChatbotInterface />
          ) : (
            <MapContainer />
          )}
          
          {/* Subtle vignette/shadow over the map edges */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.3)] z-10"></div>
        </div>

        {/* Right Insights Panel */}
        <RightPanel />

      </div>
    </div>
  )
}

export default App
