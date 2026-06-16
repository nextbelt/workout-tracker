import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, Loader2, Sparkles } from 'lucide-react';
import { SkyHero } from '../components/SkyHero';
import { enterGuestMode } from '../lib/guest';
import { HAS_BACKEND } from '../lib/supabase';

function startGuestDemo() {
  enterGuestMode();
  // Reload so the supabase client re-initializes as the in-memory mock.
  window.location.reload();
}

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
    <div className="flex flex-col min-h-dvh bg-bg">
      {/* Dusk sky welcome band */}
      <SkyHero grad="var(--gradient-dusk)" height={196}>
        <div className="absolute inset-0 flex items-end px-7 pb-6">
          <div>
            <span className="inline-flex items-baseline font-black tracking-tight text-3xl text-white">
              Work<span className="text-white/85">IN</span>
              <span className="w-2 h-2 bg-white rounded-full ml-0.5 mb-1 inline-block" />
            </span>
            <p className="font-serif italic font-light text-2xl text-white mt-2.5">Welcome back.</p>
          </div>
        </div>
      </SkyHero>

      <div className="flex-1 px-7 pt-7">
        {magicLinkSent ? (
          <div className="bg-brand/10 border border-brand/30 rounded-2xl p-5 text-center">
            <p className="text-brand font-bold text-lg">Check your email</p>
            <p className="text-muted text-sm mt-1">We sent you a magic link to sign in.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-4 py-3.5 min-h-12 text-foreground placeholder-neutral-500 focus:outline-none focus:border-brand transition-colors"
                autoComplete="email"
                required
              />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-4 py-3.5 min-h-12 text-foreground placeholder-neutral-500 focus:outline-none focus:border-brand transition-colors"
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
              className="w-full text-white font-semibold rounded-xl py-3.5 min-h-12 transition-transform active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'var(--gradient-brand)' }}
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={handleMagicLink}
              disabled={loading}
              className="w-full bg-surface-2 hover:bg-surface-3 text-secondary font-medium rounded-xl py-3.5 min-h-12 transition-colors disabled:opacity-50 border border-border"
            >
              Send Magic Link
            </button>

            <p className="text-center text-faint text-sm">
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

        {/* Guest / demo entry — works with or without a real backend */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-faint text-xs">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <button
          type="button"
          onClick={startGuestDemo}
          className="w-full bg-surface-2 hover:bg-surface-3 text-foreground font-semibold rounded-xl py-3.5 min-h-12 transition-colors border border-border flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <Sparkles size={18} className="text-brand" />
          Explore the demo — no account
        </button>
        <p className="text-center text-faint text-xs mt-2">
          {HAS_BACKEND
            ? 'Loads a sample program, history & nutrition. Nothing is saved.'
            : 'No backend configured — this loads a fully seeded local demo.'}
        </p>
      </div>
    </div>
  );
}
