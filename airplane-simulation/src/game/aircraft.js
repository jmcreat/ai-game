/**
 * Aircraft — Physics model & input handling
 * Simplified but believable flight dynamics for an A320-class airliner
 */

import * as THREE from 'three';

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_SPEED         = 80;     // kt — stall speed
const MAX_SPEED         = 480;    // kt — Vmo
const CRUISE_SPEED      = 240;    // kt — target cruise
const MAX_PITCH_RATE    = 1.4;    // deg/s
const MAX_ROLL_RATE     = 2.2;    // deg/s
const MAX_YAW_RATE      = 0.6;    // deg/s
const MAX_PITCH_ANGLE   = 35;     // deg
const MAX_ROLL_ANGLE    = 70;     // deg
const GRAVITY           = 9.81;   // m/s²
const KT_TO_MS          = 0.5144;
const MS_TO_KT          = 1 / KT_TO_MS;
const FT_PER_METER      = 3.28084;

// Convert kt to world units/sec (1 world unit = 1 meter)
const ktToWU = kt => kt * KT_TO_MS;

export class Aircraft {
  constructor(scene) {
    this.scene = scene;

    // State
    this.speed    = CRUISE_SPEED;  // knots IAS
    this.throttle = 0.72;          // 0–1
    this.altitude = 5500;          // meters — good view of Alps terrain below
    this.heading  = 0;             // radians
    this.pitch    = 0;             // radians
    this.roll     = 0;             // radians
    this.vs       = 0;             // vertical speed m/s
    this.flaps    = 0;             // 0,1,2,3 (UP/1+F/2/FULL)
    this.gearDown = false;

    // Warnings
    this.stallWarning     = false;
    this.overspeedWarning = false;
    this.gpwsWarning      = false;

    // Input keys
    this._keys = {};

    // Three.js object (invisible, just a transform container)
    this.object = new THREE.Object3D();
    this.object.position.set(0, this.altitude, 500);
    scene.add(this.object);

    // Cockpit interior mesh (dashboard silhouette visible from camera)
    this._buildCockpitMesh();

    this._bindInput();
    this._paused = false;
  }

  _buildCockpitMesh() {
    // Cockpit frame silhouette visible in lower part of view
    const dashGeo = new THREE.BoxGeometry(3.2, 0.55, 1.2);
    const dashMat = new THREE.MeshLambertMaterial({ color: 0x181c22 });
    this.dashMesh = new THREE.Mesh(dashGeo, dashMat);
    this.dashMesh.position.set(0, 0.6, -0.2);
    this.object.add(this.dashMesh);

    // Sidestick (right side)
    const stickGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.28, 8);
    const stickMat = new THREE.MeshLambertMaterial({ color: 0x222830 });
    const stick    = new THREE.Mesh(stickGeo, stickMat);
    stick.position.set(0.52, 0.82, 0.25);
    stick.rotation.x = 0.2;
    this.object.add(stick);

    // Throttle levers
    for (let i = 0; i < 2; i++) {
      const tGeo = new THREE.BoxGeometry(0.06, 0.3, 0.06);
      const tMat = new THREE.MeshLambertMaterial({ color: 0x2a3040 });
      const t    = new THREE.Mesh(tGeo, tMat);
      t.position.set(0.08 + i * 0.1, 0.85, 0.12);
      t.rotation.x = -0.3;
      this.object.add(t);
    }

