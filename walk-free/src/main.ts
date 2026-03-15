import {
  Engine,
  Scene,
  HavokPlugin,
  Vector3,
} from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import { MapSelector } from "./MapSelector";
import { SnowMap } from "./maps/SnowMap";
import { PlayerController } from "./player/PlayerController";
import type { IMap } from "./types";

async function createEngine(): Promise<{ engine: Engine; canvas: HTMLCanvasElement }> {
  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
  });
  window.addEventListener("resize", () => engine.resize());
  return { engine, canvas };
}

async function startGame(mapId: string, engine: Engine, canvas: HTMLCanvasElement): Promise<void> {
  const scene = new Scene(engine);

  // init Havok physics
  const havok = await HavokPhysics();
  const physicsPlugin = new HavokPlugin(true, havok);
  scene.enablePhysics(new Vector3(0, -19.8, 0), physicsPlugin);

  // resolve map
  const mapRegistry: Record<string, IMap> = {
    snow: new SnowMap(),
  };

  const map = mapRegistry[mapId];
  if (!map) {
    console.error(`Unknown map: ${mapId}`);
    return;
  }

  await map.load(scene);

  new PlayerController(scene, canvas);

  // HUD — crosshair + mini controls hint
  const hud = document.createElement("div");
  hud.id = "hud";
  hud.innerHTML = `
    <div class="hud-crosshair">·</div>
    <div class="hud-hint">WASD 이동 &nbsp;·&nbsp; Shift 달리기 &nbsp;·&nbsp; 마우스 시야 &nbsp;·&nbsp; Space 점프</div>
  `;
  document.body.appendChild(hud);

  engine.runRenderLoop(() => scene.render());
}

async function main(): Promise<void> {
  const { engine, canvas } = await createEngine();

  new MapSelector(async (mapId) => {
    await startGame(mapId, engine, canvas);
  });
}

main().catch(console.error);
