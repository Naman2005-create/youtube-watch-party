// Socket.IO client singleton – import this everywhere instead of creating new instances
import { io, Socket } from 'socket.io-client';

const isProd = window.location.hostname.includes('onrender.com');
const SERVER_URL = import.meta.env.VITE_SERVER_URL || (isProd ? 'https://watch-party-server-hn6k.onrender.com' : 'http://localhost:3001');

const socket: Socket = io(SERVER_URL, {
  autoConnect: false,  // connect manually after we have user info
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'],
});

export default socket;
