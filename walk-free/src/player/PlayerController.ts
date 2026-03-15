import {
  Scene,
  Vector3,
  MeshBuilder,
  PBRMaterial,
  Color3,
  PhysicsAggregate,
  PhysicsShapeType,
  ArcRotateCamera,
  type AbstractMesh,
  Quaternion,
  Ray,
} from "@babylonjs/core";

const WALK_SPEED = 6;
const RUN_SPEED = 11;
const JUMP_FORCE = 5200;
const CAMERA_RADIUS = 7;
const CAM_LERP = 0.12;         // camera smoothing factor
const HEADBOB_FREQ = 8.5;      // oscillation per second
const HEADBOB_AMP = 0.10;      // vertical amplitude

export class PlayerController {
  private scene: Scene;
  private body: AbstractMesh;
  private aggregate: PhysicsAggregate;
  private camera: ArcRotateCamera;

  private keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
  private canJump = false;
  private disposed = false;

  private bobTime = 0;
  private isMoving = false;

  // smooth camera target
  private camTarget = Vector3.Zero();

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;

    // player capsule (cylinder)
    this.body = MeshBuilder.CreateCylinder("player", {
      height: 1.75,
      diameter: 0.55,
      tessellation: 10,
    }, scene);
    this.body.position = new Vector3(0, 4, 0);
    this.body.isPickable = false;

    const mat = new PBRMaterial("playerMat", scene);
    mat.albedoColor = new Color3(0.85, 0.22, 0.18);
    mat.metallic = 0.1;
    mat.roughness = 0.7;
    this.body.material = mat;

    // physics
    this.aggregate = new PhysicsAggregate(
      this.body,
      PhysicsShapeType.CYLINDER,
      { mass: 72, friction: 1.0, restitution: 0.0 },
      scene
    );
    this.aggregate.body.setAngularDamping(999);
    this.aggregate.body.setLinearDamping(0.4);

    // ArcRotateCamera — 3rd person
    this.camera = new ArcRotateCamera("cam", -Math.PI / 2, Math.PI / 3.5, CAMERA_RADIUS, Vector3.Zero(), scene);
    this.camera.lowerRadiusLimit = 2.5;
    this.camera.upperRadiusLimit = 14;
    this.camera.lowerBetaLimit = 0.25;
    this.camera.upperBetaLimit = Math.PI / 2.1;
    this.camera.attachControl(canvas, true);
    this.camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
    this.camera.inertia = 0.55;
    this.camera.angularSensibilityX = 400;
    this.camera.angularSensibilityY = 400;

    this.camTarget.copyFrom(this.body.position);

    this.keyDownHandler = this.makeKeyHandler(true);
    this.keyUpHandler = this.makeKeyHandler(false);
    window.addEventListener("keydown", this.keyDownHandler);
    window.addEventListener("keyup", this.keyUpHandler);

    scene.registerBeforeRender(() => this.update());
  }

  private makeKeyHandler(down: boolean) {
    return (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW": case "ArrowUp":    this.keys.w = down; break;
        case "KeyS": case "ArrowDown":  this.keys.s = down; break;
        case "KeyA": case "ArrowLeft":  this.keys.a = down; break;
        case "KeyD": case "ArrowRight": this.keys.d = down; break;
        case "Space":                   this.keys.space = down; break;
        case "ShiftLeft": case "ShiftRight": this.keys.shift = down; break;
      }
    };
  }

  private update(): void {
    if (this.disposed) return;

    const dt = this.scene.getEngine().getDeltaTime() / 1000; // seconds
    const pos = this.body.position;

    // ground check
    const ray = new Ray(pos, Vector3.Down(), 1.05);
    const hit = this.scene.pickWithRay(ray, (m) => m !== this.body && m.name !== "player");
    this.canJump = !!(hit?.hit);

    // movement — camera-yaw relative so W=forward, S=back, A=left, D=right
    const speed = this.keys.shift ? RUN_SPEED : WALK_SPEED;

    // forward direction = flat projection of camera look direction
    const camForward = this.camera.target.subtract(this.camera.position);
    camForward.y = 0;
    const fwdLen = camForward.length();
    if (fwdLen > 0.001) camForward.scaleInPlace(1 / fwdLen);

    // right = cross(up, forward) — left-hand: forward cross up
    const camRight = Vector3.Cross(camForward, Vector3.Up()).negate();

    let moveX = 0, moveZ = 0;

    if (this.keys.w) { moveX += camForward.x; moveZ += camForward.z; }
    if (this.keys.s) { moveX -= camForward.x; moveZ -= camForward.z; }
    if (this.keys.a) { moveX -= camRight.x;   moveZ -= camRight.z;   }
    if (this.keys.d) { moveX += camRight.x;   moveZ += camRight.z;   }

    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    this.isMoving = len > 0;

    if (len > 0) {
      moveX = (moveX / len) * speed;
      moveZ = (moveZ / len) * speed;
      // rotate player mesh to face movement direction
      const angle = Math.atan2(moveX, moveZ);
      this.body.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), angle);
    }

    const currentV = this.aggregate.body.getLinearVelocity();
    this.aggregate.body.setLinearVelocity(new Vector3(moveX, currentV.y, moveZ));

    // jump
    if (this.keys.space && this.canJump) {
      this.aggregate.body.applyImpulse(new Vector3(0, JUMP_FORCE, 0), pos);
      this.keys.space = false;
    }

    // headbob — subtle vertical camera oscillation while walking
    if (this.isMoving && this.canJump) {
      this.bobTime += dt * HEADBOB_FREQ * (this.keys.shift ? 1.5 : 1.0);
    } else {
      // ease back to center
      this.bobTime *= 0.85;
    }
    const bobOffset = Math.sin(this.bobTime) * HEADBOB_AMP * (this.isMoving ? 1 : 0);

    // smooth camera target
    const targetPos = pos.add(new Vector3(0, 0.9 + bobOffset, 0));
    Vector3.LerpToRef(this.camTarget, targetPos, CAM_LERP, this.camTarget);
    this.camera.target.copyFrom(this.camTarget);
  }

  getPosition(): Vector3 {
    return this.body.position.clone();
  }

  dispose(): void {
    this.disposed = true;
    window.removeEventListener("keydown", this.keyDownHandler);
    window.removeEventListener("keyup", this.keyUpHandler);
    this.aggregate.dispose();
    this.body.dispose();
    this.camera.dispose();
  }
}
