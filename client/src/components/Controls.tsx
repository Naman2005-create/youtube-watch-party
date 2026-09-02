import { useState } from 'react';
import { extractVideoId } from '../utils';

interface Props {
  canControl: boolean;
  roomId: string;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onChangeVideo: (videoId: string) => void;
}

export default function Controls({ canControl, roomId, onPlay, onPause, onSeek, onChangeVideo }: Props) {
  const [videoUrl, setVideoUrl] = useState('');
  const [seekTime, setSeekTime] = useState('');
  const [videoError, setVideoError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleChangeVideo = () => {
    const id = extractVideoId(videoUrl.trim());
    if (!id) {
      setVideoError('Invalid YouTube URL or ID.');
      return;
    }
    setVideoError('');
    onChangeVideo(id);
    setVideoUrl('');
  };

  const handleSeek = () => {
    const secs = parseFloat(seekTime);
    if (isNaN(secs) || secs < 0) return;
    onSeek(secs);
    setSeekTime('');
  };

  const roomLink = `${window.location.origin}/#/room/${roomId}`;

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(roomLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="controls-panel">
      <div className="control-section invite-section">
        <label>Room Code</label>
        <div className="room-link-row">
          <div className="code-display">{roomId}</div>
          <button className="btn-secondary" onClick={copyCode}>
            {copiedCode ? '✓ Copied' : '📄 Copy Code'}
          </button>
          <button className="btn-secondary" onClick={copyLink}>
            {copiedLink ? '✓ Copied' : '🔗 Copy Link'}
          </button>
        </div>
      </div>

      {canControl ? (
        <div className="host-controls">
          <div className="control-section">
            <label>Change Video</label>
            <div className="input-row">
              <input
                type="text"
                placeholder="Paste YouTube URL..."
                value={videoUrl}
                onChange={(e) => { setVideoUrl(e.target.value); setVideoError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleChangeVideo()}
              />
              <button className="btn-primary" onClick={handleChangeVideo}>Load</button>
            </div>
            {videoError && <span className="error">{videoError}</span>}
          </div>

          <div className="control-section playback-section">
            <div className="playback-btns">
              <button className="btn-play" onClick={onPlay}>▶ Play</button>
              <button className="btn-pause" onClick={onPause}>⏸ Pause</button>
            </div>
            <div className="seek-row">
              <input
                type="number"
                min={0}
                placeholder="Seek to (s)..."
                value={seekTime}
                onChange={(e) => setSeekTime(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSeek()}
              />
              <button className="btn-secondary" onClick={handleSeek}>Go</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="control-section participant-notice">
          <p>👁 You are a <strong>Participant</strong> — playback is controlled by the host.</p>
        </div>
      )}
    </div>
  );
}
