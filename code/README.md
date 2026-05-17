# Antigravity Particle Replica

This is a lightweight Vite + TypeScript + Canvas 2D recreation of the particle hero animation shown in `lizi.mp4` and the Google Antigravity landing page.

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build

```bash
npm run build
```

The production files are emitted to `dist/`.

## Implementation Notes

- The static page is plain HTML/CSS so the hero typography, navigation, buttons, and white background remain crisp and browser-native.
- The particle layer is one fixed full-screen Canvas 2D surface with `pointer-events: none`; pointer input is read from `window` so buttons remain clickable.
- Particle motion uses frame-rate-independent Euler integration with tangential swirl, radial recovery, mouse repulsion, turbulent sine/cosine noise, boundary damping, and deterministic seeded initialization.
- Particle color is mapped from angle around the hero center and speed, using Google-inspired red, yellow, green, blue, purple, and orange.
- Fast particles stretch along their velocity vector and become thinner, with a faint secondary glow pass for higher-speed strokes.
- Append `?debug` to the URL, or set `localStorage.setItem("antigravity-debug", "true")`, to show FPS and particle count.
