// Shared TypeScript types used across the client
export type Role = 'host' | 'moderator' | 'participant';

export interface ParticipantInfo {
  id: string;
  username: string;
  role: Role;
}

export interface VideoState {
  videoId: string;
  currentTime: number;
  playState: 'playing' | 'paused';
  updatedAt: number;
}

export interface ChatMessage {
  userId: string;
  username: string;
  role: Role;
  message: string;
  timestamp: number;
}
