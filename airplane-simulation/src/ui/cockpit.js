/**
 * Cockpit UI — Glass cockpit instruments drawn with Canvas2D
 * PFD, ASI, Altimeter, VSI, Heading, Nav display
 */

const GREEN  = '#00ff88';
const CYAN   = '#00d4ff';
const AMBER  = '#ffb347';
const WHITE  = '#e8f4ff';
const RED    = '#ff3333';
const DARK   = '#0a0e14';
const DIM    = 'rgba(0,212,255,0.25)';

function px(canvas, f) { return canvas.width * f; }

export class CockpitUI {
  constructor() {
    this._canvases = {
      pfd: document.getElementById('pfd-canvas'),
      asi: document.getElementById('asi-canvas'),
      alt: document.getElementById('alt-canvas'),
      vsi: document.getElementById('vsi-canvas'),
      hdg: document.getElementById('hdg-canvas'),
      nav: document.getElementById('nav-canvas'),
    };

    // DOM refs for digital readouts
    this._dom = {
      asiDigital:  document.getElementById('asi-digital'),
      altDigital:  document.getElementById('alt-digital'),
      vsiDigital:  document.getElementById('vsi-digital'),
      hdgDigital:  document.getElementById('hdg-digital'),
      thIas:       document.getElementById('th-ias'),
      thAlt:       document.getElementById('th-alt'),
      thHdg:       document.getElementById('th-hdg'),
      thVs:        document.getElementById('th-vs'),
      throttleBar: document.getElementById('throttle-bar'),
      throttleVal: document.getElementById('throttle-val'),
      n1Bar:       document.getElementById('n1-bar'),
      n1Val:       document.getElementById('n1-val'),
      n2Bar:       document.getElementById('n2-bar'),
      n2Val:       document.getElementById('n2-val'),
      flapsVal:    document.getElementById('flaps-val'),
      gearVal:     document.getElementById('gear-val'),
      warnStall:   document.getElementById('warn-stall'),
      warnGpws:    document.getElementById('warn-gpws'),
      warnOverspd: document.getElementById('warn-overspeed'),
      pauseOverlay:document.getElementById('pause-overlay'),
    };

    this._navAngle = 0;  // rotating compass ring
  }

  update(state) {
    this._drawPFD(state);
    this._drawASI(state.speedKt);
    this._drawAltimeter(state.altFt);
    this._drawVSI(state.vsFpm);
    this._drawHeading(state.headingDeg);
    this._drawNav(state);
    this._updateDOM(state);
  }

  // ── PFD — Attitude Indicator ──────────────────────────────────────────────

  _drawPFD(state) {
    const c   = this._canvases.pfd;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    const CX = W / 2, CY = H / 2;

    ctx.clearRect(0, 0, W, H);

    // ── Horizon ──────────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(-state.roll);

    const pitchPx = state.pitch * (H * 1.8);  // pixels per radian

    // Sky
    const skyH = CY + pitchPx;
    ctx.fillStyle = '#1a3a6a';
    ctx.fillRect(-W, -H * 2, W * 2, H * 4 + skyH);

    // Ground
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(-W, skyH, W * 2, H * 4);

    // Horizon line
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-W, pitchPx);
    ctx.lineTo( W, pitchPx);
    ctx.stroke();

