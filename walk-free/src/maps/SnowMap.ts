import {
  Scene,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color3,
  Color4,
  MeshBuilder,
  PBRMaterial,
  PhysicsAggregate,
  PhysicsShapeType,
  ShadowGenerator,
  ParticleSystem,
  Texture,
  type AbstractMesh,
  Mesh,
  VertexBuffer,
} from "@babylonjs/core";
import type { IMap } from "../types";

// Simple seeded pseudo-random for deterministic terrain
class SeededRng {
  private s: number;
  constructor(seed = 42) { this.s = seed; }
  next(): number {
    this.s = (this.s * 1664525 + 1013904223) & 0xffffffff;
    return (this.s >>> 0) / 0xffffffff;
  }
}

export class SnowMap implements IMap {
  id = "snow";
  name = "설원";
  description = "눈 덮인 광활한 들판";
  available = true;

  private meshes: AbstractMesh[] = [];
  private particles: ParticleSystem[] = [];
  private shadowGen!: ShadowGenerator;

  async load(scene: Scene): Promise<void> {
    this.setupAtmosphere(scene);
    const sun = this.setupLighting(scene);
    this.setupGround(scene, sun);
    this.addTrees(scene);
    this.addBoulders(scene);
    this.addSnowParticles(scene);
  }

  // ── Atmosphere ───────────────────────────────────────────────────────────
  private setupAtmosphere(scene: Scene): void {
    // overcast winter sky
    scene.clearColor = new Color4(0.68, 0.80, 0.92, 1);
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogColor = new Color3(0.78, 0.87, 0.95);
    scene.fogDensity = 0.012;
    scene.ambientColor = new Color3(0.35, 0.42, 0.52);
  }

  // ── Lighting ─────────────────────────────────────────────────────────────
  private setupLighting(scene: Scene): DirectionalLight {
    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.55;
    hemi.diffuse = new Color3(0.78, 0.88, 1.0);
    hemi.groundColor = new Color3(0.42, 0.52, 0.65);
    hemi.specular = new Color3(0, 0, 0);

    // low-angle winter sun
    const sun = new DirectionalLight("sun", new Vector3(-1, -1.4, -0.6), scene);
    sun.intensity = 2.8;
    sun.diffuse = new Color3(1.0, 0.95, 0.85);
    sun.specular = new Color3(0.5, 0.5, 0.4);
    sun.position = new Vector3(60, 80, 40);

    // shadow generator
    this.shadowGen = new ShadowGenerator(2048, sun);
    this.shadowGen.useBlurExponentialShadowMap = true;
    this.shadowGen.blurKernel = 16;
    this.shadowGen.darkness = 0.4;

    return sun;
  }

  // ── Ground ───────────────────────────────────────────────────────────────
  private setupGround(scene: Scene, _sun: DirectionalLight): void {
    const size = 200;
    const subs = 120;

    const ground = MeshBuilder.CreateGround("ground", {
      width: size,
      height: size,
      subdivisions: subs,
      updatable: true,
    }, scene);

    // apply procedural height via vertex displacement
    this.applyProceduralHeight(ground, subs);

    const mat = new PBRMaterial("snowGround", scene);
    mat.albedoColor = new Color3(0.92, 0.96, 1.0);
    mat.metallic = 0.0;
    mat.roughness = 0.92;
    mat.ambientColor = new Color3(0.5, 0.6, 0.7);
    // subtle microvariation — no texture needed
    mat.useParallaxOcclusion = false;
    ground.material = mat;
    ground.receiveShadows = true;

    new PhysicsAggregate(ground, PhysicsShapeType.MESH, { mass: 0 }, scene);
    this.meshes.push(ground);
  }

  /** Perlin-like layered sine noise for terrain height */
  private applyProceduralHeight(ground: Mesh, _subs: number): void {
    const positions = ground.getVerticesData(VertexBuffer.PositionKind);
    if (!positions) return;

    const rng = new SeededRng(137);

    // random phase offsets per octave
    const phases = Array.from({ length: 6 }, () => rng.next() * Math.PI * 2);

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];

      // layered sine noise (cheap Perlin substitute)
      const h =
        Math.sin(x * 0.04 + phases[0]) * Math.cos(z * 0.04 + phases[1]) * 3.5 +
        Math.sin(x * 0.10 + phases[2]) * Math.cos(z * 0.09 + phases[3]) * 1.2 +
        Math.sin(x * 0.22 + phases[4]) * Math.cos(z * 0.21 + phases[5]) * 0.35;

      // flatten spawn area (radius 8)
      const distFromCenter = Math.sqrt(x * x + z * z);
      const flatten = Math.min(1, Math.max(0, (distFromCenter - 6) / 8));

