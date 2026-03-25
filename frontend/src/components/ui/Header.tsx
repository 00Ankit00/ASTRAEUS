import React, { useState, useEffect } from 'react'
import { Satellite, User, Bell, Download } from 'lucide-react'

// We will inject the NaturalLanguageInput from App or directly here.
const Header: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [healthStatus, setHealthStatus] = useState<string>('Checking...')
  const [healthColor, setHealthColor] = useState<string>('bg-astraeus-warning shadow-[0_0_8px_rgba(245,158,11,0.6)]')

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => {
        if (d.status === 'healthy') {
          setHealthStatus('System Optimal')
          setHealthColor('bg-astraeus-success shadow-[0_0_8px_rgba(34,197,94,0.6)]')
        }
      })
      .catch(() => {
        setHealthStatus('Offline')
        setHealthColor('bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]')
      })
  }, [])

  return (
    <header className="h-16 bg-astraeus-panel border-b border-astraeus-border flex items-center justify-between px-6 z-50 relative shadow-md">
      {/* Left: Logo + Name */}
      <div className="flex items-center gap-4 w-1/4">
        <div className="w-9 h-9 bg-astraeus-primary rounded flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.5)]">
          <Satellite className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-astraeus-text tracking-wide uppercase">Project Astraeus</h1>
          <p className="text-[10px] text-astraeus-textMuted uppercase tracking-[0.2em]">Geospatial Intelligence</p>
        </div>
      </div>

      {/* Center: Search Bar passed as children */}
      <div className="flex-1 max-w-2xl px-4 flex justify-center">
        {children}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-5 w-1/4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${healthColor}`}></span>
          <span className="text-[11px] font-medium text-astraeus-success uppercase tracking-wider" style={{ color: healthColor.includes('red') ? '#ef4444' : (healthColor.includes('warning') ? '#f59e0b' : '#22c55e') }}>{healthStatus}</span>
        </div>
        
        <div className="h-6 w-px bg-astraeus-border mx-1"></div>
        
        <button className="relative p-2 text-astraeus-textMuted hover:text-astraeus-text hover:bg-astraeus-bg rounded transition-colors group">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-astraeus-warning rounded-full shadow-[0_0_6px_rgba(245,158,11,0.8)]"></span>
        </button>
        
        <button 
          onClick={async () => {
            try {
              const res = await fetch('/api/export/changes/latest?format=geojson');
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(`Export failed: ${err.detail || res.statusText}`);
                return;
              }
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;

              const contentDisposition = res.headers.get('Content-Disposition');
              let filename = 'astraeus_export_latest.geojson';
              if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) filename = match[1];
              }
              link.setAttribute('download', filename);
              document.body.appendChild(link);
              link.click();
              link.parentNode?.removeChild(link);
              window.URL.revokeObjectURL(url);
            } catch (e) {
              console.error(e);
              alert('Export failed due to network error.');
            }
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-astraeus-bg border border-astraeus-border rounded hover:border-astraeus-primary transition-all text-astraeus-text text-xs tracking-wide uppercase group hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
        >
          <Download className="w-3.5 h-3.5 text-astraeus-textMuted group-hover:text-astraeus-primary transition-colors" />
          Export
        </button>

        <button className="w-8 h-8 bg-astraeus-bg border border-astraeus-border rounded-full flex items-center justify-center hover:border-astraeus-primary transition-all overflow-hidden">
          <User className="w-4 h-4 text-astraeus-textMuted" />
        </button>
      </div>
    </header>
  )
}

export default Header