    // Pitch ladder lines
    for (let deg = -30; deg <= 30; deg += 5) {
      if (deg === 0) continue;
      const y  = pitchPx - deg * (H / 60);
      const w  = (deg % 10 === 0) ? 60 : 30;
      ctx.strokeStyle = WHITE;
      ctx.lineWidth   = deg % 10 === 0 ? 1.5 : 1;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(-w, y);
      ctx.lineTo( w, y);
      ctx.stroke();

      if (deg % 10 === 0) {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle   = WHITE;
        ctx.font        = '10px "Share Tech Mono"';
        ctx.fillText(`${Math.abs(deg)}`, w + 4, y + 4);
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();

    // ── Fixed aircraft symbol ─────────────────────────────────────────────
    ctx.strokeStyle = AMBER;
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    // Wings
    ctx.moveTo(CX - 50, CY); ctx.lineTo(CX - 20, CY);
    ctx.moveTo(CX + 20, CY); ctx.lineTo(CX + 50, CY);
    // Fuselage dot
    ctx.moveTo(CX - 8, CY); ctx.lineTo(CX + 8, CY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CX, CY, 4, 0, Math.PI * 2);
    ctx.fillStyle = AMBER;
    ctx.fill();

    // ── Roll arc ──────────────────────────────────────────────────────────
    const radius = CY - 16;
    ctx.strokeStyle = DIM;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(CX, CY, radius, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();

    // Roll pointer
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(-state.roll);
    ctx.strokeStyle = WHITE;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -radius + 2);
    ctx.lineTo(-5, -radius + 12);
    ctx.lineTo( 5, -radius + 12);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // ── Speed tape (left) ─────────────────────────────────────────────────
    this._drawTape(ctx, 8, 20, W / 5, H - 40, state.speedKt, 1, 5, 10, GREEN, 'kt');

    // ── Altitude tape (right) ─────────────────────────────────────────────
    this._drawTape(ctx, W - W/5 - 8, 20, W / 5, H - 40, state.altFt / 100, 1, 5, 10, CYAN, 'x100ft');

    // Frame
    ctx.strokeStyle = 'rgba(0,212,255,0.3)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(0, 0, W, H);
  }

  _drawTape(ctx, x, y, w, h, value, minor, major, range, color, unit) {
    ctx.save();
    ctx.rect(x, y, w, h);
    ctx.clip();

    const CY   = y + h / 2;
    const pxPV = h / (range * 2);  // pixels per value unit

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth   = 1;
    ctx.font        = '9px "Share Tech Mono"';
    ctx.fillStyle   = 'rgba(255,255,255,0.5)';

    const startV = Math.floor(value - range);
    const endV   = Math.ceil(value  + range);
    for (let v = startV; v <= endV; v += minor) {
      const yLine = CY - (v - value) * pxPV;
      const isMaj = v % major === 0;
      ctx.lineWidth = isMaj ? 1.2 : 0.6;
      ctx.beginPath();
      ctx.moveTo(x + (isMaj ? 0 : w * 0.3), yLine);
      ctx.lineTo(x + w * 0.65, yLine);
      ctx.stroke();
      if (isMaj) {
        ctx.fillText(Math.abs(v), x + w * 0.68, yLine + 4);
      }
    }

    // Current value box
    ctx.fillStyle   = color;
    ctx.font        = `bold 12px "Share Tech Mono"`;
    ctx.fillStyle   = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x, CY - 12, w, 24);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(x, CY - 12, w, 24);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(value), x + w / 2, CY + 5);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  // ── ASI — Airspeed Indicator ──────────────────────────────────────────────

  _drawASI(speedKt) {
    const c   = this._canvases.asi;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    const CX = W/2, CY = H/2, R = Math.min(W,H)/2 - 10;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = DARK;
    ctx.beginPath(); ctx.arc(CX, CY, R+8, 0, Math.PI*2); ctx.fill();

    // Colour arcs: white (stall→flap), green (normal), yellow (caution), red (never exceed)
    const arcs = [
      { from: 80,  to: 160, color: '#ffffff', w: 6 },
      { from: 160, to: 380, color: GREEN,     w: 6 },
      { from: 380, to: 440, color: AMBER,     w: 6 },
      { from: 440, to: 480, color: RED,       w: 6 },
    ];
    const maxSpd = 480;
    const toAngle = v => (v / maxSpd) * Math.PI * 1.7 - Math.PI * 1.1;

    for (const arc of arcs) {
      ctx.beginPath();
      ctx.arc(CX, CY, R, toAngle(arc.from), toAngle(arc.to));
      ctx.strokeStyle = arc.color;
      ctx.lineWidth   = arc.w;
      ctx.stroke();
    }

    // Tick marks
    ctx.strokeStyle = WHITE;
    for (let v = 0; v <= maxSpd; v += 10) {
      const angle = toAngle(v);
      const isMaj = v % 50 === 0;
      const inner = R - (isMaj ? 14 : 7);
      ctx.lineWidth = isMaj ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(angle) * R,     CY + Math.sin(angle) * R);
      ctx.lineTo(CX + Math.cos(angle) * inner, CY + Math.sin(angle) * inner);
      ctx.stroke();
      if (isMaj && v > 0) {
        ctx.fillStyle = WHITE;
        ctx.font      = '9px "Share Tech Mono"';
        ctx.textAlign = 'center';
        const lR = inner - 8;
        ctx.fillText(v, CX + Math.cos(angle)*lR, CY + Math.sin(angle)*lR + 3);
      }
    }

    // Needle
    const needleAngle = toAngle(Math.min(maxSpd, Math.max(0, speedKt)));
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(needleAngle);
    ctx.strokeStyle = WHITE;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(0, -R + 16);
    ctx.stroke();
    ctx.restore();

