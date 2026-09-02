import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';
import YoutubePlayer from './YoutubePlayer';
import Controls from './Controls';
import ParticipantList from './ParticipantList';
import Chat from './Chat';
import { ParticipantInfo, VideoState, ChatMessage, Role } from '../types';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // ── Session state ────────────────────────────
  const [myId, setMyId] = useState('');
  const [myRole, setMyRole] = useState<Role>('participant');
  const [connected, setConnected] = useState(false);
  const [kicked, setKicked] = useState(false);

  // ── Room state ───────────────────────────────
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [videoState, setVideoState] = useState<VideoState | null>(null);
  const [videoId, setVideoId] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [notification, setNotification] = useState('');

  // Ref to track current videoId without causing re-renders
  const videoIdRef = useRef('');

  const canControl = myRole === 'host' || myRole === 'moderator';

  // ── Show a temporary notification banner ─────
  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  }, []);

  // ── Connect and join room ────────────────────
  useEffect(() => {
    const username = sessionStorage.getItem('username');
    if (!username || !roomId) {
      navigate('/');
      return;
    }

    // Connect socket if not already connected
    if (!socket.connected) socket.connect();

    // ── Socket event handlers ──────────────────

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_room', { roomId, username });
    });

    socket.on('disconnect', () => setConnected(false));

    // Server confirmed we joined
    socket.on('joined', (data: {
      userId: string;
      role: Role;
      roomId: string;
      videoState: VideoState;
      participants: ParticipantInfo[];
    }) => {
      setMyId(data.userId);
      setMyRole(data.role);
      setParticipants(data.participants);
      if (data.videoState.videoId) {
        setVideoId(data.videoState.videoId);
        videoIdRef.current = data.videoState.videoId;
      }
      setVideoState(data.videoState);
    });

    socket.on('user_joined', (data: { username: string; role: Role; participants: ParticipantInfo[] }) => {
      setParticipants(data.participants);
      notify(`${data.username} joined as ${data.role}.`);
    });

    socket.on('user_left', (data: { username: string; participants: ParticipantInfo[] }) => {
      setParticipants(data.participants);
      notify(`${data.username} left the room.`);
    });

    socket.on('sync_state', (state: VideoState) => {
      // Update videoId only if it changed
      if (state.videoId && state.videoId !== videoIdRef.current) {
        videoIdRef.current = state.videoId;
        setVideoId(state.videoId);
      }
      setVideoState({ ...state });
    });

    socket.on('role_assigned', (data: { userId: string; username: string; role: Role; participants: ParticipantInfo[] }) => {
      setParticipants(data.participants);
      // Update our own role if we were assigned
      setMyId((id) => {
        if (id === data.userId) setMyRole(data.role);
        return id;
      });
      notify(`${data.username} is now ${data.role}.`);
    });

    socket.on('participant_removed', (data: { userId: string; participants: ParticipantInfo[] }) => {
      setParticipants(data.participants);
    });

    socket.on('kicked', () => {
      setKicked(true);
      socket.disconnect();
    });

    socket.on('chat_message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on('error', (data: { message: string }) => {
      notify(`⚠ ${data.message}`);
    });

    // If socket already connected (hot-reload), emit join immediately
    if (socket.connected) {
      setConnected(true);
      socket.emit('join_room', { roomId, username });
    }

    return () => {
      socket.emit('leave_room', { roomId });
      socket.off('connect');
      socket.off('disconnect');
      socket.off('joined');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('sync_state');
      socket.off('role_assigned');
      socket.off('participant_removed');
      socket.off('kicked');
      socket.off('chat_message');
      socket.off('error');
    };
  }, [roomId, navigate, notify]);

  // ── Playback event emitters ──────────────────

  const handlePlay = useCallback(() => {
    socket.emit('play', { roomId });
  }, [roomId]);

  const handlePause = useCallback(() => {
    socket.emit('pause', { roomId, currentTime: videoState?.currentTime ?? 0 });
  }, [roomId, videoState]);

  const handleSeek = useCallback((time: number) => {
    socket.emit('seek', { roomId, time });
  }, [roomId]);

  const handleChangeVideo = useCallback((id: string) => {
    socket.emit('change_video', { roomId, videoId: id });
  }, [roomId]);

  const handleAssignRole = useCallback((userId: string, role: Role) => {
    socket.emit('assign_role', { roomId, userId, role });
  }, [roomId]);

  const handleRemove = useCallback((userId: string) => {
    socket.emit('remove_participant', { roomId, userId });
  }, [roomId]);

  const handleSendChat = useCallback((message: string) => {
    socket.emit('chat_message', { roomId, message });
  }, [roomId]);

  // ── Kicked screen ────────────────────────────
  if (kicked) {
    return (
      <div className="kicked-screen">
        <h2>You were removed from the room.</h2>
        <button className="btn-primary" onClick={() => navigate('/')}>Go Home</button>
      </div>
    );
  }

  // ── Main UI ──────────────────────────────────
  return (
    <div className="room-page">
      {/* ── Header ── */}
      <header className="room-header">
        <h1>🎬 Watch Party</h1>
        <div className="header-right">
          <span className={`conn-badge ${connected ? 'conn-online' : 'conn-offline'}`}>
            {connected ? '● Live' : '○ Connecting…'}
          </span>
          <span className="my-role-badge">
            {myRole === 'host' ? '👑' : myRole === 'moderator' ? '🛡' : '👤'} {myRole}
          </span>
          <button className="btn-leave" onClick={() => { socket.emit('leave_room', { roomId }); navigate('/'); }}>
            Leave
          </button>
        </div>
      </header>

      {/* ── Notification banner ── */}
      {notification && <div className="notification-banner">{notification}</div>}

      {/* ── Main layout ── */}
      <div className="room-layout">
        {/* Left column: player + controls */}
        <div className="room-main">
          <YoutubePlayer
            videoId={videoId}
            videoState={videoState}
            canControl={canControl}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
          />
          <Controls
            canControl={canControl}
            roomId={roomId!}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onChangeVideo={handleChangeVideo}
          />
        </div>

        {/* Right sidebar: participants + chat */}
        <div className="room-sidebar">
          <ParticipantList
            participants={participants}
            myId={myId}
            myRole={myRole}
            onAssignRole={handleAssignRole}
            onRemove={handleRemove}
          />
          <Chat
            messages={chatMessages}
            onSend={handleSendChat}
            myId={myId}
          />
        </div>
      </div>
    </div>
  );
}
