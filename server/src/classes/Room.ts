// ─────────────────────────────────────────────
//  Room – encapsulates room state and participants
// ─────────────────────────────────────────────
import { Server } from 'socket.io';
import { Participant, Role } from './Participant';

export interface VideoState {
  videoId: string;
  currentTime: number;
  playState: 'playing' | 'paused';
  updatedAt: number; // Date.now() – used to correct drift on client
}

export class Room {
  public id: string;             // unique room code shown to users
  public participants: Map<string, Participant>; // keyed by userId
  public videoState: VideoState;
  private io: Server;

  constructor(id: string, io: Server) {
    this.id = id;
    this.io = io;
    this.participants = new Map();
    this.videoState = {
      videoId: '',
      currentTime: 0,
      playState: 'paused',
      updatedAt: Date.now(),
    };
  }

  // ── Participant management ──────────────────

  public addParticipant(p: Participant): void {
    this.participants.set(p.id, p);
  }

  public removeParticipant(userId: string): Participant | undefined {
    const p = this.participants.get(userId);
    this.participants.delete(userId);
    return p;
  }

  public getParticipant(userId: string): Participant | undefined {
    return this.participants.get(userId);
  }

  public getParticipantBySocket(socketId: string): Participant | undefined {
    for (const p of this.participants.values()) {
      if (p.socketId === socketId) return p;
    }
    return undefined;
  }

  public setRole(userId: string, role: Role): boolean {
    const p = this.participants.get(userId);
    if (!p) return false;
    p.role = role;
    return true;
  }

  public isEmpty(): boolean {
    return this.participants.size === 0;
  }

  /** Serialized participant list for broadcasting */
  public participantList() {
    return Array.from(this.participants.values()).map((p) => p.toJSON());
  }

  // ── Video state ─────────────────────────────

  public updateVideoState(patch: Partial<VideoState>): void {
    this.videoState = { ...this.videoState, ...patch, updatedAt: Date.now() };
  }

  public getState(): VideoState {
    return { ...this.videoState };
  }

  // ── Broadcasting helpers ────────────────────

  /** Emit an event to every socket in this room */
  public broadcast(event: string, data: unknown): void {
    this.io.to(this.id).emit(event, data);
  }

  /** Emit an event to every socket EXCEPT the sender */
  public broadcastExcept(socketId: string, event: string, data: unknown): void {
    this.io.to(this.id).except(socketId).emit(event, data);
  }
}
