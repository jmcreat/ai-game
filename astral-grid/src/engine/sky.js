/**
 * Sky Engine — Atmospheric scattering, golden hour sun, volumetric clouds
 * Uses Three.js Sky addon shader
 */

import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const CLOUD_LAYERS  = 3;
const CLOUDS_PER_LAYER = 60;

export class SkyEngine {
  constructor(scene, renderer) {
    this.scene    = scene;
    this.renderer = renderer;
    this.sky      = null;
    this.sun      = new THREE.Vector3();
    this.clouds   = [];
    this.time     = 0;  // for cloud animation
  }

  build() {
    this._buildSky();
    this._buildClouds();
    this._buildFog();
    return this;
  }

  _buildSky() {
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);
    this.scene.add(this.sky);

    const uniforms = this.sky.material.uniforms;
    // Golden hour parameters
    uniforms['turbidity'].value    = 3.5;
    uniforms['rayleigh'].value     = 2.8;
    uniforms['mieCoefficient'].value   = 0.006;
    uniforms['mieDirectionalG'].value  = 0.92;

    // Sun position — low angle for golden hour
    const phi   = THREE.MathUtils.degToRad(88);   // near horizon
    const theta = THREE.MathUtils.degToRad(230);  // south-west direction
    this.sun.setFromSphericalCoords(1, phi, theta);
    uniforms['sunPosition'].value.copy(this.sun);

    // Directional light matching sun
    this.sunLight = new THREE.DirectionalLight(0xffcc77, 3.2);
    this.sunLight.position.copy(this.sun).multiplyScalar(10000);
    this.sunLight.castShadow = false;
    this.scene.add(this.sunLight);

    // Ambient — warm fill
    this.ambientLight = new THREE.AmbientLight(0x4466aa, 0.6);
    this.scene.add(this.ambientLight);

    // Hemisphere light — sky/ground colour
    this.hemiLight = new THREE.HemisphereLight(0xffd580, 0x2244aa, 0.8);
    this.scene.add(this.hemiLight);

    // Update env map for reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmremGenerator.fromScene(new RoomEnvironment()).texture;
    this.scene.environment = this.envMap;
    pmremGenerator.dispose();
  }

  _buildClouds() {
    // Layered flat cloud quads with soft transparency
    const cloudTex = this._createCloudTexture();

    const altitudes = [1800, 2800, 4200];
    const spreads   = [18000, 24000, 30000];
    const sizes     = [1400, 2000, 2600];

    for (let layer = 0; layer < CLOUD_LAYERS; layer++) {
      for (let c = 0; c < CLOUDS_PER_LAYER; c++) {
        const w   = sizes[layer] * (0.5 + Math.random());
        const h   = w * 0.25 * (0.6 + Math.random() * 0.8);
        const geo = new THREE.PlaneGeometry(w, h);
        geo.rotateX(-Math.PI / 2);

        const mat = new THREE.MeshBasicMaterial({
          map:         cloudTex,
          transparent: true,
          opacity:     0.35 + Math.random() * 0.25,
          depthWrite:  false,
          side:        THREE.DoubleSide,
          fog:         false,
        });

        const cloud = new THREE.Mesh(geo, mat);
        const s = spreads[layer];
        cloud.position.set(
          (Math.random() - 0.5) * s,
          altitudes[layer] + (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * s
        );
        cloud.userData.driftSpeed = (Math.random() - 0.5) * 0.4;
        cloud.rotation.y = Math.random() * Math.PI;

        this.scene.add(cloud);
        this.clouds.push(cloud);
      }
    }
  }

  _createCloudTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(
      size/2, size/2, 0,
      size/2, size/2, size/2
    );
    grad.addColorStop(0,   'rgba(255,255,255,0.95)');
    grad.addColorStop(0.3, 'rgba(240,240,240,0.7)');
    grad.addColorStop(0.6, 'rgba(220,225,235,0.3)');
    grad.addColorStop(1,   'rgba(200,210,220,0)');

    // Multiple overlapping soft blobs
    for (let i = 0; i < 6; i++) {
      const x = size * (0.2 + Math.random() * 0.6);
      const y = size * (0.3 + Math.random() * 0.4);
      const r = size * (0.1 + Math.random() * 0.2);
      const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
      g2.addColorStop(0,   'rgba(255,255,255,0.6)');
      g2.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  _buildFog() {
    // Exponential fog for atmospheric depth
    this.scene.fog = new THREE.FogExp2(0xc8b090, 0.000028);
  }

  update(dt) {
    this.time += dt;
    // Slowly drift clouds
    for (const cloud of this.clouds) {
      cloud.position.x += cloud.userData.driftSpeed * dt * 2;
      // Wrap around
      if (cloud.position.x > 20000)  cloud.position.x = -20000;
      if (cloud.position.x < -20000) cloud.position.x =  20000;
    }
  }

  getSunDirection() {
    return this.sun.clone().normalize();
  }
}
