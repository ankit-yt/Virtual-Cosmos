# 🌐 Virtual Cosmos — Proximity-Based Virtual Office

A real-time multiplayer virtual office where your chat room is determined by **physical proximity** — walk near someone and you're automatically in the same room. Walk away and you leave.

Built with **React**, **PixiJS**, **Socket.IO**, and **Node.js**.

---

## ✨ Features

- 🗺️ **2D office world** rendered with PixiJS — open desks, private rooms, lounge areas, discussion clusters
- 🚶 **Proximity-based chat rooms** — rooms form and dissolve dynamically as players move
- 💬 **Real-time messaging** with persistent room history
- 🏷️ **Named avatars** — set your display name on entry
- 🔄 **Live player count** and room membership updates
- 🎮 **WASD / arrow key** movement with smooth camera follow
- 🔍 **Ctrl + scroll** to zoom in/out

---

## 🛠️ Tech Stack

| Layer    | Technology                             |
|----------|----------------------------------------|
| Frontend | React + Vite + Tailwind CSS            |
| Renderer | PixiJS v8                              |
| Realtime | Socket.IO                              |
| Backend  | Node.js + Express + Socket.IO (server) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### 1. Clone the repo

```bash
git clone https://github.com/your-username/virtual-cosmos.git
cd virtual-cosmos
```

### 2. Start the server

```bash
cd backend
npm install
node index.js
```

> Server runs on `http://localhost:3001`

### 3. Configure environment

In the `frontend/` folder, create a `.env` file:

```env
VITE_SERVER_URL=http://YOUR_LOCAL_IP:3001
```

> Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find your local IP.
> This lets other devices on the same network join your space.

### 4. Start the client

```bash
cd frontend
npm install
npm run dev
```

> App runs on `http://localhost:5173`

---

## 🗂️ Project Structure

```
virtual-cosmos/
│
├── backend/
│   ├── index.js                 # Socket.IO server, room logic, proximity engine
│   ├── package.json
│   └── package-lock.json
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   │   ├── ChatPanel.jsx    # Sliding chat panel with message history
    │   │   └── EnterScreen.jsx  # Name entry splash screen
    │   ├── game/
    │   │   ├── PixiGame.js      # PixiJS world, avatar rendering, game loop
    │   │   └── socket.js        # Socket.IO client instance
    │   ├── App.jsx              # Root component, layout, socket room listener
    │   ├── App.css
    │   ├── index.css
    │   └── main.jsx
    ├── index.html
    ├── .gitignore
    ├── eslint.config.js
    ├── package.json
    └── package-lock.json
```

---

## ⚙️ How Proximity Rooms Work

The server runs a proximity graph every time any player moves:

1. Calculates pairwise distances between all connected players
2. Builds a connected-components graph (proximity radius: **150px**)
3. Players in the same component are assigned a shared chat room
4. Rooms form and dissolve automatically as players move
5. Room IDs are reused when membership is stable — chat history survives brief movement

---

## 🎮 Controls

| Action       | Keys                  |
|--------------|-----------------------|
| Move         | `WASD` or `↑ ↓ ← →`  |
| Zoom         | `Ctrl` + scroll wheel |
| Send message | `Enter`               |

---

## 📦 Environment Variables

| Variable          | Description               | Default                 |
|-------------------|---------------------------|-------------------------|
| `VITE_SERVER_URL` | WebSocket server address  | `http://localhost:3001` |

---

## 📄 License

MIT