import Ship from "../../entities/Ship";
import { makeCockpitLabel, makeFader } from "./CockpitUtils";

export class SimParamsPanel {
  private root: HTMLElement;

  constructor(getSimSpeed: () => number, setSimSpeed: (v: number) => void) {
    this.root = document.createElement("div");
    this.root.className = "sim-params";

    this.root.appendChild(makeCockpitLabel("DRIVE SYS"));

    const thrustDefault = Ship.DEFAULT_THRUSTPOWER;
    const rotDefault = Ship.DEFAULT_RADIALPOWER;

    this.root.appendChild(makeFader("THRUSTER (Z/S)", 20, 0, 100, 5, "cyan",
      (v) => { Ship.THRUSTPOWER = thrustDefault * (v / 20); }, 
      (v) => `${v}%`,
      () => Math.round((Ship.THRUSTPOWER / thrustDefault) * 20)));
      
    this.root.appendChild(makeFader("RCS", 20, 0, 100, 5, "cyan",
      (v) => { Ship.RADIALPOWER = rotDefault * (v / 20); },
      (v) => `${v}%`,
      () => Math.round((Ship.RADIALPOWER / rotDefault) * 20)));

    this.root.appendChild(makeFader("SIM SPEED", 10, 1, 100, 1, "yellow",
      (v) => { setSimSpeed(v / 10); },
      (v) => `${(v / 10).toFixed(1)}×`,
      () => Math.round(getSimSpeed() * 10)));
  }

  getRoot(): HTMLElement {
    return this.root;
  }
}
