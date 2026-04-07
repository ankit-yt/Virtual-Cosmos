# 🌐 Virtual Cosmos — Proximity-Based Virtual Office

A real-time multiplayer virtual office where your chat room is determined by **physical proximity** — walk near someone and you're automatically in the same room. Walk away and you leave.

Built with **React**, **PixiJS**, **Socket.IO**, and **Node.js**.

🔗 **Live Demo:** [my-space-beta.vercel.app](https://my-space-beta.vercel.app)

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

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React + Vite + Tailwind CSS             |
| Renderer   | PixiJS v8                               |
| Realtime   | Socket.IO                               |
| Backend    | Node.js + Express + Socket.IO           |
| Deployment | Vercel (frontend) + Render (backend)    |

---

## 🌍 Deployment

| Service  | URL                                                              |
|----------|------------------------------------------------------------------|
| Frontend | [my-space-beta.vercel.app](https://my-space-beta.vercel.app)    |
| Backend  | [myspace-bvnn.onrender.com](https://myspace-bvnn.onrender.com)  |

---

## 🚀 Getting Started (Local)

### Prerequisites

- Node.js 18+
- npm

### 1. Clone the repo

```bash
git clone https://github.com/your-username/virtual-cosmos.git
cd virtual-cosmos
```

### 2. Setup & run the backend

```bash
cd backend
npm install
npm run dev
```

> Server runs on `http://localhost:3001`

Create a `.env` file inside `backend/`:

```env
FRONTED_URL=http://localhost:5173
```

### 3. Setup & run the frontend

```bash
cd frontend
npm install
npm run dev
```

> App runs on `http://localhost:5173`

Create a `.env` file inside `frontend/`:

```env
VITE_BACKEND_URL=http://localhost:3001
```

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

### Frontend (`frontend/.env`)

| Variable           | Description               | Example                             |
|--------------------|---------------------------|-------------------------------------|
| `VITE_BACKEND_URL` | Backend WebSocket server  | `https://myspace-bvnn.onrender.com` |

### Backend (`backend/.env`)

| Variable      | Description              | Example                              |
|---------------|--------------------------|--------------------------------------|
| `FRONTED_URL` | Allowed frontend origin  | `https://my-space-beta.vercel.app`   |

---

## 📄 License

MIT