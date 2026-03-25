import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, BrainCircuit, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Components } from 'react-markdown'
import Plot from 'react-plotly.js'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const INITIAL_MESSAGE: Message = {
  id: 'sys-0',
  role: 'assistant',
  content: "Welcome to Project Astraeus **Intelligence Mode**. I am directly connected to the OpenStreetMap physical planetary archive. Ask me about detected anomalies, deforestation metrics, or construction statistics for cities like Mumbai, Delhi, or Bangalore!"
}


const renderers: Components = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    if (!inline && match && match[1] === 'json') {
      try {
        const text = String(children);
        const parsed = JSON.parse(text);
        if (parsed.plot) {
          return (
            <div className="w-full h-80 my-6 p-1 bg-[#050608] border border-astraeus-border/50 rounded shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden">
              <Plot 
                data={parsed.data} 
                layout={{ ...parsed.layout, autosize: true }} 
                useResizeHandler 
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false, responsive: true }}
              />
            </div>
          );
        }
      } catch (e) {
        // Fallback parsing failed
      }
    }
    return (
      <code className={`${className} bg-black/50 border border-white/10 px-1.5 py-0.5 rounded text-astraeus-primary font-mono text-xs`} {...props}>
        {children}
      </code>
    );
  },
  ul({ children }) {
    return <ul className="list-disc ml-6 my-3 text-sm text-astraeus-textMuted space-y-1.5">{children}</ul>
  },
  p({ children }) {
    return <p className="my-3 text-sm leading-relaxed text-astraeus-text/90 tracking-wide">{children}</p>
  },
  strong({ children }) {
    return <strong className="text-white font-medium bg-white/5 px-1 rounded">{children}</strong>
  },
  h3({ children }) {
    return <h3 className="text-lg font-semibold text-astraeus-text tracking-wide mt-6 mb-2">{children}</h3>
  }
};


const ChatbotInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleSend = async () => {
    if (!input.trim()) return
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    const query = input
    setInput('')
    setIsTyping(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query })
      });
      const data = await res.json();
      
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply }
      setMessages(prev => [...prev, aiMsg])
    } catch(e) {
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: "Failed to connect to the planetary registry. Try again." }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#0B0F14]/95 backdrop-blur-xl">
      {/* Header */}
      <div className="h-14 border-b border-astraeus-border/50 flex items-center px-6 shrink-0 bg-astraeus-panel/50">
        <div className="flex items-center gap-3">
          <BrainCircuit className="w-5 h-5 text-astraeus-primary animate-pulse" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#e2e8f0]">Astraeus Intelligence Matrix</h2>
        </div>
      </div>

      {/* Scroller Canvas */}
      <div className="flex-1 overflow-y-auto p-6 md:px-24 max-w-5xl mx-auto w-full space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded shrink-0 bg-astraeus-primary/20 border border-astraeus-primary/50 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                <Bot className="w-4 h-4 text-astraeus-primary" />
              </div>
            )}

            <div className={`max-w-[85%] rounded break-words ${msg.role === 'user' ? 'bg-astraeus-primary/10 border border-astraeus-primary/30 p-4 text-sm text-white' : ''}`}>
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <div className="prose prose-invert prose-p:my-0">
                  <ReactMarkdown components={renderers}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded shrink-0 bg-white/5 border border-white/10 flex items-center justify-center">
                <User className="w-4 h-4 text-astraeus-textMuted" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded shrink-0 bg-astraeus-primary/10 border border-astraeus-primary/20 flex items-center justify-center">
               <Loader2 className="w-4 h-4 text-astraeus-primary animate-spin" />
            </div>
            <div className="flex items-center text-xs text-astraeus-textMuted tracking-widest uppercase">
               Processing Geospatial Streams...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Frame */}
      <div className="p-6 md:px-24 shrink-0 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3 px-4 py-3 bg-[#050608] border border-astraeus-border rounded-lg shadow-inner focus-within:border-astraeus-primary/50 focus-within:ring-1 focus-within:ring-astraeus-primary/30 group">
           <input
             type="text"
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             placeholder="Ask a question about the satellite telemetry..."
             className="flex-1 bg-transparent border-none outline-none text-sm text-astraeus-text placeholder-astraeus-textMuted tracking-wide"
             disabled={isTyping}
           />
           <button 
             onClick={handleSend}
             disabled={isTyping || !input.trim()}
             className="p-1.5 bg-astraeus-primary/20 text-astraeus-primary rounded border border-astraeus-primary/50 hover:bg-astraeus-primary hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-transparent"
           >
             <Send className="w-4 h-4 ml-0.5" />
           </button>
        </div>
        <div className="text-center mt-3 text-[10px] text-astraeus-textMuted tracking-widest uppercase opacity-50">
           Astraeus AI interprets visual patterns and compiles historical OSM data sets. Visualizations use Plotly Native.
        </div>
      </div>
    </div>
  )
}

export default ChatbotInterface
