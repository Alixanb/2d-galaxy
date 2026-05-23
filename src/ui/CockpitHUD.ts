import Galaxy from "../systems/Galaxy";
import MFD, { type MFDData } from "./MFD";
import { SimParamsPanel } from "./cockpit/SimParamsPanel";
import { PredictionPanel } from "./cockpit/PredictionPanel";
import { FlightControlsPanel } from "./cockpit/FlightControlsPanel";
import { HeadingPanel } from "./cockpit/HeadingPanel";
import { StatusPanel } from "./cockpit/StatusPanel";

export default class CockpitHUD {
  private mfd1: MFD;
  private mfd2: MFD;
  private simParams: SimParamsPanel;
  private prediction: PredictionPanel;
  private flightCtrl: FlightControlsPanel;
  private heading: HeadingPanel;
  private status: StatusPanel;

  constructor(
    galaxy: Galaxy,
    getSimSpeed: () => number = () => 1,
    setSimSpeed: (v: number) => void = () => {},
    onPause: (paused: boolean) => void = () => {},
    onOpenMap: () => void = () => {}
  ) {
    const panel = document.createElement("div");
    panel.className = "cockpit-panel";

    this.mfd1 = new MFD(galaxy);
    this.mfd2 = new MFD(galaxy);
    this.simParams = new SimParamsPanel(getSimSpeed, setSimSpeed);
    this.prediction = new PredictionPanel(galaxy);
    this.flightCtrl = new FlightControlsPanel(galaxy, onPause);
    this.heading = new HeadingPanel(galaxy);
    this.status = new StatusPanel();

    panel.appendChild(this.mfd1.getRoot());
    panel.appendChild(this.mfd2.getRoot());
    panel.appendChild(this.simParams.getRoot());
    panel.appendChild(this.prediction.getRoot());
    panel.appendChild(this.flightCtrl.getRoot());

    const lastCol = document.createElement("div");
    lastCol.style.cssText = "display:flex;flex-direction:column;overflow:hidden;border-left:1px solid var(--border)";
    lastCol.appendChild(this.heading.getRoot());
    lastCol.appendChild(this.status.getRoot());
    panel.appendChild(lastCol);

    this.buildHelpButton(onOpenMap);
    document.body.appendChild(panel);
  }

  private buildHelpButton(onOpenMap: () => void) {
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

    const helpBtn = document.createElement("button");
    helpBtn.className = "floating-btn help-btn";
    helpBtn.textContent = "?";
    helpBtn.title = "Open Manual";
    helpBtn.addEventListener("click", () => {
      window.open("/docs.html", "_blank");
    });

    btnContainer.appendChild(homeBtn);
    btnContainer.appendChild(mapBtn);
    btnContainer.appendChild(helpBtn);
    document.body.appendChild(btnContainer);
  }

  update(data: MFDData): void {
    this.mfd1.update(data);
    this.mfd2.update(data);
    this.flightCtrl.update();
    this.heading.update();
  }

  setPaused(paused: boolean): void {
    this.flightCtrl.setPaused(paused);
  }

  updateStatusGauges(vx: number, vy: number, liquidErgol: number, maxLE: number, monergol: number, maxM: number, decaySeconds: number | null = null, decayMax: number | null = null): void {
    this.status.update(vx, vy, liquidErgol, maxLE, monergol, maxM, decaySeconds, decayMax);
  }
}
