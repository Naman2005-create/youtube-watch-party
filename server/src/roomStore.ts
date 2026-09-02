// In-memory store for all active rooms
// Simple Map – rooms are cleaned up when they become empty
import { Room } from './classes/Room';

const roomStore: Map<string, Room> = new Map();

export default roomStore;
