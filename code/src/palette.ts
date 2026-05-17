const GOOGLE_COLORS = [
  "#4285F4",
  "#AA00FF",
  "#EA4335",
  "#FF6D00",
  "#FBBC05",
  "#34A853"
] as const;

type Rgb = {
  r: number;
  g: number;
  b: number;
};

function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const p = Math.max(0, Math.min(1, t));
  return {
    r: a.r + (b.r - a.r) * p,
    g: a.g + (b.g - a.g) * p,
    b: a.b + (b.b - a.b) * p
  };
}

function brighten(rgb: Rgb, amount: number): Rgb {
  const p = Math.max(-1, Math.min(1, amount));
  if (p >= 0) {
    return {
      r: rgb.r + (255 - rgb.r) * p,
      g: rgb.g + (255 - rgb.g) * p,
      b: rgb.b + (255 - rgb.b) * p
    };
  }

  return {
    r: rgb.r * (1 + p),
    g: rgb.g * (1 + p),
    b: rgb.b * (1 + p)
  };
}

export function particleColor(angle: number, speed: number, hueShift: number, alpha: number): string {
  const normalized = ((angle / (Math.PI * 2) + hueShift) % 1 + 1) % 1;
  const scaled = normalized * GOOGLE_COLORS.length;
  const index = Math.floor(scaled) % GOOGLE_COLORS.length;
  const next = (index + 1) % GOOGLE_COLORS.length;
  const color = mix(hexToRgb(GOOGLE_COLORS[index]), hexToRgb(GOOGLE_COLORS[next]), scaled - index);
  const lit = brighten(color, Math.min(0.2, speed / 1800));

  return `rgba(${lit.r.toFixed(0)}, ${lit.g.toFixed(0)}, ${lit.b.toFixed(0)}, ${alpha.toFixed(3)})`;
}

export function faintColor(angle: number, speed: number, hueShift: number, alpha: number): string {
  const normalized = ((angle / (Math.PI * 2) + hueShift + 0.08) % 1 + 1) % 1;
  const scaled = normalized * GOOGLE_COLORS.length;
  const index = Math.floor(scaled) % GOOGLE_COLORS.length;
  const next = (index + 1) % GOOGLE_COLORS.length;
  const color = mix(hexToRgb(GOOGLE_COLORS[index]), hexToRgb(GOOGLE_COLORS[next]), scaled - index);
  const lit = brighten(color, Math.min(0.35, speed / 1400));

  return `rgba(${lit.r.toFixed(0)}, ${lit.g.toFixed(0)}, ${lit.b.toFixed(0)}, ${alpha.toFixed(3)})`;
}
