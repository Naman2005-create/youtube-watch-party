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
  const [isWakingServer, setIsWakingServer] = useState(false);

  // ── Name Prompt for Direct Links ─────────────
  const [needsName, setNeedsName] = useState(!sessionStorage.getItem('username'));
  const [tempName, setTempName] = useState('');

  // ── Room state ───────────────────────────────
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [videoState, setVideoState] = useState<VideoState | null>(null);
  const [videoId, setVideoId] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [notification, setNotification] = useState('');

  const videoIdRef = useRef('');
  const canControl = myRole === 'host' || myRole === 'moderator';

  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  }, []);

  const handleJoinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tempName.trim()) return;
    sessionStorage.setItem('username', tempName.trim());
    setNeedsName(false);
  };

  useEffect(() => {
    if (needsName || !roomId) return;
    
    const username = sessionStorage.getItem('username');
    if (!username) return;

    // Detect if server is asleep (takes > 3s to connect)
    const wakeTimer = setTimeout(() => {
      if (!socket.connected) setIsWakingServer(true);
    }, 3000);

    if (!socket.connected) socket.connect();

    socket.on('connect', () => {
      clearTimeout(wakeTimer);
      setIsWakingServer(false);
      setConnected(true);
      socket.emit('join_room', { roomId, username });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('joined', (data: any) => {
      setMyId(data.userId);
      setMyRole(data.role);
      setParticipants(data.participants);
      if (data.videoState.videoId) {
        setVideoId(data.videoState.videoId);
        videoIdRef.current = data.videoState.videoId;
      }
      setVideoState(data.videoState);
    });

    socket.on('user_joined', (data: any) => {
      setParticipants(data.participants);
      notify(`👋 ${data.username} joined the party!`);
    });

    socket.on('user_left', (data: any) => {
      setParticipants(data.participants);
      notify(`🏃 ${data.username} left.`);
    });

    socket.on('sync_state', (state: VideoState) => {
      if (state.videoId && state.videoId !== videoIdRef.current) {
        videoIdRef.current = state.videoId;
        setVideoId(state.videoId);
      }
      setVideoState({ ...state });
    });

    socket.on('role_assigned', (data: any) => {
      setParticipants(data.participants);
      setMyId((id) => {
        if (id === data.userId) {
          setMyRole(data.role);
          notify(`🎉 You are now a ${data.role}!`);
        }
        return id;
      });
      if (data.userId !== myId) {
        notify(`✨ ${data.username} is now a ${data.role}.`);
      }
    });

    socket.on('participant_removed', (data: any) => {
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
      notify(`⚠️ ${data.message}`);
    });

    if (socket.connected) {
      clearTimeout(wakeTimer);
      setConnected(true);
      socket.emit('join_room', { roomId, username });
    }

    return () => {
      clearTimeout(wakeTimer);
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
  }, [roomId, needsName, notify]); // REMOVED myId to fix infinite connect/disconnect loop

  const handlePlay = useCallback(() => socket.emit('play', { roomId }), [roomId]);
  const handlePause = useCallback(() => socket.emit('pause', { roomId, currentTime: videoState?.currentTime ?? 0 }), [roomId, videoState]);
  const handleSeek = useCallback((time: number) => socket.emit('seek', { roomId, time }), [roomId]);
  const handleChangeVideo = useCallback((id: string) => socket.emit('change_video', { roomId, videoId: id }), [roomId]);
  const handleAssignRole = useCallback((userId: string, role: Role) => socket.emit('assign_role', { roomId, userId, role }), [roomId]);
  const handleRemove = useCallback((userId: string) => socket.emit('remove_participant', { roomId, userId }), [roomId]);
  const handleSendChat = useCallback((message: string) => socket.emit('chat_message', { roomId, message }), [roomId]);

  if (needsName) {
    return (
      <div className="name-prompt-screen fade-in">
        <div className="card">
          <h2>Join Watch Party 🍿</h2>
          <p>You've been invited to room <strong>{roomId}</strong></p>
          <form onSubmit={handleJoinSubmit} className="name-form">
            <input
              autoFocus
              type="text"
              placeholder="Enter your name..."
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
            />
            <button type="submit" className="btn-primary">Join Room</button>
          </form>
        </div>
      </div>
    );
  }

  if (kicked) {
    return (
      <div className="kicked-screen fade-in">
        <div className="card text-center">
          <h2>🚪 You were removed</h2>
          <p>The host has removed you from this room.</p>
          <button className="btn-primary" onClick={() => navigate('/')}>Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="room-page fade-in">
      <header className="room-header">
        <div className="logo" onClick={() => navigate('/')}>🎬 Watch Party</div>
        <div className="header-right">
          <div className={`status-pill ${connected ? 'online' : 'offline'}`}>
            <div className="status-dot"></div>
            {connected ? 'Live' : isWakingServer ? 'Waking Server...' : 'Connecting...'}
          </div>
          <div className="my-role-badge">
            {myRole === 'host' ? '👑 Host' : myRole === 'moderator' ? '🛡 Mod' : '👤 Viewer'}
          </div>
          <button className="btn-leave" onClick={() => { socket.emit('leave_room', { roomId }); navigate('/'); }}>
            Leave
          </button>
        </div>
      </header>

      {notification && <div className="notification-toast">{notification}</div>}

      <div className="room-layout">
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
