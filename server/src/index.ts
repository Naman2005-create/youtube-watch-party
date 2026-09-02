import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import roomStore from './roomStore';
import { MessageHandler } from './classes/MessageHandler';

const app = express();
const httpServer = createServer(app);

// Allow both localhost (dev) and the live Render frontend (prod)
const allowedOrigins = [
  'http://localhost:5173',
  'https://watch-party-client-s2p1.onrender.com',
];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: roomStore.size });
});

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const messageHandler = new MessageHandler(io, roomStore);

io.on('connection', (socket) => {
  console.log('[CONNECT] socket ' + socket.id);
  messageHandler.register(socket);

  socket.on('disconnect', () => {
    console.log('[DISCONNECT] socket ' + socket.id);
  });
});

const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
