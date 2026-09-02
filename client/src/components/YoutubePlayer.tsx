import { useEffect, useRef, useCallback } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import { VideoState } from '../types';

interface Props {
  videoId: string;
  videoState: VideoState | null;
  canControl: boolean;
  onPlay: () => void;
  onPause: (currentTime: number) => void;
  onSeek: (time: number) => void;
}

export default function YoutubePlayer({
  videoId,
  videoState,
  canControl,
  onPlay,
  onPause,
  onSeek,
}: Props) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const isSyncingRef = useRef(false);

  // Apply incoming sync_state
  const applySyncState = useCallback((state: VideoState) => {
    const player = playerRef.current;
    if (!player) return;

    isSyncingRef.current = true;

    // Correct for server-to-client latency
    const elapsed = (Date.now() - state.updatedAt) / 1000;
    const targetTime = state.currentTime + (state.playState === 'playing' ? elapsed : 0);

    const currentTime = player.getCurrentTime() ?? 0;
    const drift = Math.abs(currentTime - targetTime);

    // Only seek if drift is significant (> 1 s)
    if (drift > 1) {
      player.seekTo(targetTime, true);
    }

    if (state.playState === 'playing') {
      player.playVideo();
    } else {
      player.pauseVideo();
    }

    setTimeout(() => { isSyncingRef.current = false; }, 800);
  }, []);

  // Listen for videoState changes from server
  useEffect(() => {
    if (!videoState) return;
    applySyncState(videoState);
  }, [videoState, applySyncState]);

  // Hook into the interval loop to detect manual seeks (only for controllers)
  useEffect(() => {
    if (!canControl) return;
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player || isSyncingRef.current) return;
      // You can add additional sync logic here if needed
    }, 1000);
    return () => clearInterval(interval);
  }, [canControl]);

  const handleReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    // Mute initially if needed for autoplay, or just let it play
    if (videoState) {
      applySyncState(videoState);
    }
  };

  const handleStateChange = (event: YouTubeEvent) => {
    if (isSyncingRef.current || !canControl) return;

    if (event.data === YouTube.PlayerState.PLAYING) {
      onPlay();
    } else if (event.data === YouTube.PlayerState.PAUSED) {
      const time = event.target.getCurrentTime() ?? 0;
      onPause(time);
    }
  };

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: canControl ? 1 : 0,
      modestbranding: 1,
      rel: 0,
    },
  };

  return (
    <div className="yt-player-wrapper">
      {!videoId && (
        <div className="yt-placeholder">
          <span>🎬</span>
          <p>No video loaded yet.<br />
            {canControl ? 'Paste a YouTube URL below to start.' : 'Waiting for the host to load a video.'}
          </p>
        </div>
      )}
      <div className="yt-container" style={{ opacity: videoId ? 1 : 0, pointerEvents: videoId ? 'auto' : 'none' }}>
        {videoId && (
          <YouTube
            videoId={videoId}
            opts={opts}
            onReady={handleReady}
            onStateChange={handleStateChange}
            className="yt-iframe-container"
          />
        )}
      </div>
    </div>
  );
}
