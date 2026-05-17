import { faintColor, particleColor } from "./palette";
import type { BurstParticle, DebugSample, Particle, PointerState, Vec2, Viewport } from "./types";

const TWO_PI = Math.PI * 2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mulberry32(seed: number): () => number {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothNoise(x: number, y: number, time: number, seed: number): number {
  const a = Math.sin(x * 1.72 + time * 0.92 + seed * 5.31);
  const b = Math.cos(y * 1.41 - time * 1.13 + seed * 4.17);
  const c = Math.sin((x + y) * 0.77 + time * 1.71 + seed * 2.43);
  return (a + b + c) / 6 + 0.5;
}

export class ParticleSystem {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly particles: Particle[] = [];
  private readonly bursts: BurstParticle[] = [];
  private readonly rng = mulberry32(0x8a4f2d);
  private readonly pointer: PointerState = {
    x: 0,
    y: 0,
    active: false,
    swirlBias: 0
  };
  private readonly fieldOffset: Vec2 = { x: 0, y: 0 };
  private readonly pointerVelocity: Vec2 = { x: 0, y: 0 };
  private readonly previousPointer: Vec2 = { x: 0, y: 0 };
  private hasPreviousPointer = false;

  private viewport: Viewport = {
    width: 1,
    height: 1,
    dpr: 1
  };

  private lastTime = 0;
  private frameHandle = 0;
  private running = false;
  private fps = 0;
  private fpsFrames = 0;
  private fpsTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
      throw new Error("Canvas 2D context is not available.");
    }

    this.canvas = canvas;
    this.ctx = ctx;
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.resize();
    this.lastTime = performance.now();
    this.frameHandle = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameHandle);
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.viewport = { width, height, dpr };
    this.canvas.width = Math.max(1, Math.floor(width * dpr));
    this.canvas.height = Math.max(1, Math.floor(height * dpr));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.reseedParticles();
  }

  setPointer(x: number, y: number, active = true): void {
    if (this.hasPreviousPointer) {
      this.pointerVelocity.x = lerp(this.pointerVelocity.x, (x - this.previousPointer.x) * 60, 0.28);
      this.pointerVelocity.y = lerp(this.pointerVelocity.y, (y - this.previousPointer.y) * 60, 0.28);
    }

    this.previousPointer.x = x;
    this.previousPointer.y = y;
    this.hasPreviousPointer = true;
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.active = active;
    const center = this.center();
    const dx = x - center.x;
    const dy = y - center.y;
    this.pointer.swirlBias = clamp((dx * 0.0009 + dy * 0.00035), -0.42, 0.42);
  }

  clearPointer(): void {
    this.pointer.active = false;
    this.pointer.swirlBias = 0;
    this.hasPreviousPointer = false;
  }

  burst(x: number, y: number): void {
    for (let i = 0; i < 20; i += 1) {
      const angle = this.rng() * TWO_PI;
      const speed = lerp(150, 300, this.rng());
      this.bursts.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: lerp(0.72, 1.18, this.rng()),
        seed: this.rng(),
        baseLength: lerp(6, 11, this.rng()),
        baseWidth: lerp(1.15, 1.85, this.rng()),
        hueShift: this.rng()
      });
    }
  }

  sample(): DebugSample {
    return {
      fps: this.fps,
      particles: this.particles.length + this.bursts.length
    };
  }

  private readonly tick = (now: number): void => {
    if (!this.running) {
      return;
    }

    const dt = Math.min(0.025, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.updateFps(dt);
    this.update(dt, now / 1000);
    this.draw(now / 1000);
    this.frameHandle = requestAnimationFrame(this.tick);
  };

  private updateFps(dt: number): void {
    this.fpsFrames += 1;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.35) {
      this.fps = Math.round(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }

  private center(): Vec2 {
    return {
      x: this.viewport.width * 0.5,
      y: this.viewport.height * 0.49
    };
  }

  private interactiveCenter(dt: number): Vec2 {
    const base = this.center();
    const targetX = this.pointer.active
      ? clamp((this.pointer.x - base.x) * 0.16, -this.viewport.width * 0.1, this.viewport.width * 0.1)
      : 0;
    const targetY = this.pointer.active
      ? clamp((this.pointer.y - base.y) * 0.13, -this.viewport.height * 0.1, this.viewport.height * 0.1)
      : 0;
    const ease = 1 - Math.exp(-dt * 4.2);

    this.fieldOffset.x = lerp(this.fieldOffset.x, targetX, ease);
    this.fieldOffset.y = lerp(this.fieldOffset.y, targetY, ease);
    this.pointerVelocity.x *= Math.exp(-dt * 4.8);
    this.pointerVelocity.y *= Math.exp(-dt * 4.8);

    return {
      x: base.x + this.fieldOffset.x,
      y: base.y + this.fieldOffset.y
    };
  }

  private targetCount(): number {
    const area = this.viewport.width * this.viewport.height;
    const byArea = Math.round(area / 2100);
    return clamp(byArea, 800, 1200);
  }

  private reseedParticles(): void {
    const count = this.targetCount();
    this.particles.length = 0;

    for (let i = 0; i < count; i += 1) {
      this.particles.push(this.createParticle(i / count));
    }
  }

  private createParticle(indexRatio: number): Particle {
    const center = this.center();
    const radius = this.pickRadius();
    const angle = indexRatio * TWO_PI + this.rng() * 0.85;
    const orbitSpeed = lerp(120, 320, this.rng());

    return {
      x: center.x + Math.cos(angle) * radius + lerp(-38, 38, this.rng()),
      y: center.y + Math.sin(angle) * radius * 0.78 + lerp(-34, 34, this.rng()),
      vx: -Math.sin(angle) * orbitSpeed,
      vy: Math.cos(angle) * orbitSpeed,
      ax: 0,
      ay: 0,
      seed: this.rng(),
      baseLength: lerp(5.5, 10.5, this.rng()),
      baseWidth: lerp(1.05, 1.75, this.rng()),
      phase: this.rng() * TWO_PI,
      hueShift: this.rng() * 0.14
    };
  }

  private pickRadius(): number {
    const maxRadius = Math.hypot(this.viewport.width, this.viewport.height) * 0.62;
    const minRadius = 160;
    const t = Math.pow(this.rng(), 0.66);
    return lerp(minRadius, maxRadius, t);
  }

  private update(dt: number, time: number): void {
    const baseCenter = this.center();
    const center = this.interactiveCenter(dt);
    const mouseStrength = 18000;
    const localMouseRadius = 360;
    const localMouseRadiusSq = localMouseRadius * localMouseRadius;
    const broadMouseRadius = clamp(Math.max(this.viewport.width, this.viewport.height) * 0.52, 560, 980);
    const broadMouseRadiusSq = broadMouseRadius * broadMouseRadius;

    for (const particle of this.particles) {
      const rx = particle.x - center.x;
      const ry = particle.y - center.y;
      const d = Math.max(Math.hypot(rx, ry), 0.0001);
      const tx = -ry / d;
      const ty = rx / d;
      const currentTangent = particle.vx * tx + particle.vy * ty;
      const targetTangent = 300 * Math.exp(-d / 400) * (1 + this.pointer.swirlBias);
      const tangentAccel = (targetTangent - currentTangent) / 0.2;

      const desiredRadius = 210 + 34 * Math.sin(time * 0.33 + particle.phase);
      const radialAccel = -(d - desiredRadius) * 2.0;
      const nx = smoothNoise(particle.x / 100, particle.y / 100, time, particle.seed);
      const ny = smoothNoise(particle.y / 115, particle.x / 95, time + 12.7, particle.seed + 0.37);

      particle.ax = tx * tangentAccel + (rx / d) * radialAccel + (nx - 0.5) * 400;
      particle.ay = ty * tangentAccel + (ry / d) * radialAccel + (ny - 0.5) * 400;

      if (this.pointer.active) {
        const mx = particle.x - this.pointer.x;
        const my = particle.y - this.pointer.y;
        const mdSq = mx * mx + my * my;

        if (mdSq < broadMouseRadiusSq) {
          const md = Math.sqrt(mdSq) || 1;
          const toMouseX = -mx / md;
          const toMouseY = -my / md;
          const broadFalloff = Math.pow(1 - md / broadMouseRadius, 1.35);
          const edgeWeight = clamp((d - 260) / 620, 0, 1);

          // Broad cursor wake: keeps the outer ring and white-space particles connected to pointer motion.
          particle.ax += toMouseX * 58 * broadFalloff;
          particle.ay += toMouseY * 58 * broadFalloff;
          particle.ax += (-toMouseY) * 74 * broadFalloff;
          particle.ay += toMouseX * 74 * broadFalloff;
          particle.ax += this.pointerVelocity.x * 0.24 * broadFalloff * (0.45 + edgeWeight);
          particle.ay += this.pointerVelocity.y * 0.24 * broadFalloff * (0.45 + edgeWeight);
          particle.ax += (this.pointer.x - baseCenter.x) * 0.1 * edgeWeight;
          particle.ay += (this.pointer.y - baseCenter.y) * 0.08 * edgeWeight;
        }

        if (mdSq < localMouseRadiusSq) {
          const md = Math.sqrt(mdSq) || 1;
          const falloff = 1 - md / localMouseRadius;
          const repel = mouseStrength / (mdSq + 100) * falloff;
          particle.ax += (mx / md) * repel * 95;
          particle.ay += (my / md) * repel * 95;
          particle.ax += (-my / md) * repel * 24;
          particle.ay += (mx / md) * repel * 24;
        }
      }

      this.applyBoundaryForce(particle, center);

      particle.vx += particle.ax * dt;
      particle.vy += particle.ay * dt;
      particle.vx *= 0.992;
      particle.vy *= 0.992;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;

      if (this.isFarOutside(particle.x, particle.y)) {
        this.resetParticle(particle);
      }
    }

    this.updateBursts(dt, time);
  }

  private applyBoundaryForce(particle: Particle, center: Vec2): void {
    const margin = 36;
    let outside = false;

    if (particle.x < margin) {
      particle.ax += (margin - particle.x) * 11;
      outside = true;
    } else if (particle.x > this.viewport.width - margin) {
      particle.ax -= (particle.x - (this.viewport.width - margin)) * 11;
      outside = true;
    }

    if (particle.y < margin) {
      particle.ay += (margin - particle.y) * 11;
      outside = true;
    } else if (particle.y > this.viewport.height - margin) {
      particle.ay -= (particle.y - (this.viewport.height - margin)) * 11;
      outside = true;
    }

    if (outside) {
      particle.ax += (center.x - particle.x) * 0.9;
      particle.ay += (center.y - particle.y) * 0.9;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    }
  }

  private updateBursts(dt: number, time: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i -= 1) {
      const burst = this.bursts[i];
      const nx = smoothNoise(burst.x / 90, burst.y / 90, time, burst.seed);
      const ny = smoothNoise(burst.y / 90, burst.x / 90, time + 4.5, burst.seed);
      burst.vx += (nx - 0.5) * 260 * dt;
      burst.vy += (ny - 0.5) * 260 * dt;
      burst.vx *= 0.985;
      burst.vy *= 0.985;
      burst.x += burst.vx * dt;
      burst.y += burst.vy * dt;
      burst.life += dt;

      if (burst.life >= burst.maxLife) {
        this.bursts.splice(i, 1);
      }
    }
  }

  private isFarOutside(x: number, y: number): boolean {
    const margin = 200;
    return x < -margin || y < -margin || x > this.viewport.width + margin || y > this.viewport.height + margin;
  }

  private resetParticle(particle: Particle): void {
    const replacement = this.createParticle(this.rng());
    particle.x = replacement.x;
    particle.y = replacement.y;
    particle.vx = replacement.vx;
    particle.vy = replacement.vy;
    particle.ax = 0;
    particle.ay = 0;
    particle.seed = replacement.seed;
    particle.baseLength = replacement.baseLength;
    particle.baseWidth = replacement.baseWidth;
    particle.phase = replacement.phase;
    particle.hueShift = replacement.hueShift;
  }

  private draw(time: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";

    for (const particle of this.particles) {
      this.drawParticle(particle, 1, time);
    }

    for (const burst of this.bursts) {
      const age = burst.life / burst.maxLife;
      this.drawParticle(burst, 1 - age, time);
    }

    ctx.restore();
  }

  private drawParticle(particle: Particle | BurstParticle, lifeScale: number, time: number): void {
    const ctx = this.ctx;
    const speed = Math.hypot(particle.vx, particle.vy);
    const angle = Math.atan2(particle.vy, particle.vx);
    const center = this.center();
    const relativeAngle = Math.atan2(particle.y - center.y, particle.x - center.x);
    const shimmer = 0.5 + 0.5 * Math.sin(time * 2.1 + particle.seed * 18.3);
    const alpha = clamp((0.43 + shimmer * 0.28) * lifeScale, 0.04, 0.82);
    const stretch = 1 + 0.15 * Math.min(speed, 220) / 100;
    const length = particle.baseLength * stretch;
    const width = Math.max(0.62, particle.baseWidth / (1 + 0.1 * Math.min(speed, 150) / 50));

    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(angle);
    ctx.lineCap = "round";

    if (speed > 220 || lifeScale < 0.98) {
      ctx.strokeStyle = faintColor(relativeAngle, speed, particle.hueShift, alpha * 0.1);
      ctx.lineWidth = width + 2.3;
      ctx.beginPath();
      ctx.moveTo(-length * 0.55, 0);
      ctx.lineTo(length * 0.55, 0);
      ctx.stroke();
    }

    ctx.strokeStyle = particleColor(relativeAngle, speed, particle.hueShift, alpha);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(-length * 0.5, 0);
    ctx.lineTo(length * 0.5, 0);
    ctx.stroke();
    ctx.restore();
  }
}
