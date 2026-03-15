/**
 * Camera Engine — Multi-mode cockpit/external camera
 * Modes: cockpit (1인칭), chase (외부 추적), tower (지상 고정), wing (날개 뷰)
 */

import * as THREE from 'three';

const MODES = ['cockpit', 'chase', 'tower', 'wing'];

// Offsets relative to aircraft
const MODE_OFFSETS = {
  cockpit: new THREE.Vector3(0.55, 1.45, 1.8),   // inside cockpit, slightly right
  chase:   new THREE.Vector3(0, 4, -28),           // behind & above
  wing:    new THREE.Vector3(18, 1.5, -2),         // right wingtip
};

export class CockpitCamera {
  constructor(renderer) {
    this.camera = new THREE.PerspectiveCamera(
      72,
      window.innerWidth / window.innerHeight,
      0.5,
      500000
    );

    this.pivot      = new THREE.Object3D();
    this._mode      = 'cockpit';
    this._modeIndex = 0;

    // Tower camera: fixed position, tracks aircraft
    this._towerPos    = new THREE.Vector3(2000, 800, 2000);
    this._towerTarget = new THREE.Vector3();

    this._shakeTime   = 0;
    this._shakeAmount = 0;
    this._aircraftObj = null;

    // Smooth chase camera
    this._chasePos = new THREE.Vector3();
    this._chaseInit = false;

    window.addEventListener('resize', () => this._onResize());
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyV') this.nextMode();
    });
  }

  attachToAircraft(aircraftObject) {
    this._aircraftObj = aircraftObject;
    aircraftObject.add(this.pivot);
    this.pivot.position.copy(MODE_OFFSETS.cockpit);
    this.pivot.add(this.camera);
    this.camera.position.set(0, 0, 0);
    this.camera.rotation.set(0, 0, 0);
  }

  nextMode() {
    this._modeIndex = (this._modeIndex + 1) % MODES.length;
    this._mode = MODES[this._modeIndex];
    this._applyMode();
    // Dispatch event so HUD can show current mode
    window.dispatchEvent(new CustomEvent('cameraMode', { detail: this._mode }));
  }

  _applyMode() {
    if (!this._aircraftObj) return;

    if (this._mode === 'cockpit') {
      // Re-attach pivot inside aircraft
      if (!this.pivot.parent) this._aircraftObj.add(this.pivot);
      this.pivot.position.copy(MODE_OFFSETS.cockpit);
      this.camera.fov = 72;
    } else if (this._mode === 'chase') {
      if (!this.pivot.parent) this._aircraftObj.add(this.pivot);
      this.pivot.position.copy(MODE_OFFSETS.chase);
      this.camera.fov = 65;
      this._chaseInit = false;
    } else if (this._mode === 'tower') {
      // Detach from aircraft for tower mode
      if (this.pivot.parent) this.pivot.parent.remove(this.pivot);
      this.pivot.position.copy(this._towerPos);
      this.camera.fov = 45;
    } else if (this._mode === 'wing') {
      if (!this.pivot.parent) this._aircraftObj.add(this.pivot);
      this.pivot.position.copy(MODE_OFFSETS.wing);
      this.camera.fov = 80;
    }
    this.camera.updateProjectionMatrix();
  }

  setTurbulence(amount) {
    this._shakeAmount = Math.max(0, Math.min(1, amount));
  }

  update(dt, speed) {
    this._shakeTime += dt * 0.003;

    if (this._mode === 'cockpit') {
      this._updateCockpit(dt, speed);
    } else if (this._mode === 'chase') {
      this._updateChase(dt);
    } else if (this._mode === 'tower') {
      this._updateTower();
    } else if (this._mode === 'wing') {
      this._updateWing(dt, speed);
    }
  }

  _updateCockpit(dt, speed) {
    if (this._shakeAmount > 0.001) {
      const s = this._shakeAmount, t = this._shakeTime;
      this.camera.rotation.x = (Math.sin(t * 7.3) + Math.sin(t * 13.1) * 0.4) * 0.004 * s;
      this.camera.rotation.y = (Math.sin(t * 5.7) + Math.sin(t * 11.9) * 0.3) * 0.003 * s;
      this.camera.rotation.z = (Math.sin(t * 9.1) + Math.sin(t * 3.7)  * 0.5) * 0.002 * s;
    } else {
      this.camera.rotation.x *= 0.85;
      this.camera.rotation.y *= 0.85;
      this.camera.rotation.z *= 0.85;
    }
    const vibr = Math.sin(this._shakeTime * 180) * 0.0003 * Math.max(0, speed / 500);
    this.camera.position.y = vibr;
  }

  _updateChase(dt) {
    if (!this._aircraftObj) return;
    // Compute world position of the chase offset
    const worldOffset = MODE_OFFSETS.chase.clone().applyMatrix4(this._aircraftObj.matrixWorld);
    // but we want offset in local aircraft direction
    const target = new THREE.Vector3();
    this._aircraftObj.getWorldPosition(target);

    const desiredPos = new THREE.Vector3();
    desiredPos.copy(MODE_OFFSETS.chase).applyMatrix4(this._aircraftObj.matrixWorld);

    if (!this._chaseInit) {
      this._chasePos.copy(desiredPos);
      this._chaseInit = true;
    }
    // Smooth follow
    const alpha = 1 - Math.pow(0.04, dt / 1000);
    this._chasePos.lerp(desiredPos, alpha);

    this.camera.position.setFromMatrixPosition(this.pivot.matrixWorld);
    this.camera.lookAt(target);
  }

  _updateTower() {
    if (!this._aircraftObj) return;
    const target = new THREE.Vector3();
    this._aircraftObj.getWorldPosition(target);
    this.camera.position.copy(this._towerPos);
    this.camera.lookAt(target);
  }

  _updateWing(dt, speed) {
    // Look slightly forward and down from wingtip
    if (this._shakeAmount > 0.001) {
      const s = this._shakeAmount * 0.5, t = this._shakeTime;
      this.camera.rotation.x = Math.sin(t * 6.2) * 0.003 * s;
      this.camera.rotation.z = Math.sin(t * 4.8) * 0.002 * s;
    } else {
      this.camera.rotation.x *= 0.9;
      this.camera.rotation.z *= 0.9;
    }
    // Slight down tilt to see the wing surface
    this.camera.rotation.y = -0.08;
  }

  get threeCamera() { return this.camera; }
  get mode()        { return this._mode; }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
