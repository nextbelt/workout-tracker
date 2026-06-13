import { Sparkles, HeartPulse, Salad, Waves, TrendingUp, Dumbbell, ArrowRight } from 'lucide-react';
import { WorkInLogo } from '../components/WorkInLogo';
import { SkyHero } from '../components/SkyHero';

interface LandingPageProps {
  onGetStarted: () => void;
}

const FEATURES = [
  { icon: <Sparkles size={22} />, title: 'Adaptive programming', description: 'Block periodization that evolves with your energy, recovery, and time.' },
  { icon: <HeartPulse size={22} />, title: 'Recovery intelligence', description: 'Readiness-aware training that knows when to push and when to rest.' },
  { icon: <TrendingUp size={22} />, title: 'Progressive overload', description: 'See exactly what you lifted last time — every set, rep, and pound.' },
  { icon: <Salad size={22} />, title: 'Nourishment, not dieting', description: 'Protein-forward guidance that fits the life you actually live.' },
  { icon: <Dumbbell size={22} />, title: 'Movement pool swaps', description: 'Swap within the same pattern. Keep it fresh, stay on track.' },
  { icon: <Waves size={22} />, title: 'Restore rituals', description: 'Rest timers, recovery ratings, and deloads — recovery as practice.' },
];

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-dvh bg-bg text-foreground overflow-y-auto">
      {/* Hero — sunrise sky wash */}
      <section className="relative">
        <SkyHero grad="var(--gradient-sunrise)" height={440}>
          <div className="absolute inset-0 px-7 pt-16 pb-8 flex flex-col">
            <span className="inline-flex items-baseline font-black tracking-tight text-3xl text-white">
              Work<span className="text-white/85">IN</span>
              <span className="w-2 h-2 bg-white rounded-full ml-0.5 mb-1 inline-block" />
            </span>
            <div className="flex-1" />
            <p className="text-white/90 text-[11px] tracking-[0.28em] uppercase font-bold mb-3.5">
              A Healthy Way of Life
            </p>
            <h1 className="font-serif font-light text-white text-[42px] leading-[1.04] tracking-tight" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.18)' }}>
              Find your<br />
              <span className="italic font-normal">healthy</span> way of life
            </h1>
          </div>
        </SkyHero>

        {/* Floating CTA card overlapping the hero */}
        <div className="px-5 -mt-7 relative">
          <div className="bg-surface rounded-2xl p-5" style={{ boxShadow: 'var(--shadow-float)' }}>
            <p className="text-secondary text-[15px] leading-relaxed mb-4">
              Strength, recovery, and nourishment woven into one calm daily ritual — guided, and quietly intelligent.
            </p>
            <button
              onClick={onGetStarted}
              className="group w-full text-white font-semibold text-base rounded-xl py-3.5 min-h-12 flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
              style={{ background: 'var(--gradient-brand)' }}
            >
              Begin your practice
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Editorial line */}
      <section className="px-7 pt-11 pb-7 text-center">
        <p className="text-brand-dark text-[11px] tracking-[0.28em] uppercase font-bold mb-3.5">The practice</p>
        <h2 className="font-serif font-light text-[28px] leading-snug text-foreground">
          It&apos;s not a workout.<br />
          It&apos;s a <span className="italic text-brand-dark">way of living.</span>
        </h2>
      </section>

      {/* Features */}
      <section className="px-5 pb-12">
        <div className="flex flex-col gap-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex gap-4 items-start bg-surface border border-border rounded-xl p-4"
              style={{ boxShadow: 'var(--shadow-soft)' }}
            >
              <div
                className="w-11 h-11 rounded-xl text-white flex items-center justify-center shrink-0"
                style={{ background: 'var(--gradient-sunrise)' }}
              >
                {f.icon}
              </div>
              <div>
                <div className="font-semibold text-[15px] text-foreground mb-0.5">{f.title}</div>
                <div className="text-muted text-[13px] leading-relaxed">{f.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-7 pb-14 text-center">
        <WorkInLogo size="md" className="justify-center mb-5" />
        <h2 className="font-serif font-light text-2xl mb-3 text-foreground">Ready to begin?</h2>
        <p className="text-muted mb-7">Free. No credit card. Just start living well.</p>
        <button
          onClick={onGetStarted}
          className="text-white font-semibold rounded-xl px-9 py-3.5 min-h-12 transition-transform active:scale-[0.99]"
          style={{ background: 'var(--gradient-brand)' }}
        >
          Let&apos;s WorkIN
        </button>
      </section>

      {/* Footer */}
      <footer className="px-7 py-8 border-t border-border flex items-center justify-between">
        <WorkInLogo size="sm" />
        <p className="text-faint text-xs">&copy; 2026 WorkIn</p>
      </footer>
    </div>
  );
}
