import { useState } from 'react';
import { Music, ExternalLink, Loader2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import type { SpotifyTrack } from '../hooks/useSpotify';
import type { PreMood } from '../types/database';

interface SpotifyMoodPlaylistProps {
  tracks: SpotifyTrack[];
  mood: PreMood;
  loading: boolean;
  error: string | null;
  onRefresh: (mood: PreMood) => void;
}

const MOOD_LABELS: Record<PreMood, string> = {
  fired_up: '🔥 Fired Up',
  steady: '💪 Steady',
  low: '😐 Low Energy',
  beat_up: '🧊 Recovery',
};

const MOOD_DESCRIPTIONS: Record<PreMood, string> = {
  fired_up: 'High energy bangers to match your intensity',
  steady: 'Solid tempo tracks to keep you locked in',
  low: 'Chill beats to ease into the session',
  beat_up: 'Low-key vibes for active recovery',
};

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SpotifyMoodPlaylist({ tracks, mood, loading, error, onRefresh }: SpotifyMoodPlaylistProps) {
  const [expanded, setExpanded] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);

  if (loading) {
    return (
      <div className="bg-surface-2 rounded-xl p-4 flex items-center justify-center gap-2">
        <Loader2 size={18} className="text-[#1DB954] animate-spin" />
        <span className="text-neutral-400 text-sm">Loading your playlist...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-2 rounded-xl p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (tracks.length === 0) return null;

  const displayTracks = tracks.slice(0, visibleCount);
  const hasMore = visibleCount < tracks.length;

  return (
    <div className="bg-surface-2 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 min-h-11"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1DB954]/15 flex items-center justify-center">
            <Music size={16} className="text-[#1DB954]" />
          </div>
          <div className="text-left">
            <p className="text-white font-medium text-sm">{MOOD_LABELS[mood]} Playlist</p>
            <p className="text-neutral-500 text-xs">{MOOD_DESCRIPTIONS[mood]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onRefresh(mood); }}
            className="p-2 min-h-11 min-w-11 hover:bg-surface-3 rounded-lg transition-colors flex items-center justify-center"
          >
            <RefreshCw size={14} className="text-neutral-500" />
          </button>
          {expanded
            ? <ChevronUp size={18} className="text-neutral-500" />
            : <ChevronDown size={18} className="text-neutral-500" />
          }
        </div>
      </button>

      {/* Track list */}
      {expanded && (
        <div className="px-4 pb-4 space-y-1">
          {displayTracks.map((track, i) => (
            <a
              key={track.id}
              href={track.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-3 transition-colors group min-h-11"
            >
              <span className="text-neutral-600 text-xs w-5 text-right shrink-0">{i + 1}</span>
              {track.albumArt ? (
                <img
                  src={track.albumArt}
                  alt={track.album}
                  className="w-10 h-10 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-surface-3 flex items-center justify-center shrink-0">
                  <Music size={16} className="text-neutral-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{track.name}</p>
                <p className="text-neutral-500 text-xs truncate">{track.artist}</p>
              </div>
              <span className="text-neutral-600 text-xs shrink-0">{formatDuration(track.durationMs)}</span>
              <ExternalLink size={12} className="text-neutral-600 group-hover:text-[#1DB954] transition-colors shrink-0" />
            </a>
          ))}

          {hasMore && (
            <button
              onClick={() => setVisibleCount((prev) => Math.min(prev + 5, tracks.length))}
              className="w-full text-center py-2 min-h-11 text-neutral-500 text-xs hover:text-neutral-300 transition-colors"
            >
              Show more ({tracks.length - visibleCount} remaining)
            </button>
          )}

          {/* Spotify attribution */}
          <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-border">
            <span className="text-neutral-600 text-[10px]">Powered by</span>
            <span className="text-[#1DB954] text-[10px] font-semibold">Spotify</span>
          </div>
        </div>
      )}
    </div>
  );
}
