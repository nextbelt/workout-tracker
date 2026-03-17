import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { SpotifyMood } from '../components/SpotifyMoodPlaylist';

const API_BASE = (import.meta.env.VITE_API_PROXY_URL as string) ?? 'http://localhost:3001';

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  spotifyUrl: string;
  previewUrl: string | null;
  durationMs: number;
}

interface SpotifyConnection {
  id: string;
  spotify_user_id: string;
  display_name: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  scopes: string[];
}

export function useSpotify() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<SpotifyConnection | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing connection
  useEffect(() => {
    if (!user) { setConnection(null); return; }

    const load = async () => {
      const { data } = await supabase
        .from('spotify_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setConnection(data as unknown as SpotifyConnection | null);
    };

    load();
  }, [user]);

  // Initiate OAuth flow
  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const callbackUri = `${window.location.origin}/spotify/callback`;
      const res = await fetch(`${API_BASE}/api/spotify/auth-url?redirect_uri=${encodeURIComponent(callbackUri)}`);
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Failed to get auth URL');
      }
    } catch {
      setError('Failed to connect to Spotify');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle OAuth callback — exchange code for tokens and save
  const handleCallback = useCallback(async (code: string): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    setError(null);

    try {
      const callbackUri = `${window.location.origin}/spotify/callback`;
      const res = await fetch(`${API_BASE}/api/spotify/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: callbackUri }),
      });

      if (!res.ok) {
        setError('Failed to exchange authorization code');
        return false;
      }

      const data = (await res.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        spotify_user_id: string;
        display_name: string;
        scopes: string[];
      };

      const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      // Upsert into spotify_connections
      const { error: dbError } = await supabase
        .from('spotify_connections')
        .upsert({
          user_id: user.id,
          spotify_user_id: data.spotify_user_id,
          display_name: data.display_name,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_expires_at: expiresAt,
          scopes: data.scopes,
          updated_at: new Date().toISOString(),
        } as never, { onConflict: 'user_id' });

      if (dbError) {
        console.error('[useSpotify] save error:', dbError);
        setError('Failed to save Spotify connection');
        return false;
      }

      // Reload connection
      const { data: conn } = await supabase
        .from('spotify_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setConnection(conn as unknown as SpotifyConnection | null);
      return true;
    } catch {
      setError('Failed to connect to Spotify');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refresh access token if expired
  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!connection || !user) return null;

    const isExpired = new Date(connection.token_expires_at) <= new Date();
    if (!isExpired) return connection.access_token;

    try {
      const res = await fetch(`${API_BASE}/api/spotify/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: connection.refresh_token }),
      });

      if (!res.ok) return null;

      const data = (await res.json()) as {
        access_token: string;
        expires_in: number;
        refresh_token: string;
      };

      const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      await supabase
        .from('spotify_connections')
        .update({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('user_id', user.id);

      setConnection((prev) => prev ? {
        ...prev,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: expiresAt,
      } : null);

      return data.access_token;
    } catch {
      return null;
    }
  }, [connection, user]);

  // Fetch mood-based recommendations
  const fetchRecommendations = useCallback(async (mood: SpotifyMood) => {
    if (!connection) return;
    setLoadingTracks(true);
    setError(null);

    try {
      let token = connection.access_token;

      // Refresh if needed
      const isExpired = new Date(connection.token_expires_at) <= new Date();
      if (isExpired) {
        const refreshed = await refreshToken();
        if (!refreshed) {
          setError('Session expired — reconnect Spotify in Settings');
          return;
        }
        token = refreshed;
      }

      const res = await fetch(
        `${API_BASE}/api/spotify/recommendations?mood=${encodeURIComponent(mood)}&access_token=${encodeURIComponent(token)}`
      );

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string; needsRefresh?: boolean };
        if (errData.needsRefresh) {
          const refreshed = await refreshToken();
          if (refreshed) {
            // Retry once
            const retryRes = await fetch(
              `${API_BASE}/api/spotify/recommendations?mood=${encodeURIComponent(mood)}&access_token=${encodeURIComponent(refreshed)}`
            );
            if (retryRes.ok) {
              const retryData = (await retryRes.json()) as { tracks: SpotifyTrack[] };
              setTracks(retryData.tracks);
              return;
            }
          }
          setError('Session expired — reconnect Spotify in Settings');
          return;
        }
        setError(errData.error ?? 'Failed to load recommendations');
        return;
      }

      const data = (await res.json()) as { tracks: SpotifyTrack[] };
      setTracks(data.tracks);
    } catch {
      setError('Failed to load recommendations');
    } finally {
      setLoadingTracks(false);
    }
  }, [connection, refreshToken]);

  // Get a valid (non-expired) access token, refreshing if needed
  const getValidToken = useCallback(async (): Promise<string | null> => {
    if (!connection) return null;
    const isExpired = new Date(connection.token_expires_at) <= new Date();
    if (!isExpired) return connection.access_token;
    return refreshToken();
  }, [connection, refreshToken]);

  // Disconnect Spotify
  const disconnect = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('spotify_connections')
      .delete()
      .eq('user_id', user.id);
    setConnection(null);
    setTracks([]);
  }, [user]);

  return {
    isConnected: !!connection,
    connection,
    accessToken: connection?.access_token ?? null,
    tracks,
    loading,
    loadingTracks,
    error,
    connect,
    handleCallback,
    getValidToken,
    fetchRecommendations,
    disconnect,
  };
}
