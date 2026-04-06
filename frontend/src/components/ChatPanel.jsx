import { useState, useEffect} from 'react'
import { socket } from '../game/socket'

export default function ChatPanel({ roomId, roomMembers, messages, setMessages, gameRef }) {
  const [input, setInput] = useState('')

  const nameOf = (id) => {
    const member = roomMembers.find(m => m.id === id)
    return member?.name ?? id.slice(0, 6)
  }

  // ── Listen for incoming messages ──────────────────────────────────────────
  useEffect(() => {
    const handler = ({ fromId, fromName, message, roomId: msgRoomId, ts }) => {
      if (fromId === socket.id) return // already added optimistically
      setMessages(prev => {
        const roomMsgs = prev[msgRoomId] ?? []
        return {
          ...prev,
          [msgRoomId]: [...roomMsgs, { fromId, fromName, message, mine: false, ts }],
        }
      })
    }
    socket.on('receive-message', handler)
    return () => socket.off('receive-message', handler)
  }, [])

  // ── Request history when roomId changes ───────────────────────────────────
  useEffect(() => {
    if (!roomId) return
    setMessages(prev => {
      if (prev[roomId]) return prev
      socket.emit('request-history', { roomId })
      return prev
    })
  }, [roomId])

  // ── Receive history from server ───────────────────────────────────────────
  useEffect(() => {
    const handler = ({ roomId: rId, messages: history }) => {
      setMessages(prev => ({
        ...prev,
        [rId]: history.map(m => ({
          ...m,
          mine: m.fromId === socket.id,
        })),
      }))
    }
    socket.on('room-history', handler)
    return () => socket.off('room-history', handler)
  }, [])

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendMessage = () => {
    if (!input.trim() || !roomId) return

    const ts = Date.now()
    socket.emit('send-message', { message: input })

    setMessages(prev => ({
      ...prev,
      [roomId]: [
        ...(prev[roomId] ?? []),
        { fromId: socket.id, fromName: 'You', message: input, mine: true, ts },
      ],
    }))

    setInput('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') sendMessage()
  }

  const roomMsgs = roomId ? (messages[roomId] ?? []) : []

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={[
        'bg-[#1e1e2e] border-l border-[#2a2a3a] flex flex-col flex-shrink-0',
        'transition-all duration-500 ease-in-out overflow-hidden',
        roomId ? 'w-72 opacity-100' : 'w-0 opacity-0 pointer-events-none',
      ].join(' ')}
    >
      <div className="w-72 flex flex-col h-full">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a3a]">
          <div className="flex flex-col">
            <span className="text-white text-sm font-semibold">Chat</span>
            {roomId && (
              <span className="text-[#555] text-[10px] font-mono mt-0.5">
                #{roomId.slice(-6)} · {roomMembers.length} member{roomMembers.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="w-5 h-5 bg-[#2a2a3a] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#3a3a4a] transition">
            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 stroke-[#aaa] fill-none" strokeWidth="1.4">
              <path d="M8 2L2 8M2 2l6 6" />
            </svg>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

          {/* Intro */}
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-full bg-indigo-900 flex-shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full">
                <circle cx="18" cy="18" r="18" fill="#312e81" />
                <circle cx="18" cy="14" r="7" fill="#a78bfa" />
                <ellipse cx="18" cy="30" rx="11" ry="8" fill="#312e81" />
              </svg>
            </div>
            <div>
              {roomId ? (
                <>
                  <p className="text-[#e2e8f0] text-[13px] font-medium leading-snug">
                    Room with{' '}
                    {roomMembers
                      .filter(m => m.id !== socket.id)
                      .map(m => (
                        <span key={m.id} className="text-indigo-400">@{m.name} </span>
                      ))}
                  </p>
                  <p className="text-[#475569] text-[11px] mt-0.5">
                    {roomMembers.length} people in range — messages are shared
                  </p>
                </>
              ) : (
                <p className="text-[#555] text-[13px] font-medium leading-snug">
                  Walk near someone to start chatting
                </p>
              )}
            </div>
          </div>

          {/* Member pills */}
          {roomId && roomMembers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {roomMembers.map(m => (
                <span
                  key={m.id}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono
                    ${m.id === socket.id
                      ? 'bg-indigo-700 text-indigo-200'
                      : 'bg-[#2a2a3a] text-[#aaa]'
                    }`}
                >
                  {m.id === socket.id ? 'You' : `@${m.name}`}
                </span>
              ))}
            </div>
          )}

          {roomMsgs.map((msg, i) => (
            <div key={i} className={`flex gap-2 items-end ${msg.mine ? 'flex-row-reverse' : ''}`}>
              <div className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="12" fill={msg.mine ? '#4a3a8a' : '#1e3a5f'} />
                  <circle cx="12" cy="9" r="5" fill={msg.mine ? '#a78bfa' : '#60a5fa'} />
                  <ellipse cx="12" cy="20" rx="7" ry="5" fill={msg.mine ? '#4a3a8a' : '#1e3a5f'} />
                </svg>
              </div>

              <div className="flex flex-col gap-0.5 max-w-[72%]">
                {!msg.mine && (
                  <span className="text-[9px] text-[#555] font-mono px-1">
                    @{msg.fromName ?? nameOf(msg.fromId)}
                  </span>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl text-xs break-words leading-relaxed
                    ${msg.mine
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-[#2a2a3e] text-[#e2e8f0] rounded-bl-sm'
                    }`}
                >
                  {msg.message}
                </div>
              </div>
            </div>
          ))}

          {roomMsgs.length === 0 && roomId && (
            <p className="text-center text-[#475569] text-xs mt-2">Say hello! 👋</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 pb-3 border-t border-[#2a2a3a] pt-2.5">
          <div className="flex items-center gap-2 bg-[#2a2a3a] rounded-lg px-3 py-1.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => gameRef.current?.setTypingState(true)}
              onBlur={() => gameRef.current?.setTypingState(false)}
              onKeyDown={handleKey}
              placeholder={roomId ? 'Message the room...' : 'No one nearby...'}
              disabled={!roomId}
              className="flex-1 bg-transparent border-none outline-none text-[#ccc] text-xs placeholder-[#555] disabled:opacity-40"
            />
            <button
              onClick={sendMessage}
              disabled={!roomId}
              className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center cursor-pointer hover:bg-indigo-500 transition disabled:opacity-30 disabled:cursor-not-allowed border-none"
            >
              <svg viewBox="0 0 14 14" className="w-3 h-3 stroke-white fill-none" strokeWidth="1.4">
                <path d="M12 7H2M12 7L7.5 2.5M12 7L7.5 11.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-0.5 mt-2 px-0.5">
            {[
              <><circle cx="6" cy="6" r="5" /><path d="M4 7.5s.5 1 2 1 2-1 2-1M4.5 4.5h.01M7.5 4.5h.01" strokeLinecap="round" /></>,
              <path d="M2 9.5V2.5l3.5 3.5L9 2.5v7" strokeLinecap="round" strokeLinejoin="round" />,
              <path d="M2 6h8M2 3h8M2 9h5" strokeLinecap="round" />,
            ].map((icon, i) => (
              <div key={i} className="w-6 h-6 flex items-center justify-center cursor-pointer rounded hover:bg-[#2a2a3a] transition">
                <svg viewBox="0 0 12 12" className="w-3 h-3 stroke-[#555] fill-none" strokeWidth="1.2">{icon}</svg>
              </div>
            ))}
            {['B', 'I'].map((t) => (
              <div key={t} className={`w-6 h-6 flex items-center justify-center cursor-pointer rounded hover:bg-[#2a2a3a] transition text-[11px] text-[#555] ${t === 'B' ? 'font-bold' : 'italic'}`}>{t}</div>
            ))}
            <div className="w-6 h-6 flex items-center justify-center cursor-pointer rounded hover:bg-[#2a2a3a] transition">
              <svg viewBox="0 0 12 12" className="w-3 h-3 stroke-[#555] fill-none" strokeWidth="1.2">
                <path d="M1 6h3l2-4 2 8 2-4h2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}