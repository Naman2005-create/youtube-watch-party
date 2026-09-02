// ─────────────────────────────────────────────
//  Entry point – Express HTTP + Socket.IO server
// ─────────────────────────────────────────────
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import roomStore from './roomStore';
import { MessageHandler } from './classes/MessageHandler';

const app = express();
const httpServer = http.createServer(app);

// ── CORS configuration ───────────────────────
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

// ── Health check endpoint ────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: roomStore.size });
});

// ── Socket.IO setup ──────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const messageHandler = new MessageHandler(io, roomStore);

io.on('connection', (socket) => {
  console.log(`[CONNECT] socket ${socket.id}`);
  messageHandler.register(socket);

  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] socket ${socket.id}`);
  });
});

// ── Start listening ──────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, () => {
  console.log(`✅  Watch Party server running on port ${PORT}`);
  console.log(`   Accepting connections from: ${CLIENT_ORIGIN}`);
});
