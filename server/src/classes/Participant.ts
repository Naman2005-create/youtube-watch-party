// ─────────────────────────────────────────────
//  Participant – represents a single user in a room
// ─────────────────────────────────────────────
export type Role = 'host' | 'moderator' | 'participant';

export class Participant {
  public id: string;          // unique userId (uuid)
  public username: string;
  public socketId: string;
  public role: Role;

  constructor(id: string, username: string, socketId: string, role: Role = 'participant') {
    this.id = id;
    this.username = username;
    this.socketId = socketId;
    this.role = role;
  }

  /** Returns a plain object safe to send over the wire */
  public toJSON() {
    return {
      id: this.id,
      username: this.username,
      role: this.role,
    };
  }

  /** Check if this participant can control playback */
  public canControl(): boolean {
    return this.role === 'host' || this.role === 'moderator';
  }

  /** Check if this participant is the host */
  public isHost(): boolean {
    return this.role === 'host';
  }
}
