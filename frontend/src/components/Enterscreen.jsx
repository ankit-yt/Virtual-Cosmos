import { useState, useRef, useEffect } from 'react'

export default function EnterScreen({ onEnter }) {
  const [name, setName]       = useState('')
  const [shake, setShake]     = useState(false)
  const [focused, setFocused] = useState(false)
  const [ready, setReady]     = useState(false)  
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setShake(true)
      setTimeout(() => setShake(false), 600)
      inputRef.current?.focus()
      return
    }
    setReady(true)
    setTimeout(() => onEnter(trimmed), 600)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div
      className={`
        w-screen h-screen bg-[#0d0d1a] flex items-center justify-center
        transition-all duration-500 ease-in-out
        ${ready ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}
      `}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-900/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-900/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-950/40 rounded-full blur-3xl" />
      </div>

      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #4f46e5 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm px-6">

        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/60">
            <svg viewBox="0 0 32 32" className="w-9 h-9 fill-white">
              <circle cx="16" cy="16" r="13" fill="none" stroke="white" strokeWidth="2" />
              <ellipse cx="16" cy="16" rx="6" ry="13" fill="none" stroke="white" strokeWidth="1.5" />
              <path d="M4 16h24M5 10h22M5 22h22" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-white text-2xl font-bold tracking-tight">My Space</h1>
            <p className="text-[#555] text-sm mt-1">A virtual office for your team</p>
          </div>
        </div>

        <div className="w-full bg-[#13131f] border border-[#1e1e2e] rounded-2xl p-6 shadow-2xl shadow-black/50 flex flex-col gap-5">

          <div>
            <p className="text-[#aaa] text-sm font-medium mb-1">What should we call you?</p>
            <p className="text-[#444] text-xs">Your name will be shown above your avatar</p>
          </div>

          <div
            className={`
              flex items-center gap-3 bg-[#0d0d1a] border rounded-xl px-4 py-3
              transition-all duration-200
              ${focused ? 'border-indigo-500 shadow-md shadow-indigo-900/40' : 'border-[#2a2a3a]'}
              ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}
            `}
            style={shake ? { animation: 'shake 0.5s ease-in-out' } : {}}
          >
            {/* Avatar preview dot */}
            <div className="w-7 h-7 flex-shrink-0">
              <svg viewBox="0 0 28 28">
                <circle cx="14" cy="14" r="14" fill="#4a3a8a" />
                <circle cx="14" cy="11" r="5.5" fill="#a78bfa" />
                <ellipse cx="14" cy="22" rx="8" ry="5" fill="#4a3a8a" />
                {/* "You" dot */}
                <circle cx="22" cy="5" r="4" fill="#22c55e" />
                <circle cx="22" cy="5" r="1.8" fill="white" />
              </svg>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKey}
              placeholder="Enter your name…"
              maxLength={20}
              className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder-[#333] font-medium"
            />

            <span className="text-[10px] text-[#333] font-mono flex-shrink-0">
              {name.length}/20
            </span>
          </div>

          <p
            className={`text-xs text-red-400/80 -mt-2 transition-all duration-200 ${
              shake ? 'opacity-100' : 'opacity-0'
            }`}
          >
            ✦ Name is required to enter
          </p>

          <button
            onClick={handleSubmit}
            disabled={ready}
            className={`
              w-full py-3 rounded-xl font-semibold text-sm
              transition-all duration-200 border-none cursor-pointer
              flex items-center justify-center gap-2
              ${name.trim()
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 hover:shadow-indigo-800/60 active:scale-95'
                : 'bg-[#1e1e2e] text-[#444] cursor-not-allowed'
              }
            `}
          >
            <span>Enter Space</span>
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
              <path d="M8 2l6 6-6 6M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
        </div>

        <p className="text-[#333] text-xs text-center">
          Walk near others to start chatting · Use{' '}
          <kbd className="bg-[#1a1a2e] border border-[#2a2a3a] rounded px-1 text-[#555]">WASD</kbd>
          {' '}or arrow keys to move
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-6px); }
          30%       { transform: translateX(6px); }
          45%       { transform: translateX(-4px); }
          60%       { transform: translateX(4px); }
          75%       { transform: translateX(-2px); }
          90%       { transform: translateX(2px); }
        }
      `}</style>
    </div>
  )
}