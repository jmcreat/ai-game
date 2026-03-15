/**
 * Terrain Engine — Procedural Alpine terrain using Simplex Noise
 * Generates snow-capped peaks, rocky ridges, green valleys
 */

import * as THREE from 'three';

// ── Simplex Noise (inline, no extra dependency) ─────────────────────────────
// Simplified 2D Simplex Noise implementation
class SimplexNoise {
  constructor(seed = 42) {
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Seeded shuffle
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

  // Fractal Brownian Motion
  fbm(x, y, octaves = 8, lacunarity = 2.0, gain = 0.5) {
    let value = 0, amplitude = 0.5, frequency = 1;
    let max = 0;
    for (let i = 0; i < octaves; i++) {
      value     += amplitude * this.noise2D(x * frequency, y * frequency);
      max       += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return value / max;
  }
}

// ── Terrain class ─────────────────────────────────────────────────────────────

const TERRAIN_SIZE    = 40000;   // world units (meters)
const TERRAIN_SEGS    = 300;     // vertex grid resolution
const MAX_HEIGHT      = 4800;    // tallest peak in world units
const SNOW_LINE       = 0.72;    // relative height threshold for snow
const TREE_LINE       = 0.48;
const ROCK_LINE       = 0.60;

export class Terrain {
  constructor(scene) {
    this.scene   = scene;
    this.noise   = new SimplexNoise(1337);
    this.mesh    = null;
    this.heights = null;  // flat Float32Array of height values
  }

  build() {
    const geo = new THREE.PlaneGeometry(
      TERRAIN_SIZE, TERRAIN_SIZE,
      TERRAIN_SEGS, TERRAIN_SEGS
    );
    geo.rotateX(-Math.PI / 2);

    const pos     = geo.attributes.position;
    const count   = pos.count;
    const verts   = TERRAIN_SEGS + 1;
    this.heights  = new Float32Array(count);

    // Generate heights using multi-octave fBm
    for (let i = 0; i < count; i++) {
      const x  = pos.getX(i);
      const z  = pos.getZ(i);
      const nx = x / TERRAIN_SIZE * 3.2;
      const nz = z / TERRAIN_SIZE * 3.2;

      // Base alpine shape: fBm
      let h = this.noise.fbm(nx, nz, 8, 2.1, 0.48);
      h = (h + 1) / 2;  // remap to [0,1]

      // Ridge-like peaks: abs() of noise creates sharper ridges
      const ridgeN = this.noise.fbm(nx * 1.8, nz * 1.8, 5, 2.0, 0.5);
      const ridge  = 1 - Math.abs(ridgeN);
      h = h * 0.55 + ridge * ridge * 0.45;

      // Flatten valley bottoms
      h = Math.pow(h, 1.6);

      const worldH = h * MAX_HEIGHT;
      pos.setY(i, worldH);
      this.heights[i] = worldH;
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();

    // Vertex color based on height / slope
    this._addVertexColors(geo, pos, count);

    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      fog: true,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    // Add water plane for lakes / valleys
    this._addWater();

    return this;
  }

  _addVertexColors(geo, pos, count) {
    const colors = new Float32Array(count * 3);
    const normals = geo.attributes.normal;

    // Color palette
    const snowColor  = new THREE.Color(0.92, 0.94, 0.98);
    const rockColor  = new THREE.Color(0.38, 0.35, 0.33);
    const alpineColor= new THREE.Color(0.30, 0.40, 0.22);
    const grassColor = new THREE.Color(0.24, 0.45, 0.18);
    const dirtColor  = new THREE.Color(0.42, 0.38, 0.28);
    const waterColor = new THREE.Color(0.10, 0.22, 0.36);

    for (let i = 0; i < count; i++) {
      const h  = pos.getY(i);
      const hr = h / MAX_HEIGHT;  // normalized [0,1]

      // Slope from normal (Y component — 1 = flat, 0 = vertical)
      const ny    = normals.getY(i);
      const slope = 1 - Math.abs(ny);  // 0 = flat, 1 = vertical cliff

      let c = new THREE.Color();

      if (hr > SNOW_LINE) {
        // Snow — cover flat areas more than cliffs
        const snowAmount = Math.min(1, (hr - SNOW_LINE) / 0.1 + (1 - slope) * 0.5);
        c.lerpColors(rockColor, snowColor, Math.min(1, snowAmount));
      } else if (hr > ROCK_LINE || slope > 0.55) {
        c.lerpColors(alpineColor, rockColor, Math.min(1, slope * 1.5 + (hr - ROCK_LINE) * 3));
      } else if (hr > TREE_LINE) {
        c.lerpColors(grassColor, alpineColor, (hr - TREE_LINE) / (ROCK_LINE - TREE_LINE));
      } else if (hr > 0.1) {
        c.lerpColors(dirtColor, grassColor, (hr - 0.1) / (TREE_LINE - 0.1));
      } else {
        c.copy(waterColor);
      }

      // Micro-variation via noise
      const vn = 1 + this.noise.noise2D(pos.getX(i) * 0.001, pos.getZ(i) * 0.001) * 0.06;
      colors[i * 3]     = Math.max(0, Math.min(1, c.r * vn));
      colors[i * 3 + 1] = Math.max(0, Math.min(1, c.g * vn));
      colors[i * 3 + 2] = Math.max(0, Math.min(1, c.b * vn));
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  _addWater() {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshLambertMaterial({
      color:       0x1a3a5c,
      transparent: true,
      opacity:     0.82,
      fog: true,
    });
    const water = new THREE.Mesh(geo, mat);
    water.position.y = MAX_HEIGHT * 0.08;  // water level
    this.scene.add(water);
  }

  /**
   * Get interpolated terrain height at world (x, z).
   */
  getHeightAt(x, z) {
    if (!this.heights) return 0;
    // Map world coords to noise
    const nx = (x / TERRAIN_SIZE * 3.2);
    const nz = (z / TERRAIN_SIZE * 3.2);
    let h = this.noise.fbm(nx, nz, 8, 2.1, 0.48);
    h = (h + 1) / 2;
    const ridgeN = this.noise.fbm(nx * 1.8, nz * 1.8, 5, 2.0, 0.5);
    const ridge  = 1 - Math.abs(ridgeN);
    h = h * 0.55 + ridge * ridge * 0.45;
    h = Math.pow(h, 1.6);
    return h * MAX_HEIGHT;
  }
}
