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

  const roomLink = `${window.location.origin}/room/${roomId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(roomLink);
  };

  return (
    <div className="controls-panel">
      {/* ── Room link ── */}
      <div className="control-section">
        <label>Room Code</label>
        <div className="room-link-row">
          <input readOnly value={roomId} className="room-code-input" />
          <button className="btn-copy" onClick={copyLink} title="Copy invite link">
            📋 Copy Link
          </button>
        </div>
      </div>

      {/* ── Video controls (Host / Moderator only) ── */}
      {canControl ? (
        <>
          <div className="control-section">
            <label>Change Video</label>
            <div className="input-row">
              <input
                type="text"
                placeholder="Paste YouTube URL or video ID"
                value={videoUrl}
                onChange={(e) => { setVideoUrl(e.target.value); setVideoError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleChangeVideo()}
              />
              <button className="btn-primary" onClick={handleChangeVideo}>Load</button>
            </div>
            {videoError && <span className="error">{videoError}</span>}
          </div>

          <div className="control-section playback-btns">
            <button className="btn-play" onClick={onPlay}>▶ Play</button>
            <button className="btn-pause" onClick={onPause}>⏸ Pause</button>
          </div>

          <div className="control-section">
            <label>Seek to (seconds)</label>
            <div className="input-row">
              <input
                type="number"
                min={0}
                placeholder="e.g. 90"
                value={seekTime}
                onChange={(e) => setSeekTime(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSeek()}
              />
              <button className="btn-secondary" onClick={handleSeek}>Go</button>
            </div>
          </div>
        </>
      ) : (
        <div className="control-section participant-notice">
          <p>👁 You are a <strong>Participant</strong> — playback is controlled by the host.</p>
        </div>
      )}
    </div>
  );
}
