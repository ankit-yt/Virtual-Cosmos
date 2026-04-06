import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))

const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5174', 'http://192.168.29.104:5173', 'http://localhost:5173'],
  },
})

const users = {}
const rooms = {}
const PROXIMITY_RADIUS = 150

function generateRoomId() {
  return 'room_' + Math.random().toString(36).slice(2, 8)
}

function recalculateRooms() {
  const ids = Object.keys(users)

  const adjacent = {}
  ids.forEach(id => (adjacent[id] = new Set()))
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = users[ids[i]], b = users[ids[j]]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (dist <= PROXIMITY_RADIUS) {
        adjacent[ids[i]].add(ids[j])
        adjacent[ids[j]].add(ids[i])
      }
    }
  }

  const visited = new Set()
  const components = []

  ids.forEach(startId => {
    if (visited.has(startId)) return
    const component = new Set()
    const queue = [startId]
    while (queue.length) {
      const cur = queue.shift()
      if (visited.has(cur)) continue
      visited.add(cur)
      component.add(cur)
      adjacent[cur].forEach(nbr => {
        if (!visited.has(nbr)) queue.push(nbr)
      })
    }
    components.push(component)
  })

  const oldRoomOf = {}
  ids.forEach(id => { if (users[id].roomId) oldRoomOf[id] = users[id].roomId })

  const newRoomAssignments = {}

  components.forEach(members => {
    if (members.size === 1) {
      const [id] = members
      newRoomAssignments[id] = null
      return
    }

    let chosenRoomId = null
    for (const id of members) {
      if (oldRoomOf[id] && rooms[oldRoomOf[id]]) {
        chosenRoomId = oldRoomOf[id]
        break
      }
    }

    if (!chosenRoomId) {
      chosenRoomId = generateRoomId()
      rooms[chosenRoomId] = { members: new Set(), messages: [] }
    }

    members.forEach(id => {
      newRoomAssignments[id] = chosenRoomId
    })
  })

  ids.forEach(id => {
    const oldRoom = users[id].roomId
    const newRoom = newRoomAssignments[id] ?? null

    if (oldRoom === newRoom) return

    if (oldRoom) io.sockets.sockets.get(id)?.leave(oldRoom)

    if (newRoom) {
      io.sockets.sockets.get(id)?.join(newRoom)
      if (!rooms[newRoom]) rooms[newRoom] = { members: new Set(), messages: [] }
      rooms[newRoom].members.add(id)
    }

    users[id].roomId = newRoom
  })

  const activeRooms = new Set(Object.values(users).map(u => u.roomId).filter(Boolean))
  Object.keys(rooms).forEach(rId => {
    if (!activeRooms.has(rId)) {
      rooms[rId].members = new Set()
    } else {
      rooms[rId].members = new Set(
        Object.values(users).filter(u => u.roomId === rId).map(u => u.id)
      )
    }
  })
}

function broadcastRoomUpdates() {
  Object.values(users).forEach(user => {
    const roomId = user.roomId
    // Send { id, name } objects instead of bare socket IDs
    const members = roomId
      ? Array.from(rooms[roomId]?.members ?? []).map(id => ({
          id,
          name: users[id]?.name ?? id.slice(0, 6),
        }))
      : []

    io.to(user.id).emit('room-update', { roomId, members })
  })
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  users[socket.id] = { id: socket.id, x: 300, y: 300, roomId: null, name: 'Guest' }
  io.emit('players-update', users)

  socket.on('set-name', ({ name }) => {
    if (!users[socket.id]) return
    users[socket.id].name = String(name).trim().slice(0, 20) || 'Guest'
    io.emit('players-update', users)
  })

  socket.on('position-update', ({ x, y }) => {
    if (!users[socket.id]) return
    users[socket.id].x = x
    users[socket.id].y = y
    recalculateRooms()
    io.emit('players-update', users)
    broadcastRoomUpdates()
  })

  socket.on('send-message', ({ message }) => {
    const sender = users[socket.id]
    if (!sender || !sender.roomId) return

    const roomId = sender.roomId
    // Store name snapshot at send time so history shows correct name
    const payload = {
      fromId: socket.id,
      fromName: sender.name,
      message,
      roomId,
      ts: Date.now(),
    }

    rooms[roomId].messages.push(payload)
    io.to(roomId).emit('receive-message', payload)
  })

  socket.on('request-history', ({ roomId }) => {
    if (rooms[roomId]) {
      socket.emit('room-history', { roomId, messages: rooms[roomId].messages })
    }
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
    delete users[socket.id]
    recalculateRooms()
    io.emit('players-update', users)
    broadcastRoomUpdates()
  })
})

server.listen(3001, () => console.log('Server running on :3001'))