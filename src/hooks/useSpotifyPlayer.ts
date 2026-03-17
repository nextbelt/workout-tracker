import { useState, useEffect, useCallback, useRef } from 'react';
import type { SpotifyTrack } from './useSpotify';

const API_BASE = (import.meta.env.VITE_API_PROXY_URL as string) ?? 'http://localhost:3001';
const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';

/** Retry delay between attempts (ms) */
const RETRY_DELAY = 1500;
/** Max retries for play on 404 */
const MAX_PLAY_RETRIES = 3;
/** Time after 'ready' before we consider the device stable */
const DEVICE_SETTLE_MS = 1500;
/** Auto-clear transient errors after this many ms */
const ERROR_AUTO_CLEAR_MS = 6000;

interface PlayerState {
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  deviceId: string | null;
}

interface UseSpotifyPlayerOptions {
  getToken: () => Promise<string | null>;
  enabled: boolean;
}

export function useSpotifyPlayer({ getToken, enabled }: UseSpotifyPlayerOptions) {
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentTrack: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    deviceId: null,
  });
  const [sdkReady, setSdkReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [premiumRequired, setPremiumRequired] = useState(false);

  const playerRef = useRef<Spotify.Player | null>(null);
  const positionInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackMapRef = useRef<Map<string, SpotifyTrack>>(new Map());
  const deviceReadyAt = useRef<number>(0);
  const errorClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep deviceId in a ref too so the play closure always sees the latest value
  const deviceIdRef = useRef<string | null>(null);

  // --- helpers ---
  const setTransientError = useCallback((msg: string) => {
    setError(msg);
    if (errorClearTimer.current) clearTimeout(errorClearTimer.current);
    errorClearTimer.current = setTimeout(() => setError(null), ERROR_AUTO_CLEAR_MS);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    if (errorClearTimer.current) {
      clearTimeout(errorClearTimer.current);
      errorClearTimer.current = null;
    }
  }, []);

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  // Load SDK script once
  useEffect(() => {
    if (!enabled) return;

    if (window.Spotify) {
      setSdkReady(true);
      return;
    }

    if (document.querySelector(`script[src="${SDK_URL}"]`)) return;

    window.onSpotifyWebPlaybackSDKReady = () => {
      setSdkReady(true);
    };

    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    document.head.appendChild(script);
  }, [enabled]);

  // Initialize player when SDK ready
  useEffect(() => {
    if (!sdkReady || !enabled) return;

    const player = new Spotify.Player({
      name: 'WorkIn Player',
      getOAuthToken: (cb) => {
        getToken().then((token) => {
          if (token) cb(token);
        });
      },
      volume: 0.8,
    });

    player.addListener('ready', ({ device_id }: SpotifyDeviceReady) => {
      console.log('[SpotifyPlayer] Ready with device:', device_id);
      deviceReadyAt.current = Date.now();
      deviceIdRef.current = device_id;
      setPlayerState((prev) => ({ ...prev, deviceId: device_id }));
      clearError();
    });

    player.addListener('not_ready', ({ device_id }: SpotifyDeviceReady) => {
      console.log('[SpotifyPlayer] Device not ready:', device_id);
      deviceIdRef.current = null;
      setPlayerState((prev) => ({ ...prev, deviceId: null }));

      // Auto-reconnect after a short delay
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(() => {
        console.log('[SpotifyPlayer] Attempting reconnect…');
        player.connect();
      }, 2000);
    });

    player.addListener('player_state_changed', (state: SpotifyWebPlaybackState | null) => {
      if (!state) {
        setPlayerState((prev) => ({
          ...prev,
          isPlaying: false,
          currentTrack: null,
          position: 0,
          duration: 0,
        }));
        return;
      }

      const sdkTrack = state.track_window.current_track;
      const mapped = trackMapRef.current.get(sdkTrack.id);
      const currentTrack: SpotifyTrack = mapped ?? {
        id: sdkTrack.id,
        uri: sdkTrack.uri,
        name: sdkTrack.name,
        artist: sdkTrack.artists.map((a) => a.name).join(', '),
        album: sdkTrack.album.name,
        albumArt: sdkTrack.album.images[0]?.url ?? '',
        spotifyUrl: `https://open.spotify.com/track/${sdkTrack.id}`,
        previewUrl: null,
        durationMs: sdkTrack.duration_ms,
      };

      setPlayerState((prev) => ({
        ...prev,
        isPlaying: !state.paused,
        currentTrack,
        position: state.position,
        duration: state.duration,
      }));
    });

    player.addListener('initialization_error', ({ message }: { message: string }) => {
      console.error('[SpotifyPlayer] init error:', message);
      setTransientError('Failed to initialize player');
    });

    player.addListener('authentication_error', ({ message }: { message: string }) => {
      console.error('[SpotifyPlayer] auth error:', message);
      setTransientError('Spotify authentication failed — try reconnecting in Settings');
    });

    player.addListener('account_error', ({ message }: { message: string }) => {
      console.error('[SpotifyPlayer] account error:', message);
      setPremiumRequired(true);
      setError('Spotify Premium is required for in-app playback');
    });

    player.addListener('playback_error', ({ message }: { message: string }) => {
      console.error('[SpotifyPlayer] playback error:', message);
      setTransientError('Playback error — try again');
    });

    player.connect();
    playerRef.current = player;

    return () => {
      player.disconnect();
      playerRef.current = null;
      if (positionInterval.current) clearInterval(positionInterval.current);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (errorClearTimer.current) clearTimeout(errorClearTimer.current);
    };
  }, [sdkReady, enabled, getToken, setTransientError, clearError]);

  // Position tracking when playing
  useEffect(() => {
    if (positionInterval.current) {
      clearInterval(positionInterval.current);
      positionInterval.current = null;
    }

    if (playerState.isPlaying) {
      positionInterval.current = setInterval(() => {
        setPlayerState((prev) => ({
          ...prev,
          position: Math.min(prev.position + 500, prev.duration),
        }));
      }, 500);
    }

    return () => {
      if (positionInterval.current) clearInterval(positionInterval.current);
    };
  }, [playerState.isPlaying]);

  // Core play call with retry logic for 404 "Device not found"
  const play = useCallback(async (tracks: SpotifyTrack[], startIndex = 0) => {
    // Cache tracks for metadata lookup
    const map = new Map<string, SpotifyTrack>();
    for (const t of tracks) map.set(t.id, t);
    trackMapRef.current = map;

    const uris = tracks.map((t) => t.uri);

    for (let attempt = 0; attempt < MAX_PLAY_RETRIES; attempt++) {
      const token = await getToken();

      if (!token) {
        setTransientError('No Spotify token — try reconnecting in Settings');
        return;
      }

      // Read device ID from ref (always current)
      let deviceId = deviceIdRef.current;

      // If device isn't ready yet, wait a bit
      if (!deviceId) {
        if (attempt < MAX_PLAY_RETRIES - 1) {
          console.log(`[SpotifyPlayer] No device yet, waiting… (attempt ${attempt + 1})`);
          await sleep(RETRY_DELAY);
          deviceId = deviceIdRef.current; // re-read after wait
          if (!deviceId) continue;
        } else {
          setTransientError('Spotify player not ready — tap a track to try again');
          return;
        }
      }

      // If device just became ready, wait for Spotify backend to register it
      const sinceReady = Date.now() - deviceReadyAt.current;
      if (sinceReady < DEVICE_SETTLE_MS) {
        await sleep(DEVICE_SETTLE_MS - sinceReady);
      }

      try {
        const res = await fetch(`${API_BASE}/api/spotify/play`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: token,
            device_id: deviceId,
            uris,
            offset: { position: startIndex },
          }),
        });

        if (res.ok) {
          clearError();
          return; // success!
        }

        const data = (await res.json()) as { error?: string; needsRefresh?: boolean };

        if (res.status === 403) {
          setPremiumRequired(true);
          setError('Spotify Premium is required for in-app playback');
          return; // no point retrying
        }

        if (res.status === 404 && attempt < MAX_PLAY_RETRIES - 1) {
          // Device not found — Spotify backend may be slow to register
          console.log(`[SpotifyPlayer] 404 Device not found, retrying in ${RETRY_DELAY}ms (attempt ${attempt + 1})`);

          // Try to reconnect the player so a fresh device_id is generated
          playerRef.current?.connect();
          await sleep(RETRY_DELAY);
          continue;
        }

        if (data.needsRefresh) {
          setTransientError('Session expired — refreshing…');
          return;
        }

        setTransientError(data.error ?? 'Failed to start playback');
        return;
      } catch {
        if (attempt < MAX_PLAY_RETRIES - 1) {
          await sleep(RETRY_DELAY);
          continue;
        }
        setTransientError('Failed to start playback — check your connection');
        return;
      }
    }
  }, [getToken, setTransientError, clearError]);

  const togglePlay = useCallback(async () => {
    if (!playerRef.current) return;
    await playerRef.current.togglePlay();
  }, []);

  const nextTrack = useCallback(async () => {
    if (!playerRef.current) return;
    await playerRef.current.nextTrack();
  }, []);

  const previousTrack = useCallback(async () => {
    if (!playerRef.current) return;
    await playerRef.current.previousTrack();
  }, []);

  const seek = useCallback(async (positionMs: number) => {
    if (!playerRef.current) return;
    await playerRef.current.seek(positionMs);
    setPlayerState((prev) => ({ ...prev, position: positionMs }));
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    if (!playerRef.current) return;
    await playerRef.current.setVolume(volume);
  }, []);

  // Manual reconnect for recovery
  const reconnect = useCallback(() => {
    if (!playerRef.current) return;
    clearError();
    playerRef.current.connect();
  }, [clearError]);

  return {
    ...playerState,
    sdkReady,
    error,
    premiumRequired,
    play,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
    reconnect,
  };
}
