export function WorkInLogo({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizes = {
    sm: { text: 'text-xl', dot: 'w-1.5 h-1.5' },
    md: { text: 'text-3xl', dot: 'w-2 h-2' },
    lg: { text: 'text-5xl', dot: 'w-3 h-3' },
    xl: { text: 'text-7xl', dot: 'w-4 h-4' },
  };

  const s = sizes[size];

  return (
    <span className={`inline-flex items-baseline font-black tracking-tight ${s.text} ${className}`}>
      <span className="text-foreground">Work</span>
      <span className="text-brand">IN</span>
      <span className={`${s.dot} bg-brand rounded-full ml-0.5 mb-1 inline-block`} />
    </span>
  );
}
