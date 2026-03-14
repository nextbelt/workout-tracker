import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { WorkInLogo } from '../components/WorkInLogo';

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
    <div className="flex flex-col items-center justify-center min-h-dvh bg-black px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <WorkInLogo size="lg" />
        </div>

        {magicLinkSent ? (
          <div className="bg-brand/10 border border-brand/30 rounded-2xl p-5 text-center">
            <p className="text-brand font-bold text-lg">Check your email</p>
            <p className="text-neutral-400 text-sm mt-1">We sent you a magic link to sign in.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-4 py-3.5 min-h-12 text-white placeholder-neutral-500 focus:outline-none focus:border-brand transition-colors"
                autoComplete="email"
                required
              />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-4 py-3.5 min-h-12 text-white placeholder-neutral-500 focus:outline-none focus:border-brand transition-colors"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
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
              className="w-full bg-brand hover:bg-brand-dark text-white font-bold rounded-xl py-3.5 min-h-12 transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(255,107,53,0.3)]"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={handleMagicLink}
              disabled={loading}
              className="w-full bg-surface-2 hover:bg-surface-3 text-neutral-300 font-medium rounded-xl py-3.5 min-h-12 transition-colors disabled:opacity-50 border border-border"
            >
              Send Magic Link
            </button>

            <p className="text-center text-neutral-500 text-sm">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                className="text-brand hover:text-brand-light min-h-11 min-w-11 inline-flex items-center font-semibold"
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
