import { Zap, Brain, TrendingUp, Dumbbell, Apple, Timer, ChevronRight } from 'lucide-react';
import { WorkInLogo } from '../components/WorkInLogo';

interface LandingPageProps {
  onGetStarted: () => void;
}

const FEATURES = [
  {
    icon: <Brain size={24} />,
    title: 'AI-Driven Programming',
    description: 'Smart block periodization with auto-rotation. Your program evolves as you do.',
  },
  {
    icon: <TrendingUp size={24} />,
    title: 'Progressive Overload Tracking',
    description: 'See exactly what you lifted last session. Every set, every rep, every pound.',
  },
  {
    icon: <Dumbbell size={24} />,
    title: 'Movement Pool Swaps',
    description: 'Swap exercises within the same movement pattern. Keep it fresh, stay on track.',
  },
  {
    icon: <Apple size={24} />,
    title: 'Macro Tracking',
    description: 'USDA-powered food search with barcode scanning. Protein is the hero metric.',
  },
  {
    icon: <Timer size={24} />,
    title: 'Smart Rest Timer',
    description: 'Auto-starts after each set. Alerts you when it\'s time to get back under the bar.',
  },
  {
    icon: <Zap size={24} />,
    title: 'Recovery Intelligence',
    description: 'Rate each session. Deload recommendations based on your recovery patterns.',
  },
];

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-dvh bg-black text-white overflow-y-auto">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-dvh px-6 py-20">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-150 h-150 bg-brand/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-brand/30 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
          <div className="mb-6 animate-fade-in">
            <WorkInLogo size="xl" />
          </div>

          <p className="text-neutral-400 text-xs tracking-[0.4em] uppercase mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            AI-Powered Training
          </p>

          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Stop guessing.
            <br />
            <span className="text-brand">Start WorkIN.</span>
          </h1>

          <p className="text-neutral-400 text-lg leading-relaxed mb-10 max-w-md animate-fade-in" style={{ animationDelay: '0.3s' }}>
            Hypertrophy programming that adapts to you. Track lifts, macros, and recovery — 
            all powered by insights from AI.
          </p>

          <button
            onClick={onGetStarted}
            className="group bg-brand hover:bg-brand-dark text-white font-bold text-lg rounded-2xl px-10 py-4 min-h-14 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,107,53,0.4)] flex items-center gap-3 animate-fade-in"
            style={{ animationDelay: '0.4s' }}
          >
            Get Started
            <ChevronRight size={20} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <span className="text-neutral-600 text-xs uppercase tracking-widest">Explore</span>
          <div className="w-5 h-8 rounded-full border-2 border-neutral-700 flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-brand rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* Tagline section */}
      <section className="px-6 py-24 bg-surface">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-6">
            It&apos;s not a work<span className="text-neutral-500">out</span>.
            <br />
            It&apos;s a Work<span className="text-brand">IN</span>.
          </h2>
          <p className="text-neutral-400 text-lg leading-relaxed max-w-xl mx-auto">
            WorkIN means working out with <span className="text-white font-semibold">IN</span>sight. 
            Every rep is tracked, every pattern analyzed, every session smarter than the last. 
            Your training journal meets AI coaching.
          </p>
        </div>
      </section>

      {/* Features grid */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-4">Built for lifters who mean business</h2>
          <p className="text-neutral-500 text-center mb-12">Everything you need. Nothing you don&apos;t.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="bg-surface-2 border border-border rounded-2xl p-6 hover:border-brand/30 transition-colors group"
              >
                <div className="w-12 h-12 bg-brand/10 text-brand rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-white font-bold mb-2">{feature.title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 bg-surface">
        <div className="max-w-xl mx-auto text-center">
          <WorkInLogo size="md" className="justify-center mb-6" />
          <h2 className="text-2xl font-black mb-4">Ready to level up?</h2>
          <p className="text-neutral-400 mb-8">
            Free. No credit card. Just start lifting smarter.
          </p>
          <button
            onClick={onGetStarted}
            className="bg-brand hover:bg-brand-dark text-white font-bold rounded-2xl px-10 py-4 min-h-14 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,107,53,0.4)]"
          >
            Let&apos;s WorkIN
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <WorkInLogo size="sm" />
          <p className="text-neutral-600 text-xs">&copy; 2026 WorkIn.ai</p>
        </div>
      </footer>
    </div>
  );
}
