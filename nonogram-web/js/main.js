// main.js - 진입점 & SceneManager

// ── 이벤트 좌표 정규화 ────────────────────────────────────────────────────
function getPoint(e) {
  let x, y, button = 0;
  if (e.changedTouches && e.changedTouches.length) {
    const t = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    x = (t.clientX - rect.left) * (canvas.width  / rect.width);
    y = (t.clientY - rect.top)  * (canvas.height / rect.height);
  } else if (e.touches && e.touches.length) {
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    x = (t.clientX - rect.left) * (canvas.width  / rect.width);
    y = (t.clientY - rect.top)  * (canvas.height / rect.height);
  } else {
    const rect = canvas.getBoundingClientRect();
    x = (e.clientX - rect.left) * (canvas.width  / rect.width);
    y = (e.clientY - rect.top)  * (canvas.height / rect.height);
    button = e.button || 0;
  }
  return { x, y, button };
}

// ── SceneManager ──────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
let SW, SH;

function resize() {
  SW = canvas.width  = window.innerWidth;
  SH = canvas.height = window.innerHeight;
  if (sceneManager) sceneManager.onResize(SW, SH);
}

class SceneManager {
  constructor(sw, sh) {
    this._sw = sw; this._sh = sh;
    // 저장된 비주얼 테마 먼저 적용
    applyVisualTheme(Storage.getSettings().visualTheme || 'galaxy');
    this._nebula   = new NebulaBackground(sw, sh);
    this._stars    = new StarField(sw, sh);
    this._scene    = null;
    this._mx = sw/2; this._my = sh/2;
    this._goto({ scene:'menu' });
  }

  onResize(sw, sh) {
    this._sw = sw; this._sh = sh;
    this._nebula.resize(sw, sh);
    this._stars.resize(sw, sh);
    this._goto({ scene: this._currentKey || 'menu' });
  }

  _goto(cmd) {
    this._currentKey = cmd.scene;
    const sw = this._sw, sh = this._sh;
    switch (cmd.scene) {
      case 'menu':
        this._scene = new MainMenuScene(sw, sh, this._nebula, this._stars);
        break;
      case 'stage':
        this._scene = new StageSelectScene(sw, sh, this._nebula, this._stars);
        break;
      case 'infinite_setup':
        this._scene = new InfiniteSetupScene(sw, sh, this._nebula, this._stars);
        break;
      case 'game': {
        const puzzle = getStage(cmd.stageId);
        this._scene = new GameScene(sw, sh, this._nebula, this._stars, puzzle,
          { stageId: cmd.stageId });
        break;
      }
      case 'infinite': {
        const puzzle = generateInfinitePuzzle(cmd.level);
        this._scene = new GameScene(sw, sh, this._nebula, this._stars, puzzle,
          { level: cmd.level });
        break;
      }
      case 'daily': {
        const puzzle = generateDailyPuzzle();
        this._scene = new GameScene(sw, sh, this._nebula, this._stars, puzzle,
          { isDaily: true });
        break;
      }
      case 'effect_settings':
        this._scene = new EffectSettingsScene(sw, sh, this._nebula, this._stars);
        break;
      case 'visual_theme':
        this._scene = new VisualThemeScene(sw, sh, this._nebula, this._stars);
        break;
    }
  }

  handleEvent(e) {
    if (this._scene) this._scene.handleEvent(e);
    const nx = this._scene && this._scene.nextScene();
    if (nx) this._goto(nx);
  }

  update(dt) {
    this._stars.update(dt);
    if (this._scene) {
      this._scene.update(dt, this._mx, this._my);
      const nx = this._scene.nextScene();
      if (nx) this._goto(nx);
    }
  }

  setMouse(x, y) { this._mx = x; this._my = y; }

  draw() {
    ctx.clearRect(0, 0, SW, SH);
    if (this._scene) this._scene.draw(ctx);
  }
}

let sceneManager = null;

// ── 이벤트 리스너 ─────────────────────────────────────────────────────────
function setupEvents() {
  const EVENTS = ['mousedown','mousemove','mouseup','click','contextmenu',
                  'touchstart','touchmove','touchend','wheel'];
  for (const type of EVENTS) {
    canvas.addEventListener(type, e => {
      e.preventDefault();
      if (type === 'mousemove' || type === 'touchmove') {
        const {x,y} = getPoint(e);
        sceneManager.setMouse(x, y);
      }
      sceneManager.handleEvent(e);
    }, { passive: false });
  }
}

// ── PWA 설치 배너 ─────────────────────────────────────────────────────────
let _deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredPrompt = e;
  document.getElementById('installBanner').classList.remove('hidden');
});
document.getElementById('installBtn')?.addEventListener('click', () => {
  if (_deferredPrompt) {
    _deferredPrompt.prompt();
    _deferredPrompt.userChoice.then(() => {
      _deferredPrompt = null;
      document.getElementById('installBanner').classList.add('hidden');
    });
  }
});
document.getElementById('installClose')?.addEventListener('click', () => {
  document.getElementById('installBanner').classList.add('hidden');
});

// ── 오프라인 배너 ─────────────────────────────────────────────────────────
function updateOfflineBanner() {
  const banner = document.getElementById('offlineBanner');
  if (!navigator.onLine) banner.classList.remove('hidden');
  else banner.classList.add('hidden');
}
window.addEventListener('online',  updateOfflineBanner);
window.addEventListener('offline', updateOfflineBanner);
updateOfflineBanner();

// ── 메인 루프 ─────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  sceneManager.update(dt);
  sceneManager.draw();
  requestAnimationFrame(loop);
}

// ── Service Worker 등록 ────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(reg => console.log('[SW] registered', reg.scope))
      .catch(err => console.warn('[SW] failed:', err));
  });
}

// ── 초기화 ────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  resize();
  window.addEventListener('resize', resize);
  sceneManager = new SceneManager(SW, SH);
  setupEvents();
  requestAnimationFrame(loop);
});
