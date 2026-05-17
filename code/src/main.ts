import { ParticleSystem } from "./ParticleSystem";
import "./styles.css";

const canvas = document.querySelector<HTMLCanvasElement>("#particle-canvas");
const debugPanel = document.querySelector<HTMLElement>("#debug-panel");
const fpsReadout = document.querySelector<HTMLElement>("#fps-readout");
const countReadout = document.querySelector<HTMLElement>("#count-readout");

if (!canvas) {
  throw new Error("Missing particle canvas.");
}

const system = new ParticleSystem(canvas);
const searchParams = new URLSearchParams(window.location.search);
const debugEnabled = new URLSearchParams(window.location.search).has("debug")
  || window.localStorage.getItem("antigravity-debug") === "true";
const pointerPreview = searchParams.get("pointer");
const burstPreview = searchParams.get("burst");

if (debugEnabled && debugPanel) {
  debugPanel.hidden = false;
}

window.addEventListener("resize", () => system.resize(), { passive: true });
window.addEventListener("pointermove", (event) => system.setPointer(event.clientX, event.clientY), {
  passive: true
});
window.addEventListener("pointerleave", () => system.clearPointer(), { passive: true });
window.addEventListener("blur", () => system.clearPointer());
window.addEventListener("pointerdown", (event) => system.burst(event.clientX, event.clientY), {
  passive: true
});

function updateDebug(): void {
  if (debugEnabled && fpsReadout && countReadout) {
    const sample = system.sample();
    fpsReadout.textContent = `FPS ${sample.fps}`;
    countReadout.textContent = `Particles ${sample.particles}`;
  }

  window.setTimeout(updateDebug, 250);
}

system.start();

if (pointerPreview) {
  const [x, y] = pointerPreview.split(",").map((value) => Number.parseFloat(value));
  if (Number.isFinite(x) && Number.isFinite(y)) {
    system.setPointer(x, y);
  }
}

if (burstPreview) {
  const [x, y] = burstPreview.split(",").map((value) => Number.parseFloat(value));
  if (Number.isFinite(x) && Number.isFinite(y)) {
    system.burst(x, y);
  }
}

updateDebug();