    // Centre cap
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(CX, CY, 5, 0, Math.PI*2); ctx.fill();
  }

  // ── Altimeter ─────────────────────────────────────────────────────────────

  _drawAltimeter(altFt) {
    const c   = this._canvases.alt;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    const CX = W/2, CY = H/2, R = Math.min(W,H)/2 - 10;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = DARK;
    ctx.beginPath(); ctx.arc(CX, CY, R+8, 0, Math.PI*2); ctx.fill();

    // Two needles: 1000ft hand, 10000ft hand
    const hand1Angle = ((altFt % 1000) / 1000) * Math.PI * 2 - Math.PI / 2;
    const hand2Angle = ((altFt % 10000) / 10000) * Math.PI * 2 - Math.PI / 2;

    // Tick marks
    ctx.strokeStyle = WHITE;
    for (let i = 0; i < 50; i++) {
      const angle = (i / 50) * Math.PI * 2 - Math.PI / 2;
      const isMaj = i % 5 === 0;
      ctx.lineWidth = isMaj ? 2 : 1;
      const inner = R - (isMaj ? 12 : 6);
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(angle)*R,     CY + Math.sin(angle)*R);
      ctx.lineTo(CX + Math.cos(angle)*inner, CY + Math.sin(angle)*inner);
      ctx.stroke();
      if (isMaj) {
        ctx.fillStyle = WHITE;
        ctx.font = '9px "Share Tech Mono"';
        ctx.textAlign = 'center';
        const lR = inner - 7;
        ctx.fillText(i * 2, CX + Math.cos(angle)*lR, CY + Math.sin(angle)*lR + 3);
      }
    }

    // 10000ft (thin)
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(hand2Angle);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -R + 22); ctx.stroke();
    ctx.restore();

    // 1000ft (thick, cyan)
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(hand1Angle);
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 6; ctx.shadowColor = CYAN;
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -R + 14); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.fillStyle = '#444';
    ctx.beginPath(); ctx.arc(CX, CY, 6, 0, Math.PI*2); ctx.fill();
  }

  // ── VSI ───────────────────────────────────────────────────────────────────

  _drawVSI(vsFpm) {
    const c   = this._canvases.vsi;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    const CX = W/2;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(10,14,20,0.9)';
    ctx.fillRect(0, 0, W, H);

    // Scale: -2000 to +2000 fpm
    const maxFpm = 2000;
    const toY = v => H/2 - (v / maxFpm) * (H/2 - 12);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    for (const v of [-2000,-1000,-500,0,500,1000,2000]) {
      const y = toY(v);
      ctx.beginPath(); ctx.moveTo(W*0.3, y); ctx.lineTo(W*0.7, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '8px "Share Tech Mono"';
      ctx.textAlign = 'right';
      ctx.fillText(v === 0 ? '0' : (v > 0 ? `+${v/100}` : `${v/100}`), W*0.28, y + 3);
    }

    // Bar
    const clamped = Math.max(-maxFpm, Math.min(maxFpm, vsFpm));
    const yVal    = toY(clamped);
    const yZero   = toY(0);
    const barColor = clamped >= 0 ? GREEN : RED;

    ctx.fillStyle = barColor;
    ctx.fillRect(W*0.4, Math.min(yVal, yZero), W*0.2, Math.abs(yVal - yZero));

    // Current value text
    ctx.fillStyle   = barColor;
    ctx.font        = 'bold 10px "Share Tech Mono"';
    ctx.textAlign   = 'center';
    ctx.fillText(clamped > 0 ? `+${Math.round(clamped)}` : Math.round(clamped), CX, yVal - 4);

    ctx.strokeStyle = 'rgba(0,212,255,0.3)';
    ctx.strokeRect(0, 0, W, H);
  }

  // ── Heading tape ──────────────────────────────────────────────────────────

  _drawHeading(headingDeg) {
    const c   = this._canvases.hdg;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(10,14,20,0.9)';
    ctx.fillRect(0, 0, W, H);

    const pxPerDeg = W / 60;
    const dirs = { 0:'N', 45:'NE', 90:'E', 135:'SE', 180:'S', 225:'SW', 270:'W', 315:'NW' };

    for (let d = -30; d <= 30; d++) {
      const deg    = ((headingDeg + d) % 360 + 360) % 360;
      const x      = W/2 + d * pxPerDeg;
      const isMaj  = deg % 10 === 0;
      const isCard = deg % 45 === 0;

      ctx.strokeStyle = WHITE;
      ctx.lineWidth   = isMaj ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.moveTo(x, H - (isMaj ? 14 : 8));
      ctx.lineTo(x, H - 2);
      ctx.stroke();

      if (isMaj) {
        ctx.fillStyle = isCard ? AMBER : WHITE;
        ctx.font      = isCard ? 'bold 10px "Share Tech Mono"' : '8px "Share Tech Mono"';
        ctx.textAlign = 'center';
        ctx.fillText(dirs[deg] ?? deg, x, H - 18);
      }
    }

    // Triangle pointer
    ctx.fillStyle = CYAN;
    ctx.beginPath();
    ctx.moveTo(W/2, 2);
    ctx.lineTo(W/2 - 5, 12);
    ctx.lineTo(W/2 + 5, 12);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,212,255,0.3)';
    ctx.strokeRect(0, 0, W, H);
  }

  // ── Navigation Display ────────────────────────────────────────────────────

  _drawNav(state) {
    const c   = this._canvases.nav;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    const CX = W/2, CY = H/2 + 10;
    const R = Math.min(W, H) * 0.42;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(5,9,14,0.95)';
    ctx.fillRect(0, 0, W, H);

    // Compass rose
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(-state.headingDeg * Math.PI / 180);

    ctx.strokeStyle = 'rgba(0,212,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI*2); ctx.stroke();

    for (let d = 0; d < 360; d += 5) {
      const rad  = d * Math.PI / 180;
      const isMaj = d % 30 === 0;
      const inner = R - (isMaj ? 14 : 6);
      ctx.strokeStyle = WHITE;
      ctx.lineWidth   = isMaj ? 1.5 : 0.7;
      ctx.globalAlpha = isMaj ? 0.8 : 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.sin(rad)*R,     -Math.cos(rad)*R);
      ctx.lineTo(Math.sin(rad)*inner, -Math.cos(rad)*inner);
      ctx.stroke();

      const dirs = {0:'N',90:'E',180:'S',270:'W',45:'NE',135:'SE',225:'SW',315:'NW'};
      if (isMaj) {
        ctx.globalAlpha = 1;
        const isCard = d % 90 === 0;
        ctx.fillStyle = isCard ? AMBER : 'rgba(255,255,255,0.7)';
        ctx.font      = isCard ? 'bold 11px "Share Tech Mono"' : '9px "Share Tech Mono"';
        ctx.textAlign = 'center';
        const lR = inner - 7;
        ctx.fillText(dirs[d] ?? d, Math.sin(rad)*lR, -Math.cos(rad)*lR + 4);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Fixed aircraft symbol
    ctx.strokeStyle = AMBER;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(CX - 14, CY); ctx.lineTo(CX - 4, CY);
    ctx.moveTo(CX + 4, CY);  ctx.lineTo(CX + 14, CY);
    ctx.moveTo(CX, CY);      ctx.lineTo(CX, CY - 18);
    ctx.stroke();
    ctx.fillStyle = AMBER;
    ctx.beginPath(); ctx.arc(CX, CY, 3, 0, Math.PI*2); ctx.fill();

    // Heading label
    ctx.fillStyle   = CYAN;
    ctx.font        = '10px "Share Tech Mono"';
    ctx.textAlign   = 'center';
    ctx.fillText(`HDG ${String(state.headingDeg).padStart(3,'0')}°`, CX, 16);

    ctx.strokeStyle = 'rgba(0,212,255,0.3)';
    ctx.strokeRect(0, 0, W, H);
  }

  // ── DOM updates ───────────────────────────────────────────────────────────

  _updateDOM(state) {
    const d = this._dom;
    const set = (el, val) => { if (el) el.textContent = val; };
    const setW = (el, pct) => { if (el) el.style.width = pct + '%'; };
    const toggleHidden = (el, hidden) => {
      if (!el) return;
      if (hidden) el.classList.add('hidden');
      else        el.classList.remove('hidden');
    };

    set(d.asiDigital,  state.speedKt);
    set(d.altDigital,  state.altFt.toLocaleString());
    set(d.vsiDigital,  state.vsFpm > 0 ? `+${state.vsFpm}` : state.vsFpm);
    set(d.hdgDigital,  String(state.headingDeg).padStart(3, '0'));

    set(d.thIas,  String(state.speedKt).padStart(3, '0'));
    set(d.thAlt,  String(state.altFt).padStart(5, '0'));
    set(d.thHdg,  String(state.headingDeg).padStart(3, '0'));
    set(d.thVs,   state.vsFpm >= 0 ? `+${String(Math.abs(state.vsFpm)).padStart(4,'0')}` : `-${String(Math.abs(state.vsFpm)).padStart(4,'0')}`);

    setW(d.throttleBar, Math.round(state.throttle * 100));
    set(d.throttleVal,  Math.round(state.throttle * 100) + '%');
    setW(d.n1Bar, state.n1);
    set(d.n1Val,  state.n1 + '%');
    setW(d.n2Bar, state.n2);
    set(d.n2Val,  state.n2 + '%');

    const flapsLabels = ['UP', '1+F', 'FULL-2', 'FULL'];
    set(d.flapsVal, flapsLabels[state.flaps] ?? 'UP');
    set(d.gearVal,  state.gearDown ? 'DOWN' : 'UP');
    if (d.gearVal) d.gearVal.className = `ei-val ${state.gearDown ? '' : 'green'}`;

    toggleHidden(d.warnStall,   !state.stall);
    toggleHidden(d.warnGpws,    !state.gpws);
    toggleHidden(d.warnOverspd, !state.overspeed);

    toggleHidden(d.pauseOverlay, !state.paused);
  }
}
