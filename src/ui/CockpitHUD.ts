import Ship from "../entities/Ship";
import Galaxy from "../systems/Galaxy";
import MFD, { type MFDData } from "./MFD";

const PATH_PRESETS = [
  { label: "100", value: 100 },
  { label: "500", value: 500 },
  { label: "1K",  value: 1000 },
  { label: "5K",  value: 5000 },
];
const DEFAULT_PRED_STEPS = 1000;

export default class CockpitHUD {
  private galaxy: Galaxy;
  private mfd1: MFD;
  private mfd2: MFD;
  private autoStabBtn!: HTMLButtonElement;
  private retroBtn!: HTMLButtonElement;
  private presetBtns: HTMLButtonElement[] = [];

  constructor(galaxy: Galaxy) {
    this.galaxy = galaxy;
    const panel = document.createElement("div");
    panel.className = "cockpit-panel";

    this.mfd1 = new MFD(galaxy);
    this.mfd2 = new MFD(galaxy);

    panel.appendChild(this.mfd1.getRoot());
    panel.appendChild(this.mfd2.getRoot());
    panel.appendChild(this.buildSimParams());
    panel.appendChild(this.buildPredictionSection());
    panel.appendChild(this.buildFlightCtrlSection());

    document.body.appendChild(panel);
  }

  update(data: MFDData): void {
    this.mfd1.update(data);
    this.mfd2.update(data);

    const ship = this.galaxy.ship;
    if (!ship) return;

    if (ship.retrogradePhase === "align") {
      this.retroBtn.classList.add("retro-active", "retro-align");
      this.retroBtn.classList.remove("retro-burn");
      this.retroBtn.textContent = "ALIGNING...";
    } else if (ship.retrogradePhase === "burn") {
      this.retroBtn.classList.add("retro-active", "retro-burn");
      this.retroBtn.classList.remove("retro-align");
      this.retroBtn.textContent = "RETRO BURN";
    } else {
      this.retroBtn.classList.remove("retro-active", "retro-align", "retro-burn");
      this.retroBtn.textContent = "RETRO BURN";
    }
  }

  // ─── Sim Params ───────────────────────────────────────────────────────────

  private buildSimParams(): HTMLElement {
    const section = document.createElement("div");
    section.className = "sim-params";

    section.appendChild(Object.assign(document.createElement("div"), {
      className: "cockpit-section-label",
      textContent: "DRIVE SYS",
    }));

    const thrustDefault = Ship.DEFAULT_THRUSTPOWER;
    const rotDefault = Ship.DEFAULT_RADIALPOWER;

    section.appendChild(this.makeFader("THRUSTER PWR", 20, 0, 100, 5, "cyan",
      (v) => { Ship.THRUSTPOWER = thrustDefault * (v / 20); }, (v) => `${v}%`));
    section.appendChild(this.makeFader("RCS RATE", 20, 0, 100, 5, "cyan",
      (v) => { Ship.RADIALPOWER = rotDefault * (v / 20); }, (v) => `${v}%`));

    return section;
  }

  private makeFader(
    label: string, defaultValue: number, min: number, max: number, step: number,
    accent: string, onChange: (v: number) => void, format: (v: number) => string
  ): HTMLElement {
    const row = document.createElement("div");
    row.className = "cockpit-fader";

    const header = document.createElement("div");
    header.className = "fader-header";
    header.appendChild(Object.assign(document.createElement("span"), { className: "fader-label", textContent: label }));
    const val = Object.assign(document.createElement("span"), { className: `fader-value ${accent}`, textContent: format(defaultValue) });
    header.appendChild(val);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "cockpit-slider";
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(defaultValue);
    slider.addEventListener("input", () => {
      const v = parseFloat(slider.value);
      val.textContent = format(v);
      onChange(v);
    });

    row.appendChild(header);
    row.appendChild(slider);
    return row;
  }

  // ─── Prediction ───────────────────────────────────────────────────────────

  private buildPredictionSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "pred-section";

    section.appendChild(Object.assign(document.createElement("div"), {
      className: "cockpit-section-label",
      textContent: "TRAJECTORY",
    }));

    const btn = document.createElement("button");
    btn.className = "pred-btn";
    btn.textContent = "PREDICTION SYS";
    btn.addEventListener("click", () => {
      if (!this.galaxy.ship) return;
      this.galaxy.ship.showPath = !this.galaxy.ship.showPath;
      btn.classList.toggle("pred-active", this.galaxy.ship.showPath);
    });
    section.appendChild(btn);

    const presets = document.createElement("div");
    presets.className = "pred-presets";

    PATH_PRESETS.forEach(({ label, value }, i) => {
      const pb = document.createElement("button");
      pb.className = "pred-preset";
      pb.textContent = label;
      if (value === DEFAULT_PRED_STEPS) pb.classList.add("pred-preset-active");

      pb.addEventListener("click", () => {
        if (this.galaxy.ship) this.galaxy.ship.predictionInteration = value;
        this.presetBtns.forEach(b => b.classList.remove("pred-preset-active"));
        pb.classList.add("pred-preset-active");
      });

      this.presetBtns[i] = pb;
      presets.appendChild(pb);
    });

    section.appendChild(presets);
    return section;
  }

  // ─── Flight Ctrl ──────────────────────────────────────────────────────────

  private buildFlightCtrlSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "autostab-section";

    section.appendChild(Object.assign(document.createElement("div"), {
      className: "cockpit-section-label",
      textContent: "FLIGHT CTRL",
    }));

    const wrap = document.createElement("div");
    wrap.className = "autostab-wrap";

    this.autoStabBtn = document.createElement("button");
    this.autoStabBtn.className = "autostab-btn";
    this.autoStabBtn.textContent = "AUTO-STAB";
    this.autoStabBtn.addEventListener("click", () => {
      if (!this.galaxy.ship) return;
      const on = !this.galaxy.ship.autoStab;
      this.galaxy.ship.autoStab = on;
      this.autoStabBtn.classList.toggle("autostab-active", on);
      if (on) {
        this.galaxy.ship.retrogradeActive = false;
        this.galaxy.ship.retrogradePhase = null;
        this.retroBtn.classList.remove("retro-active", "retro-align", "retro-burn");
        this.retroBtn.textContent = "RETRO BURN";
      }
    });

    this.retroBtn = document.createElement("button");
    this.retroBtn.className = "retro-btn";
    this.retroBtn.textContent = "RETRO BURN";
    this.retroBtn.addEventListener("click", () => {
      if (!this.galaxy.ship) return;
      const on = !this.galaxy.ship.retrogradeActive;
      this.galaxy.ship.retrogradeActive = on;
      this.galaxy.ship.retrogradePhase = on ? "align" : null;
      if (on) {
        this.galaxy.ship.autoStab = false;
        this.autoStabBtn.classList.remove("autostab-active");
        this.retroBtn.classList.add("retro-active", "retro-align");
        this.retroBtn.classList.remove("retro-burn");
        this.retroBtn.textContent = "ALIGNING...";
      } else {
        this.retroBtn.classList.remove("retro-active", "retro-align", "retro-burn");
        this.retroBtn.textContent = "RETRO BURN";
      }
    });

    wrap.appendChild(this.autoStabBtn);
    wrap.appendChild(this.retroBtn);
    section.appendChild(wrap);
    return section;
  }
}
