import type { ReactNode, CSSProperties } from 'react';

/** Time-of-day → sky gradient + greeting (the brand's hour-of-day system). */
export function skyForHour(h: number): { grad: string; label: string; greet: string } {
  if (h < 8) return { grad: 'var(--gradient-sunrise)', label: 'Sunrise', greet: 'Good morning' };
  if (h < 17) return { grad: 'var(--gradient-day)', label: 'Midday', greet: 'Good afternoon' };
  if (h < 20) return { grad: 'var(--gradient-dusk)', label: 'Dusk', greet: 'Good evening' };
  return { grad: 'var(--gradient-night)', label: 'Night', greet: 'Good evening' };
}

interface SkyHeroProps {
  /** A `var(--gradient-*)` value. Defaults to sunrise. */
  grad?: string;
  height?: number;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Gradient wash band with a soft bottom vignette — the signature WorkIn surface. */
export function SkyHero({ grad, height = 196, children, className = '', style }: SkyHeroProps) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ height, background: grad ?? 'var(--gradient-sunrise)', ...style }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, transparent 38%, rgba(0,0,0,0.20))' }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