      positions[i + 1] = h * flatten;
    }

    ground.updateVerticesData(VertexBuffer.PositionKind, positions);
    ground.createNormals(true); // recalculate normals for lighting
  }

  // ── Trees ─────────────────────────────────────────────────────────────────
  private addTrees(scene: Scene): void {
    const rng = new SeededRng(7);
    const positions = this.scatter(45, 85, 10, rng);

    // shared materials
    const trunkMat = new PBRMaterial("trunkMat", scene);
    trunkMat.albedoColor = new Color3(0.38, 0.25, 0.16);
    trunkMat.metallic = 0.0;
    trunkMat.roughness = 0.95;

    for (const [x, z] of positions) {
      const scale = 0.7 + rng.next() * 0.8;
      const rotY = rng.next() * Math.PI * 2;

      // trunk
      const trunk = MeshBuilder.CreateCylinder(`trunk_${x}`, {
        height: 2.2 * scale,
        diameterTop: 0.22 * scale,
        diameterBottom: 0.35 * scale,
        tessellation: 7,
      }, scene);
      trunk.position.set(x, 1.1 * scale, z);
      trunk.rotation.y = rotY;
      trunk.material = trunkMat;
      trunk.receiveShadows = true;
      this.shadowGen.addShadowCaster(trunk);
      new PhysicsAggregate(trunk, PhysicsShapeType.CYLINDER, { mass: 0 }, scene);
      this.meshes.push(trunk);

      // 4 layered snow-cone tiers
      const tierCount = 4;
      for (let t = 0; t < tierCount; t++) {
        const tFrac = t / (tierCount - 1);
        const coneH = (1.5 - tFrac * 0.3) * scale;
        const coneD = (2.8 - tFrac * 0.55) * scale;
        const yBase = (2.0 + t * 1.05) * scale;

        // dark green layer (partially visible beneath snow)
        const green = MeshBuilder.CreateCylinder(`treeGreen_${x}_${t}`, {
          height: coneH * 0.7,
          diameterTop: 0,
          diameterBottom: coneD * 0.92,
          tessellation: 7,
        }, scene);
        green.position.set(x, yBase - coneH * 0.15, z);
        green.rotation.y = rotY + t * 0.25;
        const gMat = new PBRMaterial(`gMat_${x}_${t}`, scene);
        gMat.albedoColor = new Color3(0.12 + tFrac * 0.06, 0.28 + tFrac * 0.05, 0.14);
        gMat.metallic = 0.0;
        gMat.roughness = 0.98;
        green.material = gMat;
        green.receiveShadows = true;
        this.shadowGen.addShadowCaster(green);
        this.meshes.push(green);

        // snow cap on top
        const snow = MeshBuilder.CreateCylinder(`treeSnow_${x}_${t}`, {
          height: coneH * 0.55,
          diameterTop: coneD * 0.06,
          diameterBottom: coneD * 0.78,
          tessellation: 7,
        }, scene);
        snow.position.set(x, yBase + coneH * 0.18, z);
        snow.rotation.y = rotY + t * 0.4;
        const sMat = new PBRMaterial(`sConeMat_${x}_${t}`, scene);
        sMat.albedoColor = new Color3(0.91 + tFrac * 0.04, 0.95 + tFrac * 0.02, 1.0);
        sMat.metallic = 0.0;
        sMat.roughness = 0.75;
        snow.material = sMat;
        snow.receiveShadows = true;
        this.shadowGen.addShadowCaster(snow);
        this.meshes.push(snow);
      }
    }
  }

  // ── Boulders ──────────────────────────────────────────────────────────────
  private addBoulders(scene: Scene): void {
    const rng = new SeededRng(31);
    const positions = this.scatter(25, 90, 6, rng);

    for (const [x, z] of positions) {
      const s = 0.5 + rng.next() * 1.1;
      const rock = MeshBuilder.CreateSphere(`rock_${x}`, {
        diameter: s,
        segments: 5,
      }, scene);
      rock.position.set(x, s * 0.38, z);
      rock.scaling.set(
        0.85 + rng.next() * 0.3,
        0.55 + rng.next() * 0.3,
        0.85 + rng.next() * 0.3
      );
      rock.rotation.y = rng.next() * Math.PI * 2;

      const mat = new PBRMaterial(`rockMat_${x}`, scene);
      const grayVal = 0.5 + rng.next() * 0.2;
      mat.albedoColor = new Color3(grayVal, grayVal + 0.02, grayVal + 0.05);
      mat.metallic = 0.0;
      mat.roughness = 0.88;
      rock.material = mat;
      rock.receiveShadows = true;
      this.shadowGen.addShadowCaster(rock);
      new PhysicsAggregate(rock, PhysicsShapeType.SPHERE, { mass: 0 }, scene);
      this.meshes.push(rock);
    }
  }

  // ── Snow Particles ────────────────────────────────────────────────────────
  private addSnowParticles(scene: Scene): void {
    const ps = new ParticleSystem("snow", 1200, scene);
    ps.particleTexture = new Texture(
      "https://assets.babylonjs.com/particles/snowflake.png",
      scene
    );

    // emit from a wide box high up, following the camera
    ps.createBoxEmitter(
      new Vector3(-0.2, -1, -0.2),
      new Vector3(0.2, -0.3, 0.2),
      new Vector3(-25, 18, -25),
      new Vector3(25, 22, 25)
    );

    ps.color1 = new Color4(0.95, 0.97, 1.0, 0.85);
    ps.color2 = new Color4(0.88, 0.93, 1.0, 0.55);
    ps.colorDead = new Color4(1, 1, 1, 0);

    ps.minSize = 0.06;
    ps.maxSize = 0.18;

    ps.minLifeTime = 6;
    ps.maxLifeTime = 10;

    ps.emitRate = 120;
    ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    ps.gravity = new Vector3(0.15, -1.8, 0);

    ps.minAngularSpeed = -0.5;
    ps.maxAngularSpeed = 0.5;
    ps.minEmitPower = 0.2;
    ps.maxEmitPower = 0.5;
    ps.updateSpeed = 0.012;

    ps.start();
    this.particles.push(ps);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private scatter(
    count: number,
    radius: number,
    minDist: number,
    rng: SeededRng
  ): [number, number][] {
    const results: [number, number][] = [];
    let attempts = 0;
    while (results.length < count && attempts < count * 15) {
      attempts++;
      const angle = rng.next() * Math.PI * 2;
      const r = minDist + rng.next() * (radius - minDist);
      results.push([Math.cos(angle) * r, Math.sin(angle) * r]);
    }
    return results;
  }

  dispose(): void {
    for (const mesh of this.meshes) mesh.dispose();
    for (const ps of this.particles) ps.dispose();
    this.meshes = [];
    this.particles = [];
  }
}
