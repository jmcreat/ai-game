/**
 * ALPINE FLIGHT — Main Entry Point
 * Three.js game loop orchestrating all systems
 */

import * as THREE from 'three';
import { Terrain }       from './engine/terrain.js';
import { SkyEngine }     from './engine/sky.js';
import { CockpitCamera } from './engine/camera.js';
import { AudioEngine }   from './engine/audio.js';
import { Aircraft }      from './game/aircraft.js';
import { CockpitUI }     from './ui/cockpit.js';

// ── Renderer setup ────────────────────────────────────────────────────────────
const canvas   = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias:  true,
  logarithmicDepthBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.shadowMap.enabled  = false;  // shadows off for performance

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Scene ──────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();

// ── Systems (initialized after splash) ────────────────────────────────────────
let terrain  = null;
let sky      = null;
let aircraft = null;
let cam      = null;
let audio    = null;
let ui       = null;

let lastTime  = 0;
let running   = false;

// ── Loading sequence ──────────────────────────────────────────────────────────

async function initSystems(onProgress) {
  // Sky & lighting
  sky = new SkyEngine(scene, renderer);
  sky.build();
  onProgress(20);

  // Terrain (heavy — takes a moment)
  await new Promise(resolve => {
    setTimeout(() => {
      terrain = new Terrain(scene);
      terrain.build();
      resolve();
    }, 10);
  });
  onProgress(65);

  // Aircraft
  aircraft = new Aircraft(scene);
  onProgress(78);

  // Camera
  cam = new CockpitCamera(renderer);
  cam.attachToAircraft(aircraft.object);
  onProgress(85);

  // Audio
  audio = new AudioEngine();
  audio.init();
  onProgress(92);

  // UI
  ui = new CockpitUI();
  onProgress(100);
}

async function runSplash() {
  const bar     = document.getElementById('loading-bar-fill');
  const txt     = document.getElementById('loading-text');
  const startBtn = document.getElementById('start-btn');

  const steps = [
    [10,  'LOADING TERRAIN DATA...'],
    [25,  'GENERATING ALPINE LANDSCAPE...'],
    [50,  'BUILDING ATMOSPHERE...'],
    [70,  'CALIBRATING FLIGHT SYSTEMS...'],
    [85,  'INITIALISING AVIONICS...'],
    [95,  'PREFLIGHT CHECK COMPLETE'],
    [100, 'READY FOR DEPARTURE'],
  ];

  await initSystems(pct => {
    if (bar) bar.style.width = pct + '%';
  });

  for (const [pct, label] of steps) {
    await sleep(220);
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = label;
  }

  await sleep(400);
  startBtn?.classList.remove('hidden');

  startBtn?.addEventListener('click', () => {
    audio.resume();
    const splash = document.getElementById('splash-screen');
    splash?.classList.add('fade-out');
    setTimeout(() => {
      splash?.remove();
      hideControlsLegend();
      running = true;
      lastTime = performance.now();
      renderer.setAnimationLoop(gameLoop);
    }, 1000);
  });
}

function hideControlsLegend() {
  const legend = document.getElementById('controls-legend');
  if (!legend) return;
  setTimeout(() => legend.classList.add('fade-out'), 10000);
  setTimeout(() => legend.remove(), 11500);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Game loop ─────────────────────────────────────────────────────────────────

function gameLoop(now) {
  const dt = Math.min(now - lastTime, 50);
  lastTime = now;

  if (!running) return;

  // Update systems
  aircraft.update(dt, terrain);
  const state = aircraft.getState();

  if (!state.paused) {
    sky.update(dt / 1000);
  }

  // Camera follows aircraft
  cam.setTurbulence(state.turbulence);
  cam.update(dt, state.speedKt);

  // Audio
  audio.update(state);

  // Cockpit instruments
  ui.update(state);

  // Render
  renderer.render(scene, cam.threeCamera);
}

// ── Kick off ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Preview render before user clicks start
  let previewCamera = null;

  function makePreviewCam() {
    const c = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 1, 200000);
    window.addEventListener('resize', () => {
      c.aspect = window.innerWidth / window.innerHeight;
      c.updateProjectionMatrix();
    });
    return c;
  }

  let previewT = 0;
  previewCamera = makePreviewCam();

  function previewLoop(t) {
    previewT = t;
    previewCamera.position.set(Math.sin(t*0.0002)*3000, 3200, Math.cos(t*0.0002)*3000);
    previewCamera.lookAt(0, 800, 0);
    renderer.render(scene, previewCamera);
  }

  renderer.setAnimationLoop(previewLoop);

  runSplash().then(() => {
    const btn = document.getElementById('start-btn');
    btn?.addEventListener('click', () => {
      audio.resume();
      const splash = document.getElementById('splash-screen');
      splash?.classList.add('fade-out');
      setTimeout(() => {
        splash?.remove();
        hideControlsLegend();
        running  = true;
        lastTime = performance.now();
        renderer.setAnimationLoop(gameLoop);
      }, 1000);
    }, { once: true });
  });
});
