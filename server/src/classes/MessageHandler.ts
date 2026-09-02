// ─────────────────────────────────────────────
//  MessageHandler – routes all Socket.IO events
//  and enforces role-based access control
// ─────────────────────────────────────────────
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Room } from './Room';
import { Participant, Role } from './Participant';

type RoomStore = Map<string, Room>;

export class MessageHandler {
  private io: Server;
  private rooms: RoomStore;

  constructor(io: Server, rooms: RoomStore) {
    this.io = io;
    this.rooms = rooms;
  }

  // ── Register all event listeners for one socket ──

  public register(socket: Socket): void {
    socket.on('join_room', (data) => this.handleJoin(socket, data));
    socket.on('leave_room', (data) => this.handleLeave(socket, data));
    socket.on('play', (data) => this.handlePlay(socket, data));
    socket.on('pause', (data) => this.handlePause(socket, data));
    socket.on('seek', (data) => this.handleSeek(socket, data));
    socket.on('change_video', (data) => this.handleChangeVideo(socket, data));
    socket.on('assign_role', (data) => this.handleAssignRole(socket, data));
    socket.on('remove_participant', (data) => this.handleRemoveParticipant(socket, data));
    socket.on('chat_message', (data) => this.handleChat(socket, data));
    socket.on('disconnect', () => this.handleDisconnect(socket));
    socket.on('request_sync', (data) => this.handleRequestSync(socket, data));
  }

  // ── Helpers ──────────────────────────────────

  private getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  private getSenderParticipant(socket: Socket, roomId: string): Participant | undefined {
    const room = this.getRoom(roomId);
    return room?.getParticipantBySocket(socket.id);
  }

  private sendError(socket: Socket, message: string): void {
    socket.emit('error', { message });
  }

  // ── Event handlers ───────────────────────────

  private handleJoin(socket: Socket, data: { roomId: string; username: string }): void {
    const { roomId, username } = data;
    if (!roomId || !username) return;

    let room = this.rooms.get(roomId);
    const isCreator = !room;

    // Create room if it doesn't exist yet
    if (!room) {
      room = new Room(roomId, this.io);
      this.rooms.set(roomId, room);
    }

    const userId = uuidv4();
    const role: Role = isCreator ? 'host' : 'participant';
    const participant = new Participant(userId, username, socket.id, role);

    room.addParticipant(participant);
    socket.join(roomId);

    // Send the joiner their own info + current video state
    socket.emit('joined', {
      userId,
      role,
      roomId,
      videoState: room.getState(),
      participants: room.participantList(),
    });

    // Notify everyone else
    room.broadcastExcept(socket.id, 'user_joined', {
      username,
      userId,
      role,
      participants: room.participantList(),
    });

    console.log(`[JOIN] ${username} (${role}) → room ${roomId}`);
  }

  private handleLeave(socket: Socket, data: { roomId: string }): void {
    const { roomId } = data;
    const room = this.getRoom(roomId);
    if (!room) return;

    const participant = room.getParticipantBySocket(socket.id);
    if (!participant) return;

    room.removeParticipant(participant.id);
    socket.leave(roomId);

    // If host left and there are still people, promote the next person
    if (participant.isHost() && !room.isEmpty()) {
      const next = room.participants.values().next().value as Participant;
      room.setRole(next.id, 'host');
      room.broadcast('role_assigned', {
        userId: next.id,
        username: next.username,
        role: 'host',
        participants: room.participantList(),
      });
    }

    room.broadcast('user_left', {
      username: participant.username,
      userId: participant.id,
      participants: room.participantList(),
    });

    if (room.isEmpty()) {
      this.rooms.delete(roomId);
      console.log(`[ROOM] ${roomId} deleted (empty)`);
    }

    console.log(`[LEAVE] ${participant.username} ← room ${roomId}`);
  }

  private handleDisconnect(socket: Socket): void {
    // Search all rooms for this socket
    for (const [roomId, room] of this.rooms.entries()) {
      const participant = room.getParticipantBySocket(socket.id);
      if (participant) {
        this.handleLeave(socket, { roomId });
        break;
      }
    }
  }

  private handlePlay(socket: Socket, data: { roomId: string }): void {
    const { roomId } = data;
    const room = this.getRoom(roomId);
    const sender = this.getSenderParticipant(socket, roomId);
    if (!room || !sender) return;

    if (!sender.canControl()) {
      return this.sendError(socket, 'Only Host or Moderator can control playback.');
    }

    room.updateVideoState({ playState: 'playing' });
    room.broadcast('sync_state', room.getState());
    console.log(`[PLAY] by ${sender.username} in ${roomId}`);
  }

