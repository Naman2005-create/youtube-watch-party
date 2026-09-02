# YouTube Watch Party

A real-time YouTube Watch Party web application where multiple users can watch YouTube videos together in sync.

## 🔴 Live Demo

> **Deployed URL**: https://watch-party-client-s2p1.onrender.com

---

## ✨ Features

- **Real-time sync** – Play, pause, seek, and change video for all participants instantly via WebSockets
- **Room-based** – Create or join rooms with unique codes; share via link
- **Role-based access** – Host, Moderator, Participant roles with different permissions
- **Host controls** – Assign roles, remove participants, transfer host
- **Live chat** – Chat with everyone in the room
- **YouTube IFrame API** – Smooth embedded player with latency correction

---

## 🏗 Architecture Overview

```
Browser (React + Vite)
    │
    │  YouTube IFrame API (embedded player)
    │  Socket.IO client (WebSocket)
    │
    ▼
Express + Socket.IO Server (Node.js)
    │
    ├── Room class       – room state, participants, broadcast methods
    ├── Participant class – user model with role + permission checks
    └── MessageHandler   – event routing + role-based access control
```

### How WebSockets enable real-time sync

1. Client connects via `socket.io-client` (WebSocket transport).
2. On `join_room`, server adds the user to a Socket.IO room (channel).
3. When a Host/Moderator presses **Play**, the client emits `play` → server validates the role → calls `room.broadcast('sync_state', state)` → every client's `sync_state` listener fires → `YoutubePlayer` applies the new state.
4. Latency correction: `sync_state` includes `updatedAt` (server timestamp); client calculates elapsed ms and adds it to `currentTime` before seeking, so everyone lands at the right position.

### Role-based logic (backend)

```
MessageHandler.handlePlay(socket, data)
  → getSenderParticipant(socket, roomId)  ← finds Participant by socketId
  → participant.canControl()              ← returns true only for host/moderator
  → if false → socket.emit('error', ...)
  → if true  → room.updateVideoState() → room.broadcast('sync_state')
```

---

## 🚀 Local Setup

### Prerequisites
- Node.js 18+
- npm

### 1. Clone and install

```bash
git clone <your-repo-url>
cd youtube-watch-party

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Run the server

```bash
cd server
npm run dev
# Runs on http://localhost:3001
```

### 3. Run the client

```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

### 4. Open the app

Go to [http://localhost:5173](http://localhost:5173)  
Create a room → copy the room code → open another tab → join with the same code.

---

## 🌐 Deployment (Render)

### Backend

1. Create a new **Web Service** on [Render](https://render.com)
2. Root directory: `server`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add environment variable:
   - `CLIENT_ORIGIN` = `https://your-client.onrender.com`

### Frontend

1. Create a new **Static Site** on Render
2. Root directory: `client`
3. Build command: `npm install && npm run build`
4. Publish directory: `dist`
5. Add environment variable:
   - `VITE_SERVER_URL` = `https://your-server.onrender.com`

---

## 📡 WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_room` | C→S | Join or create a room |
| `leave_room` | C→S | Leave room |
| `play` | C→S | Host/Mod: play video |
| `pause` | C→S | Host/Mod: pause video |
| `seek` | C→S | Host/Mod: seek to time |
| `change_video` | C→S | Host/Mod: change YouTube video |
| `assign_role` | C→S | Host: assign role to participant |
| `remove_participant` | C→S | Host: remove user from room |
| `chat_message` | C↔S | Chat message |
| `sync_state` | S→C | Broadcast video state to all |
| `user_joined` | S→C | New participant joined |
| `user_left` | S→C | Participant left |
| `role_assigned` | S→C | Role change broadcast |
| `participant_removed` | S→C | Participant removed by host |
| `kicked` | S→C | You were removed |

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + Express |
| WebSocket | Socket.IO v4 |
| Database | In-memory (Map) — no DB needed for MVP |
| Video | YouTube IFrame API |
| Deploy | Render |

---

## 🏛 OOP Design (Bonus)

- **`Participant`** — encapsulates `id`, `username`, `socketId`, `role`; exposes `canControl()`, `isHost()`, `toJSON()`
- **`Room`** — manages a `Map<userId, Participant>` and `VideoState`; provides `broadcast()`, `broadcastExcept()`, `addParticipant()`, `removeParticipant()`, `setRole()`, `getState()`
- **`MessageHandler`** — registers all Socket.IO event listeners, validates roles before acting, delegates state changes to `Room`
