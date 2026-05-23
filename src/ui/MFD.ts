import Galaxy from "../systems/Galaxy";
import type { MFDView } from "./mfd/MFDView";
import { HomeView } from "./mfd/views/HomeView";
import { VelocityView } from "./mfd/views/VelocityView";
import { AttitudeView } from "./mfd/views/AttitudeView";
import { TelemetryView } from "./mfd/views/TelemetryView";
import { FuelView } from "./mfd/views/FuelView";
import { RadarView } from "./mfd/views/RadarView";
import { GuideView } from "./mfd/views/GuideView";
import { ApproachView } from "./mfd/views/ApproachView";

export interface MFDData {
  vx: number;
  vy: number;
  dist: number;
  angularVel: number;
  starCount: number;
  totalStars: number;
  fps: number;
  liquidErgol: number;
  maxLiquidErgol: number;
  monergol: number;
  maxMonergol: number;
  isThrusting: boolean;
}

export type MFDViewKey = "home" | "vel" | "att" | "tel" | "fuel" | "radar" | "guide" | "approach";

export default class MFD {
  private root: HTMLElement;
  private screen: HTMLElement;
  private osbs!: [HTMLButtonElement, HTMLButtonElement, HTMLButtonElement,
                  HTMLButtonElement, HTMLButtonElement, HTMLButtonElement];
  private lbls!: [HTMLElement, HTMLElement, HTMLElement,
                  HTMLElement, HTMLElement, HTMLElement];

  private currentViewKey: MFDViewKey = "home";
  private views: Record<MFDViewKey, MFDView>;

  constructor(galaxy: Galaxy) {
    this.views = {
      home:  new HomeView((key) => this.setView(key)),
      vel:   new VelocityView(),
      att:   new AttitudeView(galaxy),
      tel:   new TelemetryView(),
      fuel:  new FuelView(),
      radar: new RadarView(galaxy),
      guide:    new GuideView(galaxy),
      approach: new ApproachView(galaxy),
    };

    this.root = document.createElement("div");
    this.root.className = "mfd";

    const topStrip = document.createElement("div");
    topStrip.className = "mfd-btns-top";
    const topLabels = document.createElement("div");
    topLabels.className = "mfd-labels-top";

    this.screen = document.createElement("div");
    this.screen.className = "mfd-screen";

    const bottomLabels = document.createElement("div");
    bottomLabels.className = "mfd-labels-bottom";
    const bottomStrip = document.createElement("div");
    bottomStrip.className = "mfd-btns-bottom";

    const osb1 = this.makeOSB(() => this.setView("home"));
    const osb2 = this.makeOSB(() => {
      if (this.currentViewKey === "guide") { this.views.guide.onOSB(2); this.updateOSBs(); }
      else this.setView("guide");
    });
    const osb3 = this.makeOSB(() => this.onOSB(3));
    const osb4 = this.makeOSB(() => this.onOSB(4));
    const osb5 = this.makeOSB(() => this.onOSB(5));
    const osb6 = this.makeOSB(() => this.onOSB(6));
    this.osbs = [osb1, osb2, osb3, osb4, osb5, osb6];

    topStrip.appendChild(osb1);
    topStrip.appendChild(osb2);
    topStrip.appendChild(osb3);
    bottomStrip.appendChild(osb4);
    bottomStrip.appendChild(osb5);
    bottomStrip.appendChild(osb6);

    const lbls: HTMLElement[] = [];
    for (let i = 0; i < 6; i++) {
      const l = document.createElement("span");
      l.className = "mfd-lbl";
      if (i < 3) topLabels.appendChild(l);
      else bottomLabels.appendChild(l);
      lbls.push(l);
    }
    this.lbls = lbls as typeof this.lbls;

    this.root.appendChild(topStrip);
    this.root.appendChild(topLabels);
    this.root.appendChild(this.screen);
    this.root.appendChild(bottomLabels);
    this.root.appendChild(bottomStrip);

    // Initialize all views
    for (const key in this.views) {
      this.views[key as MFDViewKey].mount(this.screen);
    }

    this.setView("home");
  }

