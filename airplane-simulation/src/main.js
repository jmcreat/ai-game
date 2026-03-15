/**
 * ALPINE FLIGHT — Main Entry Point
 * Multi-scenario flight simulator with camera modes and panel toggle
 */

import * as THREE from 'three';
import { Terrain, SCENARIOS } from './engine/terrain.js';
import { SkyEngine }          from './engine/sky.js';
import { CockpitCamera }      from './engine/camera.js';
import { AudioEngine }        from './engine/audio.js';
import { Aircraft }           from './game/aircraft.js';
import { CockpitUI }          from './ui/cockpit.js';

// ── Renderer ──────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.shadowMap.enabled   = false;
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();

// ── Module refs ───────────────────────────────────────────────────────────────
let terrain   = null;
let sky       = null;
let aircraft  = null;
let cam       = null;
let audio     = null;
let ui        = null;
let lastTime  = 0;
let running   = false;
let scenarioId = 'alps';

// ── System init ───────────────────────────────────────────────────────────────
async function initSystems(sid, onProgress) {
  scenarioId = sid;
  const preset = SCENARIOS[sid] || SCENARIOS.alps;

  sky = new SkyEngine(scene, renderer);
  sky.build(sid);
  onProgress(20);

  await new Promise(resolve => setTimeout(() => {
    terrain = new Terrain(scene);
    terrain.build(sid);
    resolve();
  }, 16));
  onProgress(65);

  aircraft = new Aircraft(scene);
  aircraft.altitude = preset.startAlt;
  onProgress(78);

  cam = new CockpitCamera(renderer);
  cam.attachToAircraft(aircraft.object);
  onProgress(85);

  audio = new AudioEngine();
  audio.init();
  onProgress(92);

  ui = new CockpitUI();
  onProgress(100);
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function gameLoop(now) {
  const dt = Math.min(now - lastTime, 50);
  lastTime = now;

  aircraft.update(dt, terrain);
  const state = aircraft.getState();
  state.scenario  = scenarioId;
  state.cameraMode = cam.mode;

  if (!state.paused) {
    sky.update(dt / 1000);
    sky.followCamera(cam.threeCamera.position);
  }

  cam.setTurbulence(state.turbulence);
  cam.update(dt, state.speedKt);
  audio.update(state);
  ui.update(state);

  renderer.render(scene, cam.threeCamera);
}

// ── Panel toggle (H key or tab click) ────────────────────────────────────────
let panelVisible = true;
function setupPanelToggle() {
  const panel  = document.getElementById('instrument-panel');
  const tabEl  = document.getElementById('panel-tab');
  const strip  = document.getElementById('engine-strip');

  const toggle = () => {
    panelVisible = !panelVisible;
    panel?.classList.toggle('panel-hidden', !panelVisible);
    if (tabEl) {
      tabEl.textContent = panelVisible ? '▼ PANEL' : '▲ PANEL';
      // Move tab down to just above engine strip when panel is hidden
      const stripH = strip ? strip.offsetHeight : 46;
      const panelH = panel ? panel.offsetHeight : 296;
      tabEl.style.bottom = panelVisible
        ? `${stripH + panelH - 2}px`
        : `${stripH}px`;
    }
  };

  // Set initial position
  if (tabEl && panel && strip) {
    tabEl.style.bottom = `${strip.offsetHeight + panel.offsetHeight - 2}px`;
  }

  window.addEventListener('keydown', e => {
    if (e.code === 'KeyH') toggle();
  });
  tabEl?.addEventListener('click', toggle);
}

// ── Camera mode HUD update ────────────────────────────────────────────────────
function setupCameraModeHUD() {
  window.addEventListener('cameraMode', e => {
    const el = document.getElementById('camera-mode-display');
    if (!el) return;
    const labels = { cockpit: '🎯 1ST PERSON', chase: '📷 CHASE', tower: '🗼 TOWER', wing: '✈ WING' };
    el.textContent = labels[e.detail] || e.detail.toUpperCase();
    el.classList.remove('mode-flash');
    void el.offsetWidth;
    el.classList.add('mode-flash');
  });
}

// ── Splash ────────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runSplash(sid) {
  const bar      = document.getElementById('loading-bar-fill');
  const txt      = document.getElementById('loading-text');
  const startBtn = document.getElementById('start-btn');

  if (startBtn) startBtn.classList.add('hidden');

  const steps = [
    [10,  'LOADING SCENARIO...'],
    [25,  'GENERATING TERRAIN...'],
    [50,  'BUILDING ATMOSPHERE...'],
    [70,  'CALIBRATING FLIGHT SYSTEMS...'],
    [85,  'INITIALISING AVIONICS...'],
    [95,  'PREFLIGHT CHECK COMPLETE'],
    [100, 'READY FOR DEPARTURE'],
  ];

  const initPromise = initSystems(sid, pct => { if (bar) bar.style.width = pct + '%'; });

  for (const [pct, label] of steps) {
    await sleep(220);
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = label;
  }
  await initPromise;
  await sleep(300);
  startBtn?.classList.remove('hidden');
}

