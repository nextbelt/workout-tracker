import { useState, useCallback } from 'react';
import { Music, Loader2, ChevronDown, ChevronUp, RefreshCw, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import type { SpotifyTrack } from '../hooks/useSpotify';

export type SpotifyMood = 'fired_up' | 'elevate' | 'boost' | 'steady' | 'low' | 'beat_up';

interface SpotifyMoodPlaylistProps {
  tracks: SpotifyTrack[];
  mood: SpotifyMood;
  loading: boolean;
  error: string | null;
  onRefresh: (mood: SpotifyMood) => void;
  // Player state from useSpotifyPlayer
  playerReady: boolean;
  playerError: string | null;
  premiumRequired: boolean;
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  onPlay: (tracks: SpotifyTrack[], startIndex: number) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (positionMs: number) => void;
  onSetVolume: (volume: number) => void;
  onReconnect?: () => void;
}

const MOOD_LABELS: Record<string, string> = {
  fired_up: '🔥 Fired Up',
  elevate: '💪 Elevate',
  boost: '⚡ Boost',
  steady: '💪 Steady',
  low: '😐 Low Energy',
  beat_up: '🧊 Recovery',
};

const MOOD_DESCRIPTIONS: Record<string, string> = {
  fired_up: 'Peak energy bangers — you came to destroy this session',
  elevate: 'Motivating beats to take you from good to great',
  boost: 'Uplifting tracks to fire you up and get moving',
  steady: 'Motivating beats to keep you locked in',
  low: 'Uplifting tracks to ease into the session',
  beat_up: 'Low-key vibes for active recovery',
};

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPosition(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SpotifyMoodPlaylist({
  tracks,
  mood,
  loading,
  error,
  onRefresh,
  playerReady,
  playerError,
  premiumRequired,
  currentTrack,
  isPlaying,
  position,
  duration,
  onPlay,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  onSetVolume,
  onReconnect,
}: SpotifyMoodPlaylistProps) {
  const [expanded, setExpanded] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);
  const [muted, setMuted] = useState(false);

  const handleTrackClick = useCallback((index: number) => {
    if (!playerReady) return;
    const clickedTrack = tracks[index];
    // If clicking the currently playing track, toggle play/pause
    if (currentTrack && clickedTrack && currentTrack.id === clickedTrack.id) {
      onTogglePlay();
    } else {
      onPlay(tracks, index);
    }
  }, [tracks, currentTrack, playerReady, onPlay, onTogglePlay]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      onSetVolume(prev ? 0.8 : 0);
      return !prev;
    });
  }, [onSetVolume]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(Math.floor(pct * duration));
  }, [duration, onSeek]);

  // Loading state
  if (loading) {
    return (
      <div className="bg-surface-2 rounded-xl p-4 flex items-center justify-center gap-2">
        <Loader2 size={18} className="text-[#1DB954] animate-spin" />
        <span className="text-muted text-sm">Loading your playlist...</span>
      </div>
    );
  }

  // Premium required error
  if (premiumRequired) {
    return (
      <div className="bg-surface-2 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-yellow-400 shrink-0" />
          <p className="text-yellow-400 text-sm font-medium">Spotify Premium Required</p>
        </div>
        <p className="text-muted text-xs">In-app playback requires a Spotify Premium subscription. You can still use Spotify separately for music.</p>
      </div>
    );
  }

  // General error (from recommendations or player)
  const displayError = error ?? playerError;
  if (displayError && tracks.length === 0) {
    return (
      <div className="bg-surface-2 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-sm">{displayError}</p>
        </div>
        <div className="flex gap-2">
          {onReconnect && (
            <button
              onClick={onReconnect}
              className="flex-1 text-xs py-2 min-h-11 bg-surface-3 hover:bg-surface-4 text-foreground rounded-lg transition-colors"
            >
              Reconnect Player
            </button>
          )}
          <button
            onClick={() => onRefresh(mood)}
            className="flex-1 text-xs py-2 min-h-11 bg-[#1DB954]/15 hover:bg-[#1DB954]/25 text-[#1DB954] rounded-lg transition-colors"
          >
            Reload Tracks
          </button>
        </div>
      </div>
    );
  }

  // Waiting for SDK + tracks
  if (!playerReady && tracks.length === 0) {
    return (
      <div className="bg-surface-2 rounded-xl p-4 flex items-center justify-center gap-2">
        <Loader2 size={18} className="text-[#1DB954] animate-spin" />
        <span className="text-muted text-sm">Connecting to Spotify...</span>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="bg-surface-2 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1DB954]/15 flex items-center justify-center">
              <Music size={16} className="text-[#1DB954]" />
            </div>
            <div>
              <p className="text-foreground font-medium text-sm">{MOOD_LABELS[mood] ?? mood} Playlist</p>
              <p className="text-muted text-xs">No tracks loaded yet.</p>
            </div>
          </div>
          <button
            onClick={() => onRefresh(mood)}
            className="p-2 min-h-11 min-w-11 hover:bg-surface-3 rounded-lg transition-colors flex items-center justify-center"
            aria-label="Refresh playlist"
          >
            <RefreshCw size={14} className="text-muted" />
          </button>
        </div>
        <div className="px-4 pb-4">
          <p className="text-muted text-sm">Spotify is connected, but your workout playlist hasn't loaded yet. Tap refresh to try again.</p>
        </div>
      </div>
    );
  }

  const displayTracks = tracks.slice(0, visibleCount);
  const hasMore = visibleCount < tracks.length;
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div className="bg-surface-2 rounded-xl overflow-hidden">
      {/* Now Playing Bar */}
      {currentTrack && (
        <div className="bg-[#1DB954]/10 border-b border-[#1DB954]/20">
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            {currentTrack.albumArt ? (
              <img
                src={currentTrack.albumArt}
                alt={currentTrack.album}
                className="w-12 h-12 rounded-lg object-cover shrink-0 shadow-lg"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
                <Music size={20} className="text-muted" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm font-semibold truncate">{currentTrack.name}</p>
              <p className="text-muted text-xs truncate">{currentTrack.artist}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onPrevious}
                className="p-2 min-h-11 min-w-11 rounded-lg hover:bg-surface-3 transition-colors flex items-center justify-center"
              >
                <SkipBack size={18} className="text-foreground" />
              </button>
              <button
                onClick={onTogglePlay}
                className="p-2 min-h-11 min-w-11 bg-[#1DB954] rounded-full hover:bg-[#1ed760] transition-colors flex items-center justify-center"
              >
                {isPlaying
                  ? <Pause size={18} className="text-black" />
                  : <Play size={18} className="text-black ml-0.5" />
                }
              </button>
              <button
                onClick={onNext}
                className="p-2 min-h-11 min-w-11 rounded-lg hover:bg-surface-3 transition-colors flex items-center justify-center"
              >
                <SkipForward size={18} className="text-foreground" />
              </button>
              <button
                onClick={toggleMute}
                className="p-2 min-h-11 min-w-11 rounded-lg hover:bg-surface-3 transition-colors flex items-center justify-center"
              >
                {muted
                  ? <VolumeX size={16} className="text-muted" />
                  : <Volume2 size={16} className="text-foreground" />
                }
              </button>
            </div>
          </div>
          {/* Seekable progress bar */}
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted w-8 text-right">{formatPosition(position)}</span>
              <div
                className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden cursor-pointer"
                onClick={handleSeek}
                role="slider"
                aria-label="Seek"
                aria-valuenow={position}
                aria-valuemin={0}
                aria-valuemax={duration}
                tabIndex={0}
              >
                <div
                  className="h-full bg-[#1DB954] rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-muted w-8">{formatPosition(duration)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded(!expanded);
          }
        }}
        className="w-full flex items-center justify-between p-4 min-h-11 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1DB954]/15 flex items-center justify-center">
            <Music size={16} className="text-[#1DB954]" />
          </div>
          <div className="text-left">
            <p className="text-foreground font-medium text-sm">
              {MOOD_LABELS[mood] ?? mood} Playlist
            </p>
            <p className="text-muted text-xs">
              {MOOD_DESCRIPTIONS[mood] ?? 'Workout tracks'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onRefresh(mood); }}
            className="p-2 min-h-11 min-w-11 hover:bg-surface-3 rounded-lg transition-colors flex items-center justify-center"
          >
            <RefreshCw size={14} className="text-muted" />
          </button>
          {expanded
            ? <ChevronUp size={18} className="text-muted" />
            : <ChevronDown size={18} className="text-muted" />
          }
        </div>
      </div>

      {/* Inline error */}
      {displayError && (
        <div className="px-4 pb-2">
          <p className="text-red-400 text-xs">{displayError}</p>
        </div>
      )}

      {/* Player not ready hint */}
      {!playerReady && tracks.length > 0 && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <Loader2 size={12} className="text-[#1DB954] animate-spin" />
          <span className="text-muted text-xs">Connecting player...</span>
        </div>
      )}

      {/* Track list */}
      {expanded && (
        <div className="px-4 pb-4 space-y-1">
          {displayTracks.map((track, i) => {
            const isActive = currentTrack?.id === track.id;

            return (
              <button
                key={track.id}
                onClick={() => handleTrackClick(i)}
                disabled={!playerReady}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors min-h-11 text-left ${
                  isActive
                    ? 'bg-[#1DB954]/10 ring-1 ring-[#1DB954]/30'
                    : playerReady
                      ? 'hover:bg-surface-3 cursor-pointer'
                      : 'opacity-50 cursor-not-allowed'
                }`}
              >
                {/* Play indicator or track number */}
                <div className="w-5 shrink-0 flex items-center justify-center">
                  {isActive && isPlaying ? (
                    <div className="flex items-end gap-0.5 h-3">
                      <span className="w-0.75 h-full bg-[#1DB954] rounded-full animate-pulse" />
                      <span className="w-0.75 h-2/3 bg-[#1DB954] rounded-full animate-pulse [animation-delay:150ms]" />
                      <span className="w-0.75 h-1/3 bg-[#1DB954] rounded-full animate-pulse [animation-delay:300ms]" />
                    </div>
                  ) : isActive ? (
                    <Pause size={12} className="text-[#1DB954]" />
                  ) : (
                    <Play size={12} className="text-muted" />
                  )}
                </div>

                {track.albumArt ? (
                  <img
                    src={track.albumArt}
                    alt={track.album}
                    className={`w-10 h-10 rounded-md object-cover shrink-0 ${isActive ? 'ring-1 ring-[#1DB954]/50' : ''}`}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-surface-3 flex items-center justify-center shrink-0">
                    <Music size={16} className="text-faint" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? 'text-[#1DB954]' : 'text-foreground'}`}>
                    {track.name}
                  </p>
                  <p className="text-muted text-xs truncate">{track.artist}</p>
                </div>
                <span className="text-faint text-xs shrink-0">{formatDuration(track.durationMs)}</span>
              </button>
            );
          })}

          {hasMore && (
            <button
              onClick={() => setVisibleCount((prev) => Math.min(prev + 5, tracks.length))}
              className="w-full text-center py-2 min-h-11 text-muted text-xs hover:text-foreground transition-colors"
            >
              Show more ({tracks.length - visibleCount} remaining)
            </button>
          )}

          {/* Spotify attribution */}
          <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-border">
            <span className="text-faint text-[10px]">Powered by</span>
            <span className="text-[#1DB954] text-[10px] font-semibold">Spotify</span>
          </div>
        </div>
      )}
    </div>
  );
}
