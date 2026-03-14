import { useState, useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ScienceTooltipProps {
  term: string;
  children: React.ReactNode;
}

interface CachedTooltip {
  definition: string;
  citation: string | null;
}

// In-memory cache to avoid re-fetching
const tooltipCache = new Map<string, CachedTooltip | null>();

export function ScienceTooltip({ term, children }: ScienceTooltipProps) {
  const [show, setShow] = useState(false);
  const [tooltip, setTooltip] = useState<CachedTooltip | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;

    const cached = tooltipCache.get(term);
    if (cached !== undefined) {
      setTooltip(cached);
      return;
    }

    setLoading(true);
    supabase
      .from('concept_tooltips')
      .select('definition, source_citation')
      .eq('term', term)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { definition: string; source_citation: string | null } | null;
        const result = row ? { definition: row.definition, citation: row.source_citation } : null;
        tooltipCache.set(term, result);
        setTooltip(result);
        setLoading(false);
      });
  }, [show, term]);

  // Close on outside click
  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show]);

  return (
    <span className="relative inline-flex items-center" ref={ref}>
      <button
        onClick={() => setShow(!show)}
        className="inline-flex items-center gap-0.5 text-brand/70 hover:text-brand transition-colors"
      >
        {children}
        <Info size={12} className="shrink-0" />
      </button>

      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50">
          <div className="bg-surface-3 border border-border-2 rounded-xl p-3 shadow-xl animate-fade-in">
            <p className="text-brand text-xs font-semibold mb-1">{term}</p>
            {loading ? (
              <p className="text-neutral-500 text-xs">Loading...</p>
            ) : tooltip ? (
              <>
                <p className="text-neutral-300 text-xs leading-relaxed">{tooltip.definition}</p>
                {tooltip.citation && (
                  <p className="text-neutral-600 text-[10px] mt-1.5">{tooltip.citation}</p>
                )}
              </>
            ) : (
              <p className="text-neutral-500 text-xs">No definition available.</p>
            )}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-3 border-r border-b border-border-2 rotate-45 -mt-1" />
          </div>
        </div>
      )}
    </span>
  );
}