function hideControlsLegend() {
  const el = document.getElementById('controls-legend');
  if (!el) return;
  setTimeout(() => el.classList.add('fade-out'), 10000);
  setTimeout(() => el.remove(), 11500);
}

// ── Build scenario card thumbnails in splash ──────────────────────────────────
function buildScenarioCards() {
  const container = document.getElementById('scenario-cards');
  if (!container) return;
  container.innerHTML = '';

  Object.values(SCENARIOS).forEach(sc => {
    const card = document.createElement('div');
    card.className = 'scenario-card';
    card.dataset.id = sc.id;

    const thumb = document.createElement('div');
    thumb.className = `scenario-thumb thumb-${sc.id}`;

    const name = document.createElement('div');
    name.className = 'scenario-name';
    name.textContent = sc.name;

    const sub = document.createElement('div');
    sub.className = 'scenario-sub';
    sub.textContent = sc.subtitle;

    const desc = document.createElement('div');
    desc.className = 'scenario-desc';
    desc.textContent = sc.description;

    card.appendChild(thumb);
    card.appendChild(name);
    card.appendChild(sub);
    card.appendChild(desc);
    container.appendChild(card);

    card.addEventListener('click', () => {
      container.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });

  // Default selection
  container.querySelector(`[data-id="alps"]`)?.classList.add('selected');
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildScenarioCards();

  const previewCam = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 200000);
  window.addEventListener('resize', () => {
    previewCam.aspect = window.innerWidth / window.innerHeight;
    previewCam.updateProjectionMatrix();
  });

  // Preview loop (rotating ambient camera while user picks scenario)
  renderer.setAnimationLoop(t => {
    if (running) return;
    previewCam.position.set(Math.sin(t * 0.0002) * 6000, 4000, Math.cos(t * 0.0002) * 6000);
    previewCam.lookAt(0, 1000, 0);
    if (sky)     sky.followCamera(previewCam.position);
    if (terrain) renderer.render(scene, previewCam);
  });

  const startBtn   = document.getElementById('start-btn');
  const loadScreen = document.getElementById('loading-screen');

  // "FLY" button click — first, hide scenario picker and show loading
  startBtn?.addEventListener('click', async () => {
    const selected = document.querySelector('.scenario-card.selected');
    const sid      = selected?.dataset.id || 'alps';

    // Show loading screen
    const scenarioPicker = document.getElementById('scenario-picker');
    if (scenarioPicker) scenarioPicker.style.display = 'none';
    if (loadScreen) loadScreen.style.display = 'flex';

    await runSplash(sid);

    const flyBtn = document.getElementById('fly-btn');
    flyBtn?.classList.remove('hidden');
  }, { once: true });

  // "TAKE OFF" button — use event delegation since fly-btn revealed after loading
  document.addEventListener('click', e => {
    if (e.target?.id === 'fly-btn' && !running) {
      audio?.resume();
      const splash = document.getElementById('splash-screen');
      splash?.classList.add('fade-out');
      setTimeout(() => {
        splash?.remove();
        setupPanelToggle();
        setupCameraModeHUD();
        hideControlsLegend();
        running  = true;
        lastTime = performance.now();
        renderer.setAnimationLoop(gameLoop);
      }, 900);
    }
  });
});
