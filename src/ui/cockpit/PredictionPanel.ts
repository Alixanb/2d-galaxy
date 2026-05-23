import Galaxy from "../../systems/Galaxy";
import { makeCockpitLabel } from "./CockpitUtils";

export class PredictionPanel {
  private root: HTMLElement;
  private galaxy: Galaxy;

  constructor(galaxy: Galaxy) {
    this.galaxy = galaxy;
    this.root = document.createElement("div");
    this.root.className = "pred-section";

    this.root.appendChild(makeCockpitLabel("TRAJECTORY"));

    const btn = document.createElement("button");
    btn.className = "pred-btn";
    btn.textContent = "PREDICTION SYS";
    btn.addEventListener("click", () => {
      if (!this.galaxy.ship) return;
      this.galaxy.ship.showPath = !this.galaxy.ship.showPath;
      btn.classList.toggle("pred-active", this.galaxy.ship.showPath);
    });
    this.root.appendChild(btn);
  }

  getRoot(): HTMLElement {
    return this.root;
  }
}
