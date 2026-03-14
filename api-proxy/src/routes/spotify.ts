import { Router, Request, Response } from 'express';

export const spotifyRouter = Router();

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
].join(' ');

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

interface SpotifyUserProfile {
  id: string;
  display_name: string | null;
  email: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; width: number; height: number }>;
  };
  external_urls: { spotify: string };
  preview_url: string | null;
  duration_ms: number;
}

interface RecommendationsResponse {
  tracks: SpotifyTrack[];
}

interface NormalizedTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  spotifyUrl: string;
  previewUrl: string | null;
  durationMs: number;
}

function getCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, or SPOTIFY_REDIRECT_URI');
  }
  return { clientId, clientSecret, redirectUri };
}

// GET /api/spotify/auth-url — returns the Spotify OAuth URL for the frontend to redirect to
spotifyRouter.get('/auth-url', (_req: Request, res: Response) => {
  try {
    const { clientId, redirectUri } = getCredentials();
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: SCOPES,
      redirect_uri: redirectUri,
      show_dialog: 'true',
    });
    res.json({ url: `${SPOTIFY_AUTH_URL}?${params.toString()}` });
  } catch (err) {
    console.error('[spotify/auth-url]', err);
    res.status(500).json({ error: 'Spotify not configured' });
  }
});

// POST /api/spotify/callback — exchange auth code for tokens
spotifyRouter.post('/callback', async (req: Request, res: Response) => {
  const { code } = req.body as { code?: string };
  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }

  try {
    const { clientId, clientSecret, redirectUri } = getCredentials();

    // Exchange code for tokens
    const tokenRes = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('[spotify/callback] token exchange failed:', err);
      res.status(400).json({ error: 'Token exchange failed' });
      return;
    }

    const tokens = (await tokenRes.json()) as SpotifyTokenResponse;

    // Fetch user profile
    const profileRes = await fetch(`${SPOTIFY_API_BASE}/me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) {
      res.status(400).json({ error: 'Failed to fetch Spotify profile' });
      return;
    }

    const profile = (await profileRes.json()) as SpotifyUserProfile;

    res.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? '',
      expires_in: tokens.expires_in,
      spotify_user_id: profile.id,
      display_name: profile.display_name ?? profile.id,
      scopes: tokens.scope.split(' '),
    });
  } catch (err) {
    console.error('[spotify/callback]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/spotify/refresh — refresh an expired access token
spotifyRouter.post('/refresh', async (req: Request, res: Response) => {
  const { refresh_token } = req.body as { refresh_token?: string };
  if (!refresh_token) {
    res.status(400).json({ error: 'Missing refresh token' });
    return;
  }

  try {
    const { clientId, clientSecret } = getCredentials();

    const tokenRes = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('[spotify/refresh] failed:', err);
      res.status(400).json({ error: 'Token refresh failed' });
      return;
    }

    const tokens = (await tokenRes.json()) as SpotifyTokenResponse;
    res.json({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
      refresh_token: tokens.refresh_token ?? refresh_token,
    });
  } catch (err) {
    console.error('[spotify/refresh]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mood → Spotify audio feature mapping
const MOOD_PARAMS: Record<string, {
  seed_genres: string;
  target_energy: number;
  target_valence: number;
  min_tempo: number;
  max_tempo: number;
}> = {
  fired_up: {
    seed_genres: 'work-out,edm,hip-hop',
    target_energy: 0.9,
    target_valence: 0.8,
    min_tempo: 130,
    max_tempo: 180,
  },
  steady: {
    seed_genres: 'rock,pop,electronic',
    target_energy: 0.7,
    target_valence: 0.6,
    min_tempo: 110,
    max_tempo: 145,
  },
  low: {
    seed_genres: 'indie,chill,r-n-b',
    target_energy: 0.5,
    target_valence: 0.4,
    min_tempo: 90,
    max_tempo: 125,
  },
  beat_up: {
    seed_genres: 'ambient,chill,acoustic',
    target_energy: 0.3,
    target_valence: 0.3,
    min_tempo: 60,
    max_tempo: 100,
  },
};

// GET /api/spotify/recommendations?mood=fired_up&access_token=xxx
spotifyRouter.get('/recommendations', async (req: Request, res: Response) => {
  const mood = String(req.query['mood'] ?? 'steady');
  const accessToken = String(req.query['access_token'] ?? '');

  if (!accessToken) {
    res.status(401).json({ error: 'Missing access token' });
    return;
  }

  const params = MOOD_PARAMS[mood] ?? MOOD_PARAMS['steady'];

  try {
    const queryParams = new URLSearchParams({
      seed_genres: params.seed_genres,
      target_energy: String(params.target_energy),
      target_valence: String(params.target_valence),
      min_tempo: String(params.min_tempo),
      max_tempo: String(params.max_tempo),
      limit: '20',
    });

    const recRes = await fetch(`${SPOTIFY_API_BASE}/recommendations?${queryParams.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!recRes.ok) {
      const errText = await recRes.text();
      console.error('[spotify/recommendations] API error:', recRes.status, errText);
      if (recRes.status === 401) {
        res.status(401).json({ error: 'Token expired', needsRefresh: true });
        return;
      }
      res.status(recRes.status).json({ error: 'Spotify API error' });
      return;
    }

    const data = (await recRes.json()) as RecommendationsResponse;

    const tracks: NormalizedTrack[] = data.tracks.map((t) => ({
      id: t.id,
      name: t.name,
      artist: t.artists.map((a) => a.name).join(', '),
      album: t.album.name,
      albumArt: t.album.images[1]?.url ?? t.album.images[0]?.url ?? '',
      spotifyUrl: t.external_urls.spotify,
      previewUrl: t.preview_url,
      durationMs: t.duration_ms,
    }));

    res.json({ tracks, mood });
  } catch (err) {
    console.error('[spotify/recommendations]', err);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});
