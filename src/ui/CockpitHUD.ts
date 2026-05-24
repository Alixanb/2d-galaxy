import Galaxy from "../systems/Galaxy";
import MFD, { type MFDData } from "./MFD";
import { SimParamsPanel } from "./cockpit/SimParamsPanel";
import { PredictionPanel } from "./cockpit/PredictionPanel";
import { mountFlightControlsPanel, type FlightControlsPanelRef } from "./cockpit/FlightControlsPanel";
import { mountHeadingPanel } from "./cockpit/HeadingPanel";
import { mountStatusPanel, type StatusPanelRef } from "./cockpit/StatusPanel";
import { velSignal, headingSignal } from "../core/gameSignals";
import type { RefObject } from "preact";

export default class CockpitHUD {
  private mfd1: MFD;
  private mfd2: MFD;
  private simParams: SimParamsPanel;
  private prediction: PredictionPanel;
  private flightCtrlRef: RefObject<FlightControlsPanelRef>;
  private statusRef: RefObject<StatusPanelRef>;
  private topBarMeta: HTMLElement;
  private startTime = Date.now();
  private galaxy: Galaxy;

  constructor(
    galaxy: Galaxy,
    getSimSpeed: () => number = () => 1,
    setSimSpeed: (v: number) => void = () => {},
    onPause: (paused: boolean) => void = () => {},
    onOpenMap: () => void = () => {},
    onOpenTech: () => void = () => {}
  ) {
    const topBar = document.createElement("div");
    topBar.className = "top-bar";
    const dot = document.createElement("span");
    dot.className = "top-bar__dot";
    dot.textContent = "●";
    this.topBarMeta = document.createElement("span");
    this.topBarMeta.className = "top-bar__meta";
    topBar.appendChild(dot);
    topBar.appendChild(this.topBarMeta);
    document.body.appendChild(topBar);

    const panel = document.createElement("div");
    panel.className = "cockpit-panel";

    this.galaxy = galaxy;
    this.mfd1 = new MFD(galaxy);
    this.mfd2 = new MFD(galaxy);
    this.simParams = new SimParamsPanel(getSimSpeed, setSimSpeed);
    this.prediction = new PredictionPanel(galaxy);
    panel.appendChild(this.mfd1.getRoot());
    panel.appendChild(this.mfd2.getRoot());
    panel.appendChild(this.simParams.getRoot());
    panel.appendChild(this.prediction.getRoot());
    const flightWrap = document.createElement("div");
    panel.appendChild(flightWrap);
    this.flightCtrlRef = mountFlightControlsPanel(flightWrap, galaxy, onPause);

    const lastCol = document.createElement("div");
    lastCol.style.cssText = "display:flex;flex-direction:column;overflow:hidden;border-left:1px solid var(--border)";
    const headingWrap = document.createElement("div");
    lastCol.appendChild(headingWrap);
    mountHeadingPanel(headingWrap, galaxy);
    const statusWrap = document.createElement("div");
    lastCol.appendChild(statusWrap);
    this.statusRef = mountStatusPanel(statusWrap);
    panel.appendChild(lastCol);

    this.buildHelpButton(onOpenMap, onOpenTech);
    document.body.appendChild(panel);
  }

  private buildHelpButton(onOpenMap: () => void, onOpenTech: () => void) {
    const btnContainer = document.createElement("div");
    btnContainer.className = "floating-btns";

    const homeBtn = document.createElement("button");
    homeBtn.className = "floating-btn home-btn";
    homeBtn.textContent = "H";
    homeBtn.title = "Return Home";
    homeBtn.addEventListener("click", () => {
      window.location.href = "/index.html";
    });

    const mapBtn = document.createElement("button");
    mapBtn.className = "floating-btn";
    mapBtn.textContent = "M";
    mapBtn.title = "Galaxy Map";
    mapBtn.addEventListener("click", onOpenMap);

    const techBtn = document.createElement("button");
    techBtn.className = "floating-btn";
    techBtn.textContent = "T";
    techBtn.title = "Tech Tree";
    techBtn.addEventListener("click", onOpenTech);

    const helpBtn = document.createElement("button");
    helpBtn.className = "floating-btn help-btn";
    helpBtn.textContent = "?";
    helpBtn.title = "Open Manual";
    helpBtn.addEventListener("click", () => {
      window.open("/docs.html", "_blank");
    });

    btnContainer.appendChild(homeBtn);
    btnContainer.appendChild(mapBtn);
    btnContainer.appendChild(techBtn);
    btnContainer.appendChild(helpBtn);
    document.body.appendChild(btnContainer);
  }

  update(data: MFDData): void {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    this.topBarMeta.textContent = `FLIGHT · ${data.systemId}  ·  ${mm}:${ss}  ·  PKT ${data.completedCount}/${data.totalSystems}`;
    this.mfd1.update(data);
    this.mfd2.update(data);
    this.flightCtrlRef.current?.update();
    const ship = this.galaxy.ship;
    if (ship) {
      velSignal.value = { x: ship.vel.x, y: ship.vel.y };
      headingSignal.value = ship.angle;
    }
  }

  setPaused(paused: boolean): void {
    this.flightCtrlRef.current?.setPaused(paused);
  }

  updateStatusGauges(vx: number, vy: number, liquidErgol: number, maxLE: number, monergol: number, maxM: number, decaySeconds: number | null = null, decayMax: number | null = null): void {
    this.statusRef.current?.draw(vx, vy, liquidErgol, maxLE, monergol, maxM, decaySeconds, decayMax);
  }
}
