import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useSpotify } from '../hooks/useSpotify';

export default function SpotifyCallbackPage() {
  const navigate = useNavigate();
  const { handleCallback } = useSpotify();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setErrorMsg(error === 'access_denied' ? 'You denied access to Spotify.' : `Spotify error: ${error}`);
      setTimeout(() => navigate('/settings'), 3000);
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMsg('No authorization code received.');
      setTimeout(() => navigate('/settings'), 3000);
      return;
    }

    handleCallback(code).then((success) => {
      if (success) {
        setStatus('success');
        setTimeout(() => navigate('/settings'), 1500);
      } else {
        setStatus('error');
        setErrorMsg('Failed to connect Spotify. Try again.');
        setTimeout(() => navigate('/settings'), 3000);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center justify-center h-dvh bg-black text-white gap-4">
      {status === 'loading' && (
        <>
          <Loader2 size={32} className="text-[#1DB954] animate-spin" />
          <p className="text-neutral-400">Connecting Spotify...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle size={32} className="text-[#1DB954]" />
          <p className="text-white font-medium">Spotify Connected!</p>
          <p className="text-neutral-500 text-sm">Redirecting to settings...</p>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle size={32} className="text-red-400" />
          <p className="text-red-400 font-medium">{errorMsg}</p>
          <p className="text-neutral-500 text-sm">Redirecting to settings...</p>
        </>
      )}
    </div>
  );
}