  private handlePause(socket: Socket, data: { roomId: string; currentTime: number }): void {
    const { roomId, currentTime } = data;
    const room = this.getRoom(roomId);
    const sender = this.getSenderParticipant(socket, roomId);
    if (!room || !sender) return;

    if (!sender.canControl()) {
      return this.sendError(socket, 'Only Host or Moderator can control playback.');
    }

    room.updateVideoState({ playState: 'paused', currentTime: currentTime ?? room.videoState.currentTime });
    room.broadcast('sync_state', room.getState());
    console.log(`[PAUSE] by ${sender.username} in ${roomId} at ${currentTime}s`);
  }

  private handleSeek(socket: Socket, data: { roomId: string; time: number }): void {
    const { roomId, time } = data;
    const room = this.getRoom(roomId);
    const sender = this.getSenderParticipant(socket, roomId);
    if (!room || !sender) return;

    if (!sender.canControl()) {
      return this.sendError(socket, 'Only Host or Moderator can seek.');
    }

    room.updateVideoState({ currentTime: time });
    room.broadcast('sync_state', room.getState());
    console.log(`[SEEK] by ${sender.username} in ${roomId} to ${time}s`);
  }

  private handleChangeVideo(socket: Socket, data: { roomId: string; videoId: string }): void {
    const { roomId, videoId } = data;
    const room = this.getRoom(roomId);
    const sender = this.getSenderParticipant(socket, roomId);
    if (!room || !sender) return;

    if (!sender.canControl()) {
      return this.sendError(socket, 'Only Host or Moderator can change the video.');
    }

    room.updateVideoState({ videoId, currentTime: 0, playState: 'paused' });
    room.broadcast('sync_state', room.getState());
    console.log(`[CHANGE_VIDEO] by ${sender.username} in ${roomId}: ${videoId}`);
  }

  private handleAssignRole(socket: Socket, data: { roomId: string; userId: string; role: Role }): void {
    const { roomId, userId, role } = data;
    const room = this.getRoom(roomId);
    const sender = this.getSenderParticipant(socket, roomId);
    if (!room || !sender) return;

    if (!sender.isHost()) {
      return this.sendError(socket, 'Only the Host can assign roles.');
    }

    const validRoles: Role[] = ['host', 'moderator', 'participant'];
    if (!validRoles.includes(role)) {
      return this.sendError(socket, 'Invalid role.');
    }

    const target = room.getParticipant(userId);
    if (!target) return this.sendError(socket, 'User not found.');

    // If assigning host to someone else, demote current host to moderator
    if (role === 'host') {
      room.setRole(sender.id, 'moderator');
    }

    room.setRole(userId, role);
    room.broadcast('role_assigned', {
      userId,
      username: target.username,
      role,
      participants: room.participantList(),
    });
    console.log(`[ROLE] ${sender.username} assigned ${role} to ${target.username} in ${roomId}`);
  }

  private handleRemoveParticipant(socket: Socket, data: { roomId: string; userId: string }): void {
    const { roomId, userId } = data;
    const room = this.getRoom(roomId);
    const sender = this.getSenderParticipant(socket, roomId);
    if (!room || !sender) return;

    if (!sender.isHost()) {
      return this.sendError(socket, 'Only the Host can remove participants.');
    }

    const target = room.getParticipant(userId);
    if (!target) return this.sendError(socket, 'User not found.');

    // Tell the target they've been removed
    this.io.to(target.socketId).emit('kicked', { message: 'You were removed from the room.' });
    this.io.in(target.socketId).socketsLeave(roomId);

    room.removeParticipant(userId);
    room.broadcast('participant_removed', {
      userId,
      participants: room.participantList(),
    });
    console.log(`[REMOVE] ${sender.username} removed ${target.username} from ${roomId}`);
  }

  private handleChat(socket: Socket, data: { roomId: string; message: string }): void {
    const { roomId, message } = data;
    const room = this.getRoom(roomId);
    const sender = this.getSenderParticipant(socket, roomId);
    if (!room || !sender || !message?.trim()) return;

    room.broadcast('chat_message', {
      userId: sender.id,
      username: sender.username,
      role: sender.role,
      message: message.trim().slice(0, 500), // cap length
      timestamp: Date.now(),
    });
  }

  private handleRequestSync(socket: Socket, data: { roomId: string }): void {
    const { roomId } = data;
    const room = this.getRoom(roomId);
    if (!room) return;
    socket.emit('sync_state', room.getState());
  }
}
