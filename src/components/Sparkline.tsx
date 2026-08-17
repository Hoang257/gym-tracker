interface Props {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ values, width = 108, height = 30, color = 'var(--accent)' }: Props) {
  if (values.length === 0) return null;

  const pad = 3;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  if (values.length === 1) {
    const cx = width / 2;
    const cy = height / 2;
    return (
      <svg width={width} height={height} aria-hidden="true">
        <circle cx={cx} cy={cy} r={3} fill={color} />
      </svg>
    );
  }

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * w;
    const y = pad + (1 - (v - min) / span) * h;
    return [x, y] as const;
  });

  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];

  return (
    <svg width={width} height={height} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.6} fill={color} />
    </svg>
  );
}