  getRoot(): HTMLElement {
    return this.root;
  }

  update(data: MFDData): void {
    this.views[this.currentViewKey].update(data);
  }

  private setView(key: MFDViewKey): void {
    this.currentViewKey = key;
    for (const child of Array.from(this.screen.children) as HTMLElement[]) {
      child.style.display = "none";
    }
    
    // Each view component handles its own display state internally or we do it here
    const keys = Object.keys(this.views);
    const viewContainer = this.screen.children[keys.indexOf(key)] as HTMLElement;
    if (viewContainer) viewContainer.style.display = "flex";
    
    this.updateOSBs();
  }

  private onOSB(n: number): void {
    if (n === 3 && this.currentViewKey === "home") { this.setView("approach"); return; }
    if (n === 4) { this.setView("tel");   return; }
    if (n === 5) { this.setView("fuel");  return; }
    if (n === 6) { this.setView("radar"); return; }

    this.views[this.currentViewKey].onOSB(n);
    this.updateOSBs();
  }

  private makeOSB(onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "mfd-osb";
    btn.addEventListener("click", onClick);
    return btn;
  }

  private updateOSBs(): void {
    const labels = this.views[this.currentViewKey].getLabels();
    
    for (let i = 0; i < 6; i++) {
      const osb = this.osbs[i];
      const lbl = this.lbls[i];
      const text = labels[i] || "";
      
      osb.className = "mfd-osb";
      lbl.className = "mfd-lbl";
      
      if (text.endsWith("*")) {
        lbl.textContent = text.slice(0, -1);
        osb.classList.add("modifier-on");
        lbl.classList.add("modifier-on");
      } else if (text === "—") {
        lbl.textContent = "—";
        osb.classList.add("unused");
        lbl.classList.add("unused");
      } else {
        lbl.textContent = text;
      }

      // Special handling for active view highlighting
      if (i === 0 && this.currentViewKey === "home") {
        osb.classList.add("active");
        lbl.classList.add("active");
      }
      if (i === 1) {
        const inGuide = this.currentViewKey === "guide";
        const guideTab = (this.views.guide as import("./mfd/views/GuideView").GuideView).tab;
        osb.className = "mfd-osb";
        lbl.className = "mfd-lbl";
        if (inGuide) {
          lbl.textContent = "APPR";
          if (guideTab === "approach") { osb.classList.add("modifier-on"); lbl.classList.add("modifier-on"); }
        } else {
          lbl.textContent = "GUIDE";
        }
      }
      if (i === 2 && this.currentViewKey === "guide") {
        const guideTab = (this.views.guide as import("./mfd/views/GuideView").GuideView).tab;
        osb.className = "mfd-osb";
        lbl.className = "mfd-lbl";
        lbl.textContent = "ESC";
        if (guideTab === "escape") { osb.classList.add("modifier-on"); lbl.classList.add("modifier-on"); }
      }
      if (i === 2 && this.currentViewKey === "home") {
        osb.className = "mfd-osb"; lbl.className = "mfd-lbl"; lbl.textContent = "APCH";
      }
      if (i === 2 && this.currentViewKey === "approach") {
        osb.className = "mfd-osb"; lbl.className = "mfd-lbl"; lbl.textContent = "APCH";
        osb.classList.add("active"); lbl.classList.add("active");
      }
      if (i === 3 && this.currentViewKey === "tel") {
        osb.classList.add("active");
        lbl.classList.add("active");
      }
      if (i === 4 && this.currentViewKey === "fuel") {
        osb.classList.add("active");
        lbl.classList.add("active");
      }
      if (i === 5 && this.currentViewKey === "radar") {
        osb.classList.add("active");
        lbl.classList.add("active");
      }
    }
  }
}
