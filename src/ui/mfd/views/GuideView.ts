import Galaxy from "../../../systems/Galaxy";
import type RelayStation from "../../../entities/RelayStation";
import type { MFDView } from "../MFDView";
import type { MFDData } from "../../MFD";

type Step = { label: string; check: (g: Galaxy) => boolean; value: (g: Galaxy) => string };

const rv = (r: RelayStation) => ({
  vx: -r.orbitSpeed * r.orbitRadius * Math.sin(r.orbitAngle),
  vy:  r.orbitSpeed * r.orbitRadius * Math.cos(r.orbitAngle),
});

const na = (a: number) => ((a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;

const APPROACH_STEPS: Step[] = [
  {
    label: "Pe ESTABLISHED",
    check: g => (g.ship?.pe?.dist ?? 0) > 0.03,
    value: g => `Pe ${((g.ship?.pe?.dist ?? 0) * 100).toFixed(1)} AU  (>3.0)`,
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
      return `rel ${(Math.hypot(s.vel.x - v.vx, s.vel.y - v.vy) * 1000).toFixed(1)} m/s  (<5)`;
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

const ESCAPE_STEPS: Step[] = [
  {
    label: "ALIGN PROGRADE",
    check: g => {
      const s = g.ship;
      if (!s || s.vel.length() < 0.0001) return false;
      return Math.abs(na(s.angle - Math.atan2(s.vel.x, -s.vel.y))) < Math.PI / 18;
    },
    value: g => {
      const s = g.ship;
      if (!s) return "—";
      const err = na(s.angle - Math.atan2(s.vel.x, -s.vel.y)) * 180 / Math.PI;
      return `hdg err ${err.toFixed(1)}°  (<10°)`;
    },
  },
  {
    label: "ESCAPE BURN",
    check: g => g.ship?.escapeTrajectory ?? false,
    value: g => `traj: ${(g.ship?.escapeTrajectory ?? false) ? "ESCAPE ✓" : "BOUND"}`,
  },
  {
    label: "CUT ENGINES",
    check: g => (g.ship?.escapeTrajectory ?? false) && g.ship?.status !== "thrusting",
    value: g => `engines: ${g.ship?.status === "thrusting" ? "ACTIVE" : "CUT ✓"}`,
  },
  {
    label: "COAST BOUNDARY",
    check: g => {
      const s = g.ship;
      return !!s && (s.escapeTrajectory ?? false) && s.status !== "thrusting" && Math.hypot(s.pos.x, s.pos.y) > g.size * 0.75;
    },
    value: g => {
      const s = g.ship;
      if (!s) return "—";
      return `dist ${(Math.hypot(s.pos.x, s.pos.y) / g.size * 100).toFixed(0)}% of boundary`;
    },
  },
];

export class GuideView implements MFDView {
  private galaxy: Galaxy;
  private container!: HTMLElement;
  private title!: HTMLElement;
  private rows!: HTMLElement[];
  private statusLine!: HTMLElement;
  tab: "approach" | "escape" = "escape";
  private manualTab = false;

  constructor(galaxy: Galaxy) { this.galaxy = galaxy; }

  mount(container: HTMLElement): void {
    this.container = document.createElement("div");
    this.container.className = "mfd-view mfd-view-guide";
    this.container.style.cssText = "padding:8px 10px;gap:4px;";

    this.title = document.createElement("div");
    this.title.className = "mfd-header";
    this.title.style.padding = "0 0 4px";
    this.container.appendChild(this.title);

    this.rows = Array.from({ length: 5 }, () => {
      const el = document.createElement("div");
      el.style.cssText = "font-family:'Courier New',monospace;font-size:9px;letter-spacing:.06em;padding:3px 0;white-space:nowrap;";
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
    const encDist = g.ship?.encounterPoint?.dist ?? Infinity;
    if (!this.manualTab) this.tab = encDist < 0.15 ? "approach" : "escape";

    const steps = this.tab === "approach" ? APPROACH_STEPS : ESCAPE_STEPS;
    this.title.textContent = this.tab === "approach" ? "APPROACH" : "ESCAPE";

    let active = -1;
    for (let i = 0; i < 5; i++) {
      if (i >= steps.length) { this.rows[i].textContent = ""; continue; }
      const done = steps[i].check(g);
      if (!done && active === -1) active = i;
      this.rows[i].textContent = `${done ? "✓" : i === active ? "►" : " "} ${steps[i].label}`;
      this.rows[i].style.color = done ? "rgba(61,255,122,0.35)" : i === active ? "#3dff7a" : "rgba(61,255,122,0.25)";
      this.rows[i].style.textDecoration = done ? "line-through" : "none";
    }
    this.statusLine.textContent = active >= 0 ? steps[active].value(g) : "SEQUENCE COMPLETE";
  }

  onOSB(index: number): void {
    if (index === 2) { this.tab = "approach"; this.manualTab = true; }
    if (index === 3) { this.tab = "escape";   this.manualTab = true; }
  }

  getLabels(): string[] {
    const a = this.tab === "approach" ? "APPR*" : "APPR";
    const e = this.tab === "escape"   ? "ESC*"  : "ESC";
    return ["HOME", a, e, "TEL", "FUEL", "RADAR"];
  }
}
