import Ship from "../entities/Ship";
import Galaxy from "../systems/Galaxy";
import MFD, { type MFDData } from "./MFD";
import { buildDocPanel } from "./DocPanel";

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

  private leCanvas!: HTMLCanvasElement;
  private moCanvas!: HTMLCanvasElement;
  private spCanvas!: HTMLCanvasElement;

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
    panel.appendChild(this.buildStatusSection());
    this.buildHelpButton();

    document.body.appendChild(panel);
  }

  private buildHelpButton() {
    const docPanel = buildDocPanel();
    const btn = document.createElement("button");
    btn.className = "help-btn";
    btn.textContent = "?";
    btn.addEventListener("click", () => {
      const isVisible = docPanel.style.display === "block";
      docPanel.style.display = isVisible ? "none" : "block";
    });
    document.body.appendChild(btn);
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

    section.appendChild(this.makeFader("THRUSTER (Z/S)", 20, 0, 100, 5, "cyan",
      (v) => { Ship.THRUSTPOWER = thrustDefault * (v / 20); }, 
      (v) => `${v}%`,
      () => Math.round((Ship.THRUSTPOWER / thrustDefault) * 20)));
      
    section.appendChild(this.makeFader("RCS (Q/E)", 20, 0, 100, 5, "cyan",
      (v) => { Ship.RADIALPOWER = rotDefault * (v / 20); }, 
      (v) => `${v}%`,
      () => Math.round((Ship.RADIALPOWER / rotDefault) * 20)));

    return section;
  }

  private makeFader(
    label: string, defaultValue: number, min: number, max: number, step: number,
    accent: string, onChange: (v: number) => void, format: (v: number) => string,
    getValue?: () => number
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
    
    let isDragging = false;
    
    slider.addEventListener("mousedown", () => { isDragging = true; });
    slider.addEventListener("mouseup", () => { isDragging = false; });
    
    slider.addEventListener("input", () => {
      const v = parseFloat(slider.value);
      val.textContent = format(v);
      onChange(v);
    });
    slider.addEventListener("change", () => slider.blur());

    if (getValue) {
      setInterval(() => {
        if (isDragging) return;
        const currentV = getValue();
        if (parseFloat(slider.value) !== currentV) {
          slider.value = String(currentV);
          val.textContent = format(currentV);
        }
      }, 100);
    }

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

  // ─── Status ───────────────────────────────────────────────────────────────

  private buildStatusSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "status-section";

    section.appendChild(Object.assign(document.createElement("div"), {
      className: "cockpit-section-label",
      textContent: "SHIP STATUS",
    }));

    const wrap = document.createElement("div");
    wrap.className = "status-gauges";

    this.spCanvas = this.makeGaugeCanvas(80);
    this.leCanvas = this.makeGaugeCanvas(80);
    this.moCanvas = this.makeGaugeCanvas(80);
    wrap.appendChild(this.spCanvas);
    wrap.appendChild(this.leCanvas);
    wrap.appendChild(this.moCanvas);
    section.appendChild(wrap);

    return section;
  }

  private makeGaugeCanvas(cssSize: number): HTMLCanvasElement {
    const dpr = window.devicePixelRatio;
    const canvas = document.createElement("canvas");
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;
    return canvas;
  }

  private drawGauge(
    canvas: HTMLCanvasElement,
    pct: number,
    color: string,
    label: string,
    value: string,
    critical: boolean
  ): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2 + 5 * dpr;
    const r = w * 0.35;
    const trackW = 4 * dpr;

    // Arc from 225° (7:30) clockwise 270° to 315° (4:30), gap at bottom
    const START = (5 * Math.PI) / 4;
    const SWEEP = (3 * Math.PI) / 2;

    ctx.clearRect(0, 0, w, h);

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, r, START, START + SWEEP);
    ctx.strokeStyle = "rgba(236, 223, 205, 0.09)";
    ctx.lineWidth = trackW;
    ctx.lineCap = "butt";
    ctx.stroke();

    // Tick marks at 0%, 25%, 50%, 75%, 100%
    for (let i = 0; i <= 4; i++) {
      const a = START + (i / 4) * SWEEP;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - trackW * 1.6), cy + Math.sin(a) * (r - trackW * 1.6));
      ctx.lineTo(cx + Math.cos(a) * (r + trackW * 0.6), cy + Math.sin(a) * (r + trackW * 0.6));
      ctx.strokeStyle = "rgba(236, 223, 205, 0.18)";
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();
    }

    // Fill arc
    const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 220);
    const fillColor = critical ? `rgba(236, 38, 38, ${pulse})` : color;

    if (pct > 0.004) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, START, START + SWEEP * pct);
      ctx.strokeStyle = fillColor;
      ctx.lineWidth = trackW;
      ctx.lineCap = "round";
      ctx.stroke();

      // Bright tip dot
      const tipA = START + SWEEP * pct;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(tipA) * r, cy + Math.sin(tipA) * r, trackW * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
    }

    // Center value
    const textPulse = critical ? pulse : 1;
    ctx.fillStyle = critical
      ? `rgba(236, 38, 38, ${0.6 + 0.4 * pulse})`
      : "rgba(236, 223, 205, 0.92)";
    ctx.globalAlpha = textPulse;
    ctx.font = `bold ${11 * dpr}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pct < 0.005 ? "!!!" : value, cx, cy - 4 * dpr);
    ctx.globalAlpha = 1;

    // Label below
    ctx.fillStyle = "rgba(236, 223, 205, 0.32)";
    ctx.font = `${7 * dpr}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cx, cy + r * 0.6);
  }

  updateStatusGauges(vx: number, vy: number, liquidErgol: number, maxLE: number, monergol: number, maxM: number): void {
    const lePct = maxLE > 0 ? Math.max(0, liquidErgol / maxLE) : 0;
    const moPct = maxM  > 0 ? Math.max(0, monergol   / maxM)  : 0;

    const speed = Math.hypot(vx, vy) * 10000;
    const speedPct = Math.min(1, speed / 500); // 500 m/s as max for gauge
    this.drawGauge(
      this.spCanvas,
      speedPct,
      "rgba(233, 214, 40, 0.9)",
      "SPEED",
      speed.toFixed(1),
      false
    );

    this.drawGauge(
      this.leCanvas,
      lePct,
      "rgba(80, 182, 201, 0.9)",
      "L-ERGOL",
      Math.ceil(liquidErgol).toString(),
      lePct < 0.2
    );

    this.drawGauge(
      this.moCanvas,
      moPct,
      "rgba(176, 111, 216, 0.9)",
      "MONO",
      Math.ceil(monergol).toString(),
      moPct < 0.2
    );
  }
}
