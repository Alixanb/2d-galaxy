import Galaxy from "../../../systems/Galaxy";
import type { MFDView } from "../MFDView";
import type { MFDData } from "../../MFD";
import type RelayStation from "../../../entities/RelayStation";

const bar = (v: number): string => {
  const w = 9, p = Math.round(Math.max(-1, Math.min(1, v)) * w / 2 + w / 2);
  return '[' + Array.from({ length: w + 1 }, (_, i) => i === p ? '●' : '═').join('') + ']';
};

const relV = (r: RelayStation) => ({
  x: -r.orbitSpeed * r.orbitRadius * Math.sin(r.orbitAngle),
  y:  r.orbitSpeed * r.orbitRadius * Math.cos(r.orbitAngle),
});

export class ApproachView implements MFDView {
  private g: Galaxy;
  private container!: HTMLElement;
  private vals!: HTMLElement[];

  constructor(g: Galaxy) { this.g = g; }

  mount(container: HTMLElement): void {
    this.container = document.createElement("div");
    this.container.className = "mfd-view";
    this.container.style.cssText = "flex-direction:column;padding:8px 10px;gap:3px;font-family:'Courier New',monospace;font-size:9px;letter-spacing:.05em;";

    const hdr = document.createElement("div");
    hdr.className = "mfd-header";
    hdr.style.padding = "0 0 6px";
    hdr.textContent = "APPROACH";
    this.container.appendChild(hdr);

    this.vals = ["REL SPD", "RANGE", "CLOSING", "FWD / AFT", "L / R", "DOCK MODE"].map(lbl => {
      const d = document.createElement("div");
      d.style.cssText = "display:flex;justify-content:space-between;padding:2px 0;";
      const lblEl = document.createElement("span");
      lblEl.style.color = "rgba(61,255,122,0.5)";
      lblEl.textContent = lbl;
      const valEl = document.createElement("span");
      valEl.style.color = "#3dff7a";
      d.appendChild(lblEl);
      d.appendChild(valEl);
      this.container.appendChild(d);
      return valEl;
    });

    container.appendChild(this.container);
  }

  update(_d: MFDData): void {
    const ship = this.g.ship;
    const r = this.g.relayStations[0];
    if (!ship || !r) return;

    const rv = relV(r);
    const rrx = ship.vel.x - rv.x, rry = ship.vel.y - rv.y;
    const relSpd = Math.hypot(rrx, rry);
    const dx = r.pos.x - ship.pos.x, dy = r.pos.y - ship.pos.y;
    const range = Math.hypot(dx, dy);
    const closing = range > 0 ? -(rrx * dx / range + rry * dy / range) : 0;

    this.vals[0].textContent = `${(relSpd * 1000).toFixed(2)} m/s`;
    this.vals[1].textContent = `${(range * 100).toFixed(2)} AU`;
    this.vals[2].textContent = `${closing >= 0 ? "+" : ""}${(closing * 1000).toFixed(2)} m/s`;
    this.vals[3].textContent = bar(ship.rcsForward);
    this.vals[4].textContent = bar(ship.rcsSideways);
    this.vals[5].textContent = ship.dockingMode ? "ON" : "OFF";
  }

  onOSB(_i: number): void {}
  getLabels(): string[] { return ["HOME", "GUIDE", "—", "TEL", "FUEL", "RADAR"]; }
}
