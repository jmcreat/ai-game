/**
 * Camera Engine — 1st-person cockpit camera
 * Parented to aircraft transform with turbulence shake
 */

import * as THREE from 'three';

// Cockpit eye position offset from aircraft centre (slightly right + up)
const EYE_OFFSET = new THREE.Vector3(0.55, 1.45, 1.8);

export class CockpitCamera {
  constructor(renderer) {
    this.camera = new THREE.PerspectiveCamera(
      72,                                        // FOV — wide to simulate 16mm lens
      window.innerWidth / window.innerHeight,
      0.5,
      120000
    );

    // Pivot object — attached to aircraft
    this.pivot = new THREE.Object3D();

    // Shake state
    this._shakeTime   = 0;
    this._shakeAmount = 0;  // 0–1

    window.addEventListener('resize', () => this._onResize());
  }

  attachToAircraft(aircraftObject) {
    aircraftObject.add(this.pivot);
    this.pivot.position.copy(EYE_OFFSET);
    this.pivot.add(this.camera);
    this.camera.position.set(0, 0, 0);
    this.camera.rotation.set(0, 0, 0);
  }

  /**
   * Set turbulence intensity 0–1.
   * The camera will shake with Perlin-like noise at this intensity.
   */
  setTurbulence(amount) {
    this._shakeAmount = Math.max(0, Math.min(1, amount));
  }

  update(dt, speed) {
    this._shakeTime += dt * 0.003;

    if (this._shakeAmount > 0.001) {
      const s  = this._shakeAmount;
      const t  = this._shakeTime;

      // Pseudo-random shake using multiple sine frequencies
      const rx = (Math.sin(t * 7.3) + Math.sin(t * 13.1) * 0.4) * 0.004 * s;
      const ry = (Math.sin(t * 5.7) + Math.sin(t * 11.9) * 0.3) * 0.003 * s;
      const rz = (Math.sin(t * 9.1) + Math.sin(t * 3.7)  * 0.5) * 0.002 * s;

      this.camera.rotation.x = rx;
      this.camera.rotation.y = ry;
      this.camera.rotation.z = rz;
    } else {
      this.camera.rotation.x *= 0.85;
      this.camera.rotation.y *= 0.85;
      this.camera.rotation.z *= 0.85;
    }

    // Speed-based vibration (engine vibration at high throttle)
    const speedNorm = Math.max(0, speed / 500);
    const vibr = Math.sin(this._shakeTime * 180) * 0.0003 * speedNorm;
    this.camera.position.y = vibr;
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  get threeCamera() {
    return this.camera;
  }
}
