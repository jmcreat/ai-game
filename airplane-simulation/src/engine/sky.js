/**
 * Sky Engine — Multi-scenario atmospheric rendering
 * Scenarios: alps (golden hour), arctic (midnight sun), desert (midday),
 *            city (night), volcano (dusk eruption)
 */

import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// ── Sky presets per scenario ──────────────────────────────────────────────────

const SKY_PRESETS = {
  alps: {
    turbidity:       3.5,
    rayleigh:        2.8,
    mieCoefficient:  0.006,
    mieDirectionalG: 0.92,
    sunPhi:   88,   // near horizon
    sunTheta: 230,  // south-west
    sunColor: 0xffcc77,
    sunIntensity: 3.2,
    ambientColor: 0x4466aa, ambientIntensity: 0.6,
    hemiSky: 0xffd580, hemiGround: 0x2244aa, hemiIntensity: 0.8,
    fogColor: 0xc8b090, fogDensity: 0.000028,
    cloudAltitudes: [1800, 2800, 4200],
    cloudSpreads:   [18000, 24000, 30000],
    cloudSizes:     [1400, 2000, 2600],
    cloudCount:     60,
    cloudOpacity:   [0.35, 0.25],
    cloudTint:      [255, 255, 255],
    exposure:       0.85,
  },
  arctic: {
    turbidity:       1.5,
    rayleigh:        4.0,
    mieCoefficient:  0.002,
    mieDirectionalG: 0.78,
    sunPhi:   80,   // low midnight sun
    sunTheta: 10,
    sunColor: 0xaaccff,
    sunIntensity: 1.8,
    ambientColor: 0x5588cc, ambientIntensity: 0.9,
    hemiSky: 0x88aaff, hemiGround: 0xaaccee, hemiIntensity: 1.0,
    fogColor: 0xb8ccee, fogDensity: 0.000018,
    cloudAltitudes: [600, 1200, 2000],
    cloudSpreads:   [20000, 28000, 36000],
    cloudSizes:     [2000, 2800, 3400],
    cloudCount:     90,
    cloudOpacity:   [0.55, 0.35],
    cloudTint:      [210, 230, 255],
    exposure:       1.1,
  },
  desert: {
    turbidity:       8.0,
    rayleigh:        1.2,
    mieCoefficient:  0.018,
    mieDirectionalG: 0.95,
    sunPhi:   70,   // high midday
    sunTheta: 180,
    sunColor: 0xfff0cc,
    sunIntensity: 4.5,
    ambientColor: 0xffdd88, ambientIntensity: 0.8,
    hemiSky: 0xffe090, hemiGround: 0xc8a060, hemiIntensity: 1.2,
    fogColor: 0xe8c880, fogDensity: 0.000035,
    cloudAltitudes: [3000],
    cloudSpreads:   [40000],
    cloudSizes:     [800],
    cloudCount:     10,  // almost no clouds
    cloudOpacity:   [0.15, 0.08],
    cloudTint:      [255, 240, 200],
    exposure:       1.2,
  },
  city: {
    turbidity:       9.0,
    rayleigh:        0.5,
    mieCoefficient:  0.035,
    mieDirectionalG: 0.88,
    sunPhi:   95,   // below horizon = night
    sunTheta: 270,
    sunColor: 0x223366,
    sunIntensity: 0.3,
    ambientColor: 0x112244, ambientIntensity: 0.4,
    hemiSky: 0x223366, hemiGround: 0x441122, hemiIntensity: 0.5,
    fogColor: 0x080e1c, fogDensity: 0.000055,
    cloudAltitudes: [800, 1500],
    cloudSpreads:   [15000, 20000],
    cloudSizes:     [600, 1000],
    cloudCount:     30,
    cloudOpacity:   [0.12, 0.08],
    cloudTint:      [80, 90, 120],
    exposure:       0.35,
  },
  volcano: {
    turbidity:       12.0,
    rayleigh:        3.5,
    mieCoefficient:  0.025,
    mieDirectionalG: 0.85,
    sunPhi:   86,   // dusk
    sunTheta: 310,
    sunColor: 0xff6622,
    sunIntensity: 2.8,
    ambientColor: 0x663322, ambientIntensity: 0.7,
    hemiSky: 0xff8844, hemiGround: 0x220000, hemiIntensity: 0.9,
    fogColor: 0x4a2210, fogDensity: 0.000045,
    cloudAltitudes: [1200, 2400],
    cloudSpreads:   [14000, 22000],
    cloudSizes:     [800, 1600],
    cloudCount:     40,
    cloudOpacity:   [0.4, 0.25],
    cloudTint:      [180, 100, 60],
    exposure:       0.75,
  },
};

