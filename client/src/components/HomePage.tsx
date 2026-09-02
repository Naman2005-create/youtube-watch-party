import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from '../utils';

export default function HomePage() {
  const navigate = useNavigate();

  // ── Create room ──────────────────────────────
  const [createName, setCreateName] = useState('');
  const [createError, setCreateError] = useState('');

  const handleCreate = () => {
    if (!createName.trim()) {
      setCreateError('Please enter your name.');
      return;
    }
    const roomId = nanoid(8);
    // Store username in sessionStorage so RoomPage can read it
    sessionStorage.setItem('username', createName.trim());
    navigate(`/room/${roomId}`);
  };

  // ── Join room ────────────────────────────────
  const [joinName, setJoinName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const handleJoin = () => {
    if (!joinName.trim()) { setJoinError('Please enter your name.'); return; }
    if (!roomCode.trim()) { setJoinError('Please enter a room code.'); return; }
    sessionStorage.setItem('username', joinName.trim());
    navigate(`/room/${roomCode.trim()}`);
  };

  return (
    <div className="home-page">
      <div className="home-hero">
        <h1>🎬 Watch Party</h1>
        <p>Watch YouTube videos in sync with your friends — in real time.</p>
      </div>

      <div className="home-cards">
        {/* ── Create card ── */}
        <div className="card">
          <h2>Create a Room</h2>
          <p>Start a new watch party and invite friends.</p>
          <input
            type="text"
            placeholder="Your name"
            value={createName}
            onChange={(e) => { setCreateName(e.target.value); setCreateError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          {createError && <span className="error">{createError}</span>}
          <button className="btn-primary" onClick={handleCreate}>
            Create Room
          </button>
        </div>

        <div className="divider">or</div>

        {/* ── Join card ── */}
        <div className="card">
          <h2>Join a Room</h2>
          <p>Enter a room code shared by your friend.</p>
          <input
            type="text"
            placeholder="Your name"
            value={joinName}
            onChange={(e) => { setJoinName(e.target.value); setJoinError(''); }}
          />
          <input
            type="text"
            placeholder="Room code"
            value={roomCode}
            onChange={(e) => { setRoomCode(e.target.value); setJoinError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          {joinError && <span className="error">{joinError}</span>}
          <button className="btn-secondary" onClick={handleJoin}>
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}
