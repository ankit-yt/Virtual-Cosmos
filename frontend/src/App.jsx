import React from 'react'
import { PixiGame } from './game/PixiGame'
import ChatPanel from './components/ChatPanel'
import EnterScreen from './components/Enterscreen'
import { useRef, useState, useEffect } from 'react'
import { socket } from './game/socket'

function App() {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)

  const [playerName, setPlayerName]   = useState(null)   // null = not entered yet
  const [roomId, setRoomId]           = useState(null)
  const [roomMembers, setRoomMembers] = useState([])
  const [messages, setMessages]       = useState({})
  const [onlineCount, setOnlineCount] = useState(1)

  // ── Room updates from server ────────────────────────────────────────────
  useEffect(() => {
    const handler = ({ roomId: rId, members }) => {
      setRoomId(rId)
      setRoomMembers(members)
    }
    socket.on('room-update', handler)
    return () => socket.off('room-update', handler)
  }, [])

  // ── Boot game only after name is set ──────────────────────────────────────
  useEffect(() => {
    if (!playerName || !canvasRef.current) return

    // Tell the server our display name
    socket.emit('set-name', { name: playerName })

    gameRef.current = new PixiGame(
      canvasRef.current,
      playerName,
      () => {},
      (count) => setOnlineCount(count)
    )

    return () => gameRef.current?.destroy()
  }, [playerName])

  return (
    <div className='h-screen w-screen overflow-hidden'>
      {/* ── Entrance gate ── */}
      {!playerName && (
        <EnterScreen onEnter={(name) => setPlayerName(name)} />
      )}

      {/* ── Main game UI (always mounted so canvas ref is ready, but hidden until name set) ── */}
 {playerName && (
      <div
        className={`w-screen h-screen overflow-hidden flex flex-col bg-[#111] font-sans
          transition-opacity duration-500
          ${playerName ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >

      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 h-11 bg-[#111] border-b border-[#2a2a2a] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-white">
              <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 2a4 4 0 110 8A4 4 0 018 4zm0 1.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />
            </svg>
          </div>
          <span className="text-[#ccc] text-sm font-medium">Virtual Cosmos</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#2a2a3a] text-[#aaa] text-xs px-3 py-1.5 rounded-full border border-[#3a3a4a]">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            <span>{onlineCount} online</span>
          </div>
          
        </div>
      </div>

      {/* MAIN */}
      <div className="flex flex-1 overflow-hidden">

        {/* GAME CANVAS */}
        <div className="relative flex-1 overflow-hidden">
          <div ref={canvasRef} className="w-full h-full" />

          {/* Chat hidden indicator tab — peeks from right edge when no room */}
          <div
            className={`absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1
              bg-[#1e1e2e] border border-[#2a2a3a] border-r-0 rounded-l-lg px-1.5 py-3
              transition-all duration-500 ease-in-out
              ${roomId ? 'opacity-0 pointer-events-none translate-x-4' : 'opacity-100 translate-x-0'}`}
          >
            <svg viewBox="0 0 14 14" className="w-3 h-3 stroke-[#555] fill-none" strokeWidth="1.4">
              <path d="M9 2H5a2 2 0 00-2 2v6a2 2 0 002 2h4l3-2V4a2 2 0 00-2-2z" strokeLinejoin="round" />
            </svg>
            <span
              style={{ writingMode: 'vertical-rl' }}
              className="text-[9px] text-[#444] font-mono tracking-widest"
            >
              CHAT
            </span>
          </div>

          {/* Controls hint */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/50 text-[#ccc] text-xs px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-none whitespace-nowrap">
            🕹 Use{' '}
            <kbd className="bg-white/15 rounded px-1">WASD</kbd>
            {' '}or{' '}
            <kbd className="bg-white/15 rounded px-1">↑↓←→</kbd>
            {' '}to move
          </div>

          {/* Near badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 text-[#ccc] text-xs px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-none">
            <div className={`w-1.5 h-1.5 rounded-full ${roomId ? 'bg-green-400 animate-pulse' : 'bg-[#555]'}`} />
            <span>
              {roomId
                ? `Room · ${roomMembers.length} member${roomMembers.length !== 1 ? 's' : ''}`
                : 'No one nearby'}
            </span>
          </div>
        </div>

        {/* CHAT PANEL */}
        <ChatPanel
          roomId={roomId}
          roomMembers={roomMembers}
          messages={messages}
          setMessages={setMessages}
          gameRef={gameRef}
        />
      </div>

      {/* BOTTOM BAR */}
     
    </div>
 )}
    </div>
  )
}

export default App