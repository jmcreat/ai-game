import { MAP_LIST, type MapInfo } from "./types";

export class MapSelector {
  private overlay: HTMLDivElement;
  private onSelect: (mapId: string) => void;

  constructor(onSelect: (mapId: string) => void) {
    this.onSelect = onSelect;
    this.overlay = document.createElement("div");
    this.overlay.id = "map-selector";
    this.overlay.innerHTML = this.buildHTML();
    document.body.appendChild(this.overlay);
    this.bindEvents();
  }

  private buildHTML(): string {
    const cards = MAP_LIST.map((map) => this.buildCard(map)).join("");
    return `
      <div class="ms-backdrop"></div>
      <div class="ms-container">
        <div class="ms-header">
          <h1 class="ms-title">Walk Free</h1>
          <p class="ms-subtitle">탐험할 세계를 선택하세요</p>
        </div>
        <div class="ms-cards">${cards}</div>
        <p class="ms-hint">WASD로 이동 · 마우스로 시야 · Space로 점프</p>
      </div>
    `;
  }

  private buildCard(map: MapInfo): string {
    const locked = !map.available;
    return `
      <div class="ms-card ${locked ? "locked" : "available"}"
           data-map-id="${map.id}"
           style="background: ${map.bgColor}">
        <div class="ms-card-emoji">${map.emoji}</div>
        <div class="ms-card-name">${map.name}</div>
        <div class="ms-card-desc">${map.description}</div>
        ${locked ? '<div class="ms-lock">🔒 준비 중</div>' : '<div class="ms-play">▶ 입장</div>'}
      </div>
    `;
  }

  private bindEvents(): void {
    this.overlay.querySelectorAll(".ms-card.available").forEach((card) => {
      card.addEventListener("click", () => {
        const id = (card as HTMLElement).dataset.mapId;
        if (id) {
          this.hide();
          this.onSelect(id);
        }
      });
    });
  }

  hide(): void {
    this.overlay.style.opacity = "0";
    this.overlay.style.transition = "opacity 0.5s ease";
    setTimeout(() => {
      this.overlay.remove();
    }, 500);
  }
}
