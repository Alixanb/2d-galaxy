import type { MFDData } from "../../MFD";
import type { MFDView } from "../MFDView";

export class HomeView implements MFDView {
  private container!: HTMLElement;
  private setViewCb: (view: any) => void;

  constructor(setViewCb: (view: any) => void) {
    this.setViewCb = setViewCb;
  }

  mount(container: HTMLElement): void {
    this.container = document.createElement("div");
    this.container.className = "mfd-view mfd-view-home";
    
    const rowTop = document.createElement("div");
    rowTop.className = "mfd-home-row";
    const rowBot = document.createElement("div");
    rowBot.className = "mfd-home-row";

    const items: [string, any][] = [
      ["VELOCITY", "vel"], ["ATTITUDE", "att"],   // top
      ["TELEMETRY", "tel"], ["ERGOL SYS", "fuel"], ["RADAR NAV", "radar"], // bottom
    ];

    items.forEach(([label, targetView], i) => {
      const item = document.createElement("div");
      item.className = "mfd-home-item";
      item.addEventListener("click", () => this.setViewCb(targetView));
      item.textContent = label;
      if (i < 2) rowTop.appendChild(item);
      else rowBot.appendChild(item);
    });

    this.container.appendChild(rowTop);
    this.container.appendChild(rowBot);
    container.appendChild(this.container);
  }

  update(_data: MFDData): void {}

  onOSB(_index: number): void {}

  getLabels(): string[] {
    return ["HOME", "VEL", "ATT", "TEL", "FUEL", "RADAR"];
  }
}
