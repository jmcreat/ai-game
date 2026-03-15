/**
 * Terrain Engine — Multi-scenario procedural terrain
 * Supports: alps, arctic, desert, city, volcano
 */

import * as THREE from 'three';

// ── Simplex Noise ────────────────────────────────────────────────────────────
class SimplexNoise {
  constructor(seed = 42) {
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      const j = (s >>> 0) % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  noise2D(x, y) {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t, Y0 = j - t;
    const x0 = x - X0, y0 = y - Y0;
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
    const GRAD = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[1,0],[-1,0],[0,1],[0,-1],[0,1],[0,-1]];
    const dot = (g, x, y) => g[0]*x + g[1]*y;
    let n0 = 0, nn1 = 0, n2 = 0;
    let t0 = 0.5 - x0*x0 - y0*y0;
    if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * dot(GRAD[gi0], x0, y0); }
    let tt1 = 0.5 - x1*x1 - y1*y1;
    if (tt1 >= 0) { tt1 *= tt1; nn1 = tt1 * tt1 * dot(GRAD[gi1], x1, y1); }
    let t2 = 0.5 - x2*x2 - y2*y2;
    if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * dot(GRAD[gi2], x2, y2); }
    return 70 * (n0 + nn1 + n2);
  }

  fbm(x, y, octaves = 8, lacunarity = 2.0, gain = 0.5) {
    let value = 0, amplitude = 0.5, frequency = 1, max = 0;
    for (let i = 0; i < octaves; i++) {
      value     += amplitude * this.noise2D(x * frequency, y * frequency);
      max       += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return value / max;
  }
}

// ── Scenario Definitions ─────────────────────────────────────────────────────

