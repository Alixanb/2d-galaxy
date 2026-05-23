import Galaxy from "../../../systems/Galaxy";
import type RelayStation from "../../../entities/RelayStation";
import type { MFDView } from "../MFDView";
import type { MFDData } from "../../MFD";

type Step = { label: string; check: (g: Galaxy) => boolean; value: (g: Galaxy) => string };

const rv = (r: RelayStation) => ({
  vx: -r.orbitSpeed * r.orbitRadius * Math.sin(r.orbitAngle),
  vy:  r.orbitSpeed * r.orbitRadius * Math.cos(r.orbitAngle),
});

const STEPS: Step[] = [
  {
    label: "Pe ESTABLISHED",
    check: g => (g.ship?.pe?.dist ?? 0) > 0.03,
    value: g => `Pe ${((g.ship?.pe?.dist ?? 0) * 100).toFixed(1)} AU  (need >3.0)`,
  },
  {
    label: "Ap MATCH ORBIT",
    check: g => {
      const s = g.ship, r = g.relayStations[0];
      return !(!s || !r) && Math.abs((s.ap?.dist ?? 0) - r.orbitRadius) / r.orbitRadius < 0.15;
    },
    value: g => {
      const ap = ((g.ship?.ap?.dist ?? 0) * 100).toFixed(1);
      const orb = ((g.relayStations[0]?.orbitRadius ?? 0) * 100).toFixed(1);
      return `Ap ${ap} / orbit ${orb} AU`;
    },
  },
  {
    label: "ENCOUNTER LOCK",
    check: g => (g.ship?.encounterPoint?.dist ?? Infinity) < 0.08,
    value: g => `◆ dist ${((g.ship?.encounterPoint?.dist ?? 999) * 100).toFixed(1)} AU  (<8.0)`,
  },
  {
    label: "REL SPEED LOW",
    check: g => {
      const s = g.ship, r = g.relayStations[0];
      if (!s || !r) return false;
      const v = rv(r);
      return Math.hypot(s.vel.x - v.vx, s.vel.y - v.vy) < 0.005;
    },
    value: g => {
      const s = g.ship, r = g.relayStations[0];
      if (!s || !r) return "—";
      const v = rv(r);
      return `rel ${(Math.hypot(s.vel.x - v.vx, s.vel.y - v.vy) * 1000).toFixed(1)} m/s  (<5.0)`;
    },
  },
  {
    label: "DOCK APPROACH",
    check: g => {
      const s = g.ship, r = g.relayStations[0];
      return !(!s || !r) && (s.dockingMode || Math.hypot(s.pos.x - r.pos.x, s.pos.y - r.pos.y) < 0.05);
    },
    value: g => {
      const s = g.ship, r = g.relayStations[0];
      if (!s || !r) return "—";
      return `range ${(Math.hypot(s.pos.x - r.pos.x, s.pos.y - r.pos.y) * 100).toFixed(1)} AU  dock ${s.dockingMode ? "ON" : "OFF"}`;
    },
  },
];

export class GuideView implements MFDView {
  private galaxy: Galaxy;
  private container!: HTMLElement;
  private rows!: HTMLElement[];
  private statusLine!: HTMLElement;

  constructor(galaxy: Galaxy) { this.galaxy = galaxy; }

  mount(container: HTMLElement): void {
    this.container = document.createElement("div");
    this.container.className = "mfd-view mfd-view-guide";
    this.container.style.cssText = "padding:8px 10px;gap:4px;";

    const title = document.createElement("div");
    title.className = "mfd-header";
    title.style.padding = "0 0 4px";
    title.textContent = "APPROACH";
    this.container.appendChild(title);

    this.rows = STEPS.map(s => {
      const el = document.createElement("div");
      el.style.cssText = "font-family:'Courier New',monospace;font-size:9px;letter-spacing:.06em;padding:3px 0;white-space:nowrap;";
      el.textContent = s.label;
      this.container.appendChild(el);
      return el;
    });

    this.statusLine = document.createElement("div");
    this.statusLine.style.cssText = "font-family:'Courier New',monospace;font-size:8px;color:#50b6c9;margin-top:6px;letter-spacing:.04em;white-space:nowrap;overflow:hidden;";
    this.container.appendChild(this.statusLine);

    container.appendChild(this.container);
  }

  update(_data: MFDData): void {
    const g = this.galaxy;
    let active = -1;
    for (let i = 0; i < STEPS.length; i++) {
      const done = STEPS[i].check(g);
      if (!done && active === -1) active = i;
      const pfx = done ? "✓" : i === active ? "►" : " ";
      this.rows[i].textContent = `${pfx} ${STEPS[i].label}`;
      this.rows[i].style.color = done ? "rgba(61,255,122,0.35)" : i === active ? "#3dff7a" : "rgba(61,255,122,0.25)";
      this.rows[i].style.textDecoration = done ? "line-through" : "none";
    }
    this.statusLine.textContent = active >= 0 ? STEPS[active].value(g) : "SEQUENCE COMPLETE";
  }

  onOSB(_index: number): void {}
  getLabels(): string[] { return ["HOME", "GUIDE*", "—", "TEL", "FUEL", "RADAR"]; }
}
