export type Vec2 = {
  x: number;
  y: number;
};

export type Viewport = {
  width: number;
  height: number;
  dpr: number;
};

export type PointerState = {
  x: number;
  y: number;
  active: boolean;
  swirlBias: number;
};

export type BurstParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  seed: number;
  baseLength: number;
  baseWidth: number;
  hueShift: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  seed: number;
  baseLength: number;
  baseWidth: number;
  phase: number;
  hueShift: number;
};

export type DebugSample = {
  fps: number;
  particles: number;
};
