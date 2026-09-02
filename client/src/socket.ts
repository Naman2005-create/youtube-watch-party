// Socket.IO client singleton – import this everywhere instead of creating new instances
import { io, Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const socket: Socket = io(SERVER_URL, {
  autoConnect: false,  // connect manually after we have user info
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'],
});

export default socket;
