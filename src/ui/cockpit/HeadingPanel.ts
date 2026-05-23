import Galaxy from "../../systems/Galaxy";
import { makeCockpitLabel } from "./CockpitUtils";

export class HeadingPanel {
  private root: HTMLElement;
  private galaxy: Galaxy;
  private headingRows: { el: HTMLElement; delta: HTMLSpanElement }[] = [];

  constructor(galaxy: Galaxy) {
    this.galaxy = galaxy;
    this.root = document.createElement("div");
    this.root.className = "heading-section";

    this.root.appendChild(makeCockpitLabel("HEADING REF"));

    const defs = [
      { label: "PRO", color: "#3dff7a" },
      { label: "RET", color: "#3dff7a" },
      { label: "RDL", color: "#e9d628" },
      { label: "ANT", color: "#e9d628" },
    ];

    const rows = document.createElement("div");
    rows.className = "heading-rows";

    for (const def of defs) {
      const row = document.createElement("div");
      row.className = "heading-row";

      const glyph = Object.assign(document.createElement("span"), { textContent: "⊙" });
      glyph.style.color = def.color;

      const label = Object.assign(document.createElement("span"), {
        className: "heading-label",
        textContent: def.label,
      });

      const delta = Object.assign(document.createElement("span"), {
        className: "heading-delta",
        textContent: "---",
      });

      row.appendChild(glyph);
      row.appendChild(label);
      row.appendChild(delta);
      rows.appendChild(row);
      this.headingRows.push({ el: row, delta });
    }

    this.root.appendChild(rows);
  }

  getRoot(): HTMLElement {
    return this.root;
  }

  update(): void {
    const ship = this.galaxy.ship;
    if (!ship) return;

    const bh = this.galaxy.blackholes[0];
    if (ship.vel.length() > 0.0001) {
      const pro = Math.atan2(ship.vel.x, -ship.vel.y);
      const dx = bh ? bh.pos.x - ship.pos.x : 0;
      const dy = bh ? bh.pos.y - ship.pos.y : 0;
      const rdl = bh ? Math.atan2(dx, -dy) : pro;
      const angles = [pro, pro + Math.PI, rdl, rdl + Math.PI];
      for (let i = 0; i < 4; i++) {
        let diff = angles[i] - ship.angle;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        const aligned = Math.abs(diff) < 0.26;
        const deg = Math.round((diff * 180) / Math.PI);
        this.headingRows[i].delta.textContent = aligned ? "ALIGNED" : `${deg > 0 ? "+" : ""}${deg}°`;
        this.headingRows[i].el.classList.toggle("heading-aligned", aligned);
      }
    } else {
      for (const row of this.headingRows) {
        row.delta.textContent = "---";
        row.el.classList.remove("heading-aligned");
      }
    }
  }
}
