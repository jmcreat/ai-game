import type { Scene } from "@babylonjs/core";

export interface IMap {
  id: string;
  name: string;
  description: string;
  available: boolean;
  load(scene: Scene): Promise<void>;
  dispose(): void;
}

export interface MapInfo {
  id: string;
  name: string;
  description: string;
  available: boolean;
  emoji: string;
  bgColor: string;
}

export const MAP_LIST: MapInfo[] = [
  {
    id: "snow",
    name: "설원",
    description: "끝없이 펼쳐진 눈 덮인 들판을 탐험하세요",
    available: true,
    emoji: "❄️",
    bgColor: "linear-gradient(135deg, #e0f0ff 0%, #b8d4f0 100%)",
  },
  {
    id: "forest",
    name: "숲",
    description: "울창한 나무 사이를 자유롭게 걸어보세요",
    available: false,
    emoji: "🌲",
    bgColor: "linear-gradient(135deg, #d4edda 0%, #8fbc8f 100%)",
  },
  {
    id: "desert",
    name: "사막",
    description: "뜨거운 모래 언덕을 넘어 탐험하세요",
    available: false,
    emoji: "🏜️",
    bgColor: "linear-gradient(135deg, #fff3cd 0%, #e4b06a 100%)",
  },
];
