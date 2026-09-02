import { useEffect, useRef, useCallback } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const isSyncingRef = useRef(false);   // prevent echo-back when applying sync
  const lastVideoId = useRef<string>('');
  const seekDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Create / recreate the player ────────────
  const createPlayer = useCallback(() => {
    if (!containerRef.current) return;

    // Destroy old player if it exists
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
    }

    // Create a fresh div for the iframe
    const div = document.createElement('div');
    div.id = 'yt-player-inner';
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(div);

    playerRef.current = new window.YT.Player('yt-player-inner', {
      videoId: videoId || '',
      playerVars: {
        autoplay: 0,
        controls: canControl ? 1 : 0,  // hide native controls for participants
        modestbranding: 1,
        rel: 0,
        fs: 1,
      },
      events: {
        onReady: (event) => {
          // Mute initially to allow autoplay later
          event.target.muted = true;
          // If we already have a state, apply it
          if (videoState) applySyncState(videoState);
        },
        onStateChange: (event) => {
          if (isSyncingRef.current || !canControl) return;

          if (event.data === window.YT.PlayerState.PLAYING) {
            onPlay();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            const time = playerRef.current?.getCurrentTime() ?? 0;
            onPause(time);
          }
        },
      },
    });
    lastVideoId.current = videoId;
  }, [videoId, canControl]); // eslint-disable-line

  // ── Initialize when API is ready ─────────────
  useEffect(() => {
    const init = () => createPlayer();

    if (window.YT && window.YT.Player) {
      init();
    } else {
      window.onYouTubeIframeAPIReady = init;
    }

    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
      }
    };
  }, []); // eslint-disable-line

  // ── Handle videoId changes ───────────────────
  useEffect(() => {
    if (!playerRef.current || !videoId) return;
    if (videoId === lastVideoId.current) return;
    lastVideoId.current = videoId;
    isSyncingRef.current = true;
    playerRef.current.loadVideoById(videoId, 0);
    playerRef.current.pauseVideo();
    setTimeout(() => { isSyncingRef.current = false; }, 1000);
  }, [videoId]);

  // ── Apply incoming sync_state ────────────────
  const applySyncState = useCallback((state: VideoState) => {
    const player = playerRef.current;
    if (!player || typeof player.seekTo !== 'function') return;

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

  // ── Listen for videoState changes from server ─
  useEffect(() => {
    if (!videoState) return;
    applySyncState(videoState);
  }, [videoState, applySyncState]);

  // ── Seek via native controls (canControl only) ─
  // We hook into the interval loop to detect manual seeks
  useEffect(() => {
    if (!canControl) return;
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player || isSyncingRef.current) return;
      if (player.getPlayerState() !== window.YT?.PlayerState?.PLAYING) return;
    }, 1000);
    return () => clearInterval(interval);
  }, [canControl]);

  return (
    <div className="yt-player-wrapper">
      {!videoId && (
        <div className="yt-placeholder">
          <span>🎬</span>
          <p>No video loaded yet.<br />
            {canControl ? 'Paste a YouTube URL above to start.' : 'Waiting for the host to load a video.'}
          </p>
        </div>
      )}
      <div ref={containerRef} className="yt-container" style={{ display: videoId ? 'block' : 'none' }} />
    </div>
  );
}
