import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { signIn, signUp, signInWithMagicLink } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = isSignUp ? await signUp(email, password) : await signIn(email, password);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  const handleMagicLink = async () => {
    if (!email) { setError('Enter your email first'); return; }
    setError(null);
    setLoading(true);
    const result = await signInWithMagicLink(email);
    if (result.error) setError(result.error);
    else setMagicLinkSent(true);
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-zinc-950 px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-zinc-100 text-center mb-1">Workout Tracker</h1>
        <p className="text-zinc-400 text-center mb-8">Hypertrophy-focused training + macro tracking</p>

        {magicLinkSent ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
            <p className="text-emerald-400 font-medium">Magic link sent!</p>
            <p className="text-zinc-400 text-sm mt-1">Check your email to sign in.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 min-h-11 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 min-h-11 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-3 min-h-11 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={handleMagicLink}
              disabled={loading}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl py-3 min-h-11 transition-colors disabled:opacity-50"
            >
              Send Magic Link
            </button>

            <p className="text-center text-zinc-500 text-sm">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                className="text-emerald-400 hover:text-emerald-300 min-h-11 min-w-11 inline-flex items-center"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