export const SCENARIOS = {
  alps: {
    id:          'alps',
    name:        'Swiss Alps',
    subtitle:    'Golden Hour · FL180',
    description: '눈 덮인 알프스 산맥 위 황금빛 석양',
    startAlt:    5500,
    terrainSize: 40000,
    terrainSegs: 280,
    maxHeight:   4800,
    seed:        1337,
    buildHeight: (noise, nx, nz) => {
      let h = noise.fbm(nx, nz, 8, 2.1, 0.48);
      h = (h + 1) / 2;
      const ridge = 1 - Math.abs(noise.fbm(nx * 1.8, nz * 1.8, 5, 2.0, 0.5));
      h = h * 0.55 + ridge * ridge * 0.45;
      return Math.pow(h, 1.6);
    },
    colorize: (hr, slope, noise, x, z) => {
      const snow  = new THREE.Color(0.92, 0.94, 0.98);
      const rock  = new THREE.Color(0.38, 0.35, 0.33);
      const alp   = new THREE.Color(0.30, 0.40, 0.22);
      const grass = new THREE.Color(0.24, 0.45, 0.18);
      const dirt  = new THREE.Color(0.42, 0.38, 0.28);
      const water = new THREE.Color(0.10, 0.22, 0.36);
      if (hr > 0.72) return new THREE.Color().lerpColors(rock, snow, Math.min(1, (hr - 0.72) / 0.1 + (1 - slope) * 0.5));
      if (hr > 0.60 || slope > 0.55) return new THREE.Color().lerpColors(alp, rock, Math.min(1, slope * 1.5 + (hr - 0.60) * 3));
      if (hr > 0.48) return new THREE.Color().lerpColors(grass, alp, (hr - 0.48) / 0.12);
      if (hr > 0.10) return new THREE.Color().lerpColors(dirt, grass, (hr - 0.1) / 0.38);
      return water.clone();
    },
    waterLevel: 0.08,
    waterColor: 0x1a3a5c,
  },

  arctic: {
    id:          'arctic',
    name:        'Arctic Tundra',
    subtitle:    'Midnight Sun · FL120',
    description: '끝없는 빙원과 오로라빛 하늘',
    startAlt:    3800,
    terrainSize: 50000,
    terrainSegs: 240,
    maxHeight:   1200,
    seed:        2024,
    buildHeight: (noise, nx, nz) => {
      let h = noise.fbm(nx * 0.6, nz * 0.6, 6, 2.0, 0.52);
      h = (h + 1) / 2;
      // Flat tundra with occasional ridges
      h = h * 0.35 + Math.pow(h, 0.5) * 0.15;
      return Math.max(0, h);
    },
    colorize: (hr, slope) => {
      const ice      = new THREE.Color(0.88, 0.93, 1.00);
      const snow     = new THREE.Color(0.95, 0.97, 1.00);
      const iceBlue  = new THREE.Color(0.72, 0.85, 0.96);
      const tundra   = new THREE.Color(0.60, 0.65, 0.70);
      if (hr > 0.7) return new THREE.Color().lerpColors(iceBlue, snow, (hr - 0.7) / 0.3);
      if (hr > 0.3) return new THREE.Color().lerpColors(tundra, ice, (hr - 0.3) / 0.4);
      return iceBlue.clone();
    },
    waterLevel: 0.05,
    waterColor: 0x1a4a6a,
  },

  desert: {
    id:          'desert',
    name:        'Sahara Desert',
    subtitle:    'Midday Heat · FL100',
    description: '광활한 모래 사막과 붉은 암반 지대',
    startAlt:    3200,
    terrainSize: 45000,
    terrainSegs: 240,
    maxHeight:   1600,
    seed:        9999,
    buildHeight: (noise, nx, nz) => {
      let h = noise.fbm(nx * 0.8, nz * 0.8, 6, 2.0, 0.45);
      h = (h + 1) / 2;
      // Dunes: gentle rolling shapes
      const dune = Math.abs(noise.fbm(nx * 3.0, nz * 3.0, 3, 2.0, 0.6));
      h = h * 0.4 + dune * 0.3 + 0.05;
      return Math.min(1, Math.pow(h, 1.2));
    },
    colorize: (hr, slope, noise, x, z) => {
      const sand     = new THREE.Color(0.85, 0.72, 0.42);
      const dune     = new THREE.Color(0.78, 0.58, 0.30);
      const rock     = new THREE.Color(0.60, 0.42, 0.28);
      const redRock  = new THREE.Color(0.72, 0.32, 0.18);
      const gravel   = new THREE.Color(0.65, 0.55, 0.40);
      if (hr > 0.75) return new THREE.Color().lerpColors(rock, redRock, (hr - 0.75) / 0.25);
      if (hr > 0.55 || slope > 0.4) return new THREE.Color().lerpColors(gravel, rock, Math.min(1, slope * 2 + (hr - 0.55) * 2));
      if (hr > 0.25) return new THREE.Color().lerpColors(sand, dune, (hr - 0.25) / 0.3);
      return sand.clone();
    },
    waterLevel: -0.1,  // no water visible
    waterColor: 0x8b6914,
  },

  city: {
    id:          'city',
    name:        'Megacity',
    subtitle:    'Night Approach · FL080',
    description: '야경이 빛나는 거대 도시 위 야간 비행',
    startAlt:    2400,
    terrainSize: 30000,
    terrainSegs: 220,
    maxHeight:   600,
    seed:        42,
    buildHeight: (noise, nx, nz) => {
      let h = noise.fbm(nx * 0.4, nz * 0.4, 4, 2.0, 0.5);
      h = (h + 1) / 2;
      // City blocks: stepped/quantized height for building effect
      const block = noise.fbm(nx * 8, nz * 8, 2, 2.0, 0.5);
      const blockH = ((block + 1) / 2);
      // Mix flat ground with tall blocks
      return h * 0.15 + blockH * blockH * 0.85;
    },
    colorize: (hr, slope, noise, x, z) => {
      // City lights effect via noise
      const n = ((noise.noise2D(x * 0.003, z * 0.003) + 1) / 2);
      const lightIntensity = Math.pow(hr, 0.8) * n;

      if (lightIntensity > 0.7) return new THREE.Color(1.0, 0.9, 0.5);   // bright streets
      if (lightIntensity > 0.5) return new THREE.Color(0.8, 0.6, 0.2);   // amber lights
      if (lightIntensity > 0.3) return new THREE.Color(0.3, 0.5, 0.9);   // blue office windows
      if (hr > 0.6) return new THREE.Color(0.15, 0.18, 0.25);            // dark towers
      return new THREE.Color(0.10, 0.12, 0.16);                          // roads
    },
    waterLevel: -0.05,
    waterColor: 0x0a1020,
  },

  volcano: {
    id:          'volcano',
    name:        'Volcanic Island',
    subtitle:    'Dusk Eruption · FL140',
    description: '용암이 흐르는 활화산 섬 상공',
    startAlt:    4200,
    terrainSize: 35000,
    terrainSegs: 260,
    maxHeight:   3800,
    seed:        6666,
    buildHeight: (noise, nx, nz) => {
      let h = noise.fbm(nx, nz, 7, 2.2, 0.50);
      h = (h + 1) / 2;
      // Volcano cone: distance-based elevation boost at centre
      const dist = Math.sqrt(nx * nx + nz * nz) * 0.8;
      const cone = Math.max(0, 1 - dist * dist * 0.5);
      h = h * 0.35 + cone * cone * 0.65;
      return Math.min(1, h);
    },
    colorize: (hr, slope, noise, x, z) => {
      const lava     = new THREE.Color(1.0, 0.25, 0.02);
      const hotRock  = new THREE.Color(0.65, 0.18, 0.05);
      const darkRock = new THREE.Color(0.15, 0.12, 0.10);
      const ash      = new THREE.Color(0.28, 0.26, 0.24);
      const jungle   = new THREE.Color(0.15, 0.42, 0.12);
      const lavaFlow = ((noise.noise2D(x * 0.002, z * 0.002) + 1) / 2);
      if (hr > 0.85) return new THREE.Color().lerpColors(hotRock, lava, Math.min(1, (hr - 0.85) / 0.1 + lavaFlow * 0.3));
      if (hr > 0.65) return new THREE.Color().lerpColors(ash, hotRock, (hr - 0.65) / 0.2);
      if (hr > 0.45 || slope > 0.5) return new THREE.Color().lerpColors(darkRock, ash, Math.min(1, (hr - 0.45) / 0.2 + slope));
      if (hr > 0.15) return new THREE.Color().lerpColors(jungle, darkRock, (hr - 0.15) / 0.3);
      return new THREE.Color(0.05, 0.18, 0.35);  // ocean
    },
    waterLevel: 0.06,
    waterColor: 0x0a2844,
  },
};