    // Window frame posts
    const postGeo = new THREE.BoxGeometry(0.07, 2.2, 0.07);
    const postMat = new THREE.MeshLambertMaterial({ color: 0x141820 });
    const postC   = new THREE.Mesh(postGeo, postMat);
    postC.position.set(0, 1.4, 2.1);
    this.object.add(postC);
  }

  _bindInput() {
    window.addEventListener('keydown', e => {
      this._keys[e.code] = true;
      if (e.code === 'KeyF') this._cycleFlaps();
      if (e.code === 'KeyG') this.gearDown = !this.gearDown;
      if (e.code === 'KeyP') this._paused = !this._paused;
    });
    window.addEventListener('keyup', e => { this._keys[e.code] = false; });
  }

  _cycleFlaps() {
    this.flaps = (this.flaps + 1) % 4;
  }

  update(dt, terrainEngine) {
    if (this._paused) return;

    const dtS = dt / 1000;  // seconds

    // ── Throttle input ─────────────────────────────────────────────────────
    if (this._keys['ArrowUp']   || this._keys['ShiftLeft']) {
      this.throttle = Math.min(1,   this.throttle + 0.006 * dtS * 60);
    }
    if (this._keys['ArrowDown'] || this._keys['ControlLeft']) {
      this.throttle = Math.max(0,   this.throttle - 0.006 * dtS * 60);
    }

    // ── Pitch ──────────────────────────────────────────────────────────────
    const pitchRate = MAX_PITCH_RATE * (Math.PI / 180);
    if (this._keys['KeyW']) {
      this.pitch = Math.max(-MAX_PITCH_ANGLE * Math.PI/180, this.pitch - pitchRate * dtS);
    }
    if (this._keys['KeyS']) {
      this.pitch = Math.min( MAX_PITCH_ANGLE * Math.PI/180, this.pitch + pitchRate * dtS);
    }
    // Pitch auto-return toward 0 when no input
    if (!this._keys['KeyW'] && !this._keys['KeyS']) {
      this.pitch *= Math.pow(0.985, dtS * 60);
    }

    // ── Roll ───────────────────────────────────────────────────────────────
    const rollRate = MAX_ROLL_RATE * (Math.PI / 180);
    if (this._keys['KeyA']) {
      this.roll = Math.max(-MAX_ROLL_ANGLE * Math.PI/180, this.roll - rollRate * dtS);
    }
    if (this._keys['KeyD']) {
      this.roll = Math.min( MAX_ROLL_ANGLE * Math.PI/180, this.roll + rollRate * dtS);
    }
    if (!this._keys['KeyA'] && !this._keys['KeyD']) {
      this.roll *= Math.pow(0.97, dtS * 60);
    }

    // ── Yaw (heading change from roll + explicit yaw) ──────────────────────
    const yawRate = MAX_YAW_RATE * (Math.PI / 180);
    let yaw = 0;
    if (this._keys['KeyQ']) yaw -= yawRate * dtS;
    if (this._keys['KeyE']) yaw += yawRate * dtS;
    // Roll-induced yaw
    yaw += this.roll * 0.45 * dtS;
    this.heading += yaw;

    // ── Thrust & drag ──────────────────────────────────────────────────────
    const thrustKt   = this.throttle * (MAX_SPEED * 0.9);
    const dragFactor = 1 + (this.flaps * 0.08) + (this.gearDown ? 0.15 : 0);
    const targetSpd  = thrustKt / dragFactor;
    this.speed += (targetSpd - this.speed) * 0.015 * dtS * 60;
    this.speed = Math.max(30, Math.min(MAX_SPEED, this.speed));

    // ── Vertical speed from pitch & lift ──────────────────────────────────
    const liftFactor = Math.max(0, (this.speed - MIN_SPEED) / (MIN_SPEED * 1.5));
    const pitchVS    = Math.sin(this.pitch) * this.speed * KT_TO_MS * liftFactor;
    this.vs += (pitchVS - this.vs) * 0.06 * dtS * 60;
    this.vs  = Math.max(-80, Math.min(30, this.vs));  // m/s clamp

    // ── Altitude ──────────────────────────────────────────────────────────
    this.altitude += this.vs * dtS;

    // ── Position update ───────────────────────────────────────────────────
    const speedMS = this.speed * KT_TO_MS;
    this.object.position.x += Math.sin(this.heading) * speedMS * dtS;
    this.object.position.z -= Math.cos(this.heading) * speedMS * dtS;
    this.object.position.y  = this.altitude;

    // ── Orientation ───────────────────────────────────────────────────────
    this.object.rotation.set(0, 0, 0, 'YXZ');
    this.object.rotation.y = -this.heading;
    this.object.rotation.x = this.pitch;
    this.object.rotation.z = -this.roll;

    // ── Terrain proximity ─────────────────────────────────────────────────
    if (terrainEngine) {
      const terrainH = terrainEngine.getHeightAt(
        this.object.position.x,
        this.object.position.z
      );
      const agl = this.altitude - terrainH;
      this.gpwsWarning = agl < 600 && this.vs < -3;

      // Collision
      if (this.altitude < terrainH + 5) {
        this.altitude = terrainH + 5;
        this.vs = Math.abs(this.vs) * 0.2;
        this.object.position.y = this.altitude;
      }
    }

    // ── Warnings ──────────────────────────────────────────────────────────
    this.stallWarning     = this.speed < MIN_SPEED + 20;
    this.overspeedWarning = this.speed > MAX_SPEED - 20;

    // ── Turbulence (increases with altitude bands) ─────────────────────────
    const altBand = this.altitude / 1000;
    const turb    = (altBand > 6 && altBand < 9) ? 0.25 : 0.05;
    this.turbulence = turb + (this.stallWarning ? 0.5 : 0);
  }

  getState() {
    return {
      speedKt:    Math.round(this.speed),
      altFt:      Math.round(this.altitude * FT_PER_METER),
      altM:       Math.round(this.altitude),
      headingDeg: Math.round(((this.heading * 180 / Math.PI) % 360 + 360) % 360),
      vsFpm:      Math.round(this.vs * FT_PER_METER * 60),  // m/s → fpm
      pitch:      this.pitch,
      roll:       this.roll,
      throttle:   this.throttle,
      n1:         Math.round(this.throttle * 98),
      n2:         Math.round(this.throttle * 92 + 5),
      flaps:      this.flaps,
      gearDown:   this.gearDown,
      stall:      this.stallWarning,
      overspeed:  this.overspeedWarning,
      gpws:       this.gpwsWarning,
      turbulence: this.turbulence || 0,
      paused:     this._paused,
    };
  }
}