export class SkyEngine {
  constructor(scene, renderer) {
    this.scene    = scene;
    this.renderer = renderer;
    this.sky      = null;
    this.sun      = new THREE.Vector3();
    this.clouds   = [];
    this._lights  = [];
    this._preset  = null;
    this.time     = 0;
  }

  build(scenarioId = 'alps') {
    this._dispose();
    this._preset = SKY_PRESETS[scenarioId] || SKY_PRESETS.alps;
    this._buildSky();
    this._buildLights();
    this._buildClouds();
    this._buildFog();
    return this;
  }

  _buildSky() {
    const p = this._preset;
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);
    this.scene.add(this.sky);

    const u = this.sky.material.uniforms;
    u['turbidity'].value       = p.turbidity;
    u['rayleigh'].value        = p.rayleigh;
    u['mieCoefficient'].value  = p.mieCoefficient;
    u['mieDirectionalG'].value = p.mieDirectionalG;

    const phi   = THREE.MathUtils.degToRad(p.sunPhi);
    const theta = THREE.MathUtils.degToRad(p.sunTheta);
    this.sun.setFromSphericalCoords(1, phi, theta);
    u['sunPosition'].value.copy(this.sun);

    this.renderer.toneMappingExposure = p.exposure;

    // Environment map
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment()).texture;
    pmrem.dispose();
  }

  _buildLights() {
    const p = this._preset;

    const sun = new THREE.DirectionalLight(p.sunColor, p.sunIntensity);
    sun.position.copy(this.sun).multiplyScalar(10000);
    this.scene.add(sun);
    this._lights.push(sun);

    const amb = new THREE.AmbientLight(p.ambientColor, p.ambientIntensity);
    this.scene.add(amb);
    this._lights.push(amb);

    const hemi = new THREE.HemisphereLight(p.hemiSky, p.hemiGround, p.hemiIntensity);
    this.scene.add(hemi);
    this._lights.push(hemi);
  }

  _buildClouds() {
    const p   = this._preset;
    const tex = this._createCloudTexture(p.cloudTint);

    const alts    = p.cloudAltitudes;
    const spreads = p.cloudSpreads;
    const sizes   = p.cloudSizes;
    const layers  = alts.length;

    for (let layer = 0; layer < layers; layer++) {
      const perLayer = Math.floor(p.cloudCount / layers);
      for (let c = 0; c < perLayer; c++) {
        const w   = sizes[layer] * (0.5 + Math.random());
        const h   = w * 0.22 * (0.6 + Math.random());
        const geo = new THREE.PlaneGeometry(w, h);
        geo.rotateX(-Math.PI / 2);
        const [opMin, opRng] = p.cloudOpacity;
        const mat = new THREE.MeshBasicMaterial({
          map: tex, transparent: true,
          opacity: opMin + Math.random() * opRng,
          depthWrite: false, side: THREE.DoubleSide, fog: false,
        });
        const cloud = new THREE.Mesh(geo, mat);
        const s = spreads[layer];
        cloud.position.set(
          (Math.random() - 0.5) * s,
          alts[layer] + (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * s
        );
        cloud.userData.drift = (Math.random() - 0.5) * 0.5;
        cloud.rotation.y = Math.random() * Math.PI;
        this.scene.add(cloud);
        this.clouds.push(cloud);
      }
    }
  }

  _createCloudTexture([r, g, b]) {
    const size   = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grad.addColorStop(0,   `rgba(${r},${g},${b},0.95)`);
    grad.addColorStop(0.35, `rgba(${r},${g},${b},0.6)`);
    grad.addColorStop(0.7,  `rgba(${r},${g},${b},0.2)`);
    grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }

  _buildFog() {
    const p = this._preset;
    this.scene.fog = new THREE.FogExp2(p.fogColor, p.fogDensity);
    this.scene.background = new THREE.Color(p.fogColor);
  }

  update(dt) {
    this.time += dt;
    for (const cloud of this.clouds) {
      cloud.position.x += cloud.userData.drift * dt * 2;
      if (cloud.position.x > 22000)  cloud.position.x = -22000;
      if (cloud.position.x < -22000) cloud.position.x =  22000;
    }
  }

  followCamera(pos) {
    if (this.sky) this.sky.position.copy(pos);
    // Clouds also follow camera on XZ plane (infinite horizon effect)
    for (const cloud of this.clouds) {
      // no-op: clouds stay in world space, fog handles the distance fade
    }
  }

  _dispose() {
    if (this.sky) { this.scene.remove(this.sky); this.sky = null; }
    for (const l of this._lights) this.scene.remove(l);
    this._lights = [];
    for (const c of this.clouds) {
      this.scene.remove(c);
      c.geometry?.dispose();
      c.material?.dispose();
    }
    this.clouds = [];
    this.scene.fog = null;
    this.scene.background = null;
    this.scene.environment = null;
  }
}