// ── Terrain class ─────────────────────────────────────────────────────────────

export class Terrain {
  constructor(scene) {
    this.scene    = scene;
    this.mesh     = null;
    this._objects = [];  // all scene objects owned by this terrain
    this.noise    = null;
    this.preset   = null;
  }

  build(scenarioId = 'alps') {
    // Clear previous terrain
    this._dispose();

    const preset = SCENARIOS[scenarioId] || SCENARIOS.alps;
    this.preset  = preset;
    this.noise   = new SimplexNoise(preset.seed);

    const { terrainSize: S, terrainSegs: SEG, maxHeight: MH } = preset;

    const geo = new THREE.PlaneGeometry(S, S, SEG, SEG);
    geo.rotateX(-Math.PI / 2);

    const pos   = geo.attributes.position;
    const count = pos.count;
    this._heights = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const x  = pos.getX(i);
      const z  = pos.getZ(i);
      const nx = x / S * 3.2;
      const nz = z / S * 3.2;
      const h  = preset.buildHeight(this.noise, nx, nz);
      const wh = h * MH;
      pos.setY(i, wh);
      this._heights[i] = wh;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    this._addVertexColors(geo, pos, count, preset, S, MH);

    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, fog: true });
    this.mesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.mesh);
    this._objects.push(this.mesh);

    // Water / ground plane
    if (preset.waterLevel > 0) {
      const wg  = new THREE.PlaneGeometry(S, S);
      wg.rotateX(-Math.PI / 2);
      const wm  = new THREE.MeshLambertMaterial({
        color: preset.waterColor, transparent: true, opacity: 0.82, fog: true,
      });
      const w   = new THREE.Mesh(wg, wm);
      w.position.y = preset.waterLevel * MH;
      this.scene.add(w);
      this._objects.push(w);
    }

    // City-specific: add a sparse grid of building boxes
    if (scenarioId === 'city') this._addCityBuildings(preset, S, MH);

    // Volcano-specific: add lava glow particles (point cloud)
    if (scenarioId === 'volcano') this._addLavaGlow(preset, MH);

    return this;
  }

  _addVertexColors(geo, pos, count, preset, S, MH) {
    const colors  = new Float32Array(count * 3);
    const normals = geo.attributes.normal;

    for (let i = 0; i < count; i++) {
      const h     = pos.getY(i);
      const hr    = h / MH;
      const ny    = normals.getY(i);
      const slope = 1 - Math.abs(ny);
      const x     = pos.getX(i);
      const z     = pos.getZ(i);
      const c     = preset.colorize(hr, slope, this.noise, x, z);
      // micro-variation
      const vn = 1 + this.noise.noise2D(x * 0.0008, z * 0.0008) * 0.07;
      colors[i * 3]     = Math.max(0, Math.min(1, c.r * vn));
      colors[i * 3 + 1] = Math.max(0, Math.min(1, c.g * vn));
      colors[i * 3 + 2] = Math.max(0, Math.min(1, c.b * vn));
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  _addCityBuildings(preset, S, MH) {
    // Instanced boxes for performance (1000 buildings)
    const count = 1200;
    const geo   = new THREE.BoxGeometry(1, 1, 1);
    const mat   = new THREE.MeshLambertMaterial({ color: 0x1a2030 });
    const iMesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    const half  = S / 2;

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * S * 0.9;
      const z = (Math.random() - 0.5) * S * 0.9;
      const h = 30 + Math.random() * Math.random() * 500;  // power distribution
      const w = 40 + Math.random() * 120;
      dummy.position.set(x, this.getHeightAt(x, z) + h / 2, z);
      dummy.scale.set(w, h, w * (0.5 + Math.random()));
      dummy.updateMatrix();
      iMesh.setMatrixAt(i, dummy.matrix);

      // Window glow colour
      const r = Math.random();
      if (r > 0.7) iMesh.setColorAt(i, new THREE.Color(0.9, 0.8, 0.4));
      else if (r > 0.4) iMesh.setColorAt(i, new THREE.Color(0.3, 0.5, 0.9));
      else iMesh.setColorAt(i, new THREE.Color(0.15, 0.18, 0.25));
    }
    iMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(iMesh);
    this._objects.push(iMesh);
  }

  _addLavaGlow(preset, MH) {
    // Point cloud glow near volcano summit
    const count  = 800;
    const geo    = new THREE.BufferGeometry();
    const pts    = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r     = Math.random() * 800;
      const x     = Math.cos(angle) * r;
      const z     = Math.sin(angle) * r;
      const y     = this.getHeightAt(x, z) + 50 + Math.random() * 400;
      pts[i * 3]     = x;
      pts[i * 3 + 1] = y;
      pts[i * 3 + 2] = z;
      const heat = 1 - r / 800;
      colors[i * 3]     = 1.0;
      colors[i * 3 + 1] = heat * 0.3;
      colors[i * 3 + 2] = 0.0;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 18, vertexColors: true, transparent: true, opacity: 0.7, fog: false });
    const pts3 = new THREE.Points(geo, mat);
    this.scene.add(pts3);
    this._objects.push(pts3);
  }

  getHeightAt(x, z) {
    if (!this.preset || !this.noise) return 0;
    const { terrainSize: S, maxHeight: MH } = this.preset;
    const nx = x / S * 3.2;
    const nz = z / S * 3.2;
    const h  = this.preset.buildHeight(this.noise, nx, nz);
    return h * MH;
  }

  _dispose() {
    for (const obj of this._objects) {
      this.scene.remove(obj);
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material?.dispose();
    }
    this._objects = [];
    this.mesh = null;
  }
}
