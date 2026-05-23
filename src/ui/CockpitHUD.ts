import Ship from "../entities/Ship";
import Galaxy from "../systems/Galaxy";
import type { HeadingLockMode } from "../core/GameState";
import MFD, { type MFDData } from "./MFD";

export default class CockpitHUD {
  private galaxy: Galaxy;
  private mfd1: MFD;
  private mfd2: MFD;
  private autoStabBtn!: HTMLButtonElement;
  private retroBtn!: HTMLButtonElement;
  private getSpeedCb: () => number;
  private setSpeedCb: (v: number) => void;
  private onPauseCb: (p: boolean) => void;

  private leCanvas!: HTMLCanvasElement;
  private moCanvas!: HTMLCanvasElement;
  private spCanvas!: HTMLCanvasElement;
  private decayWrap!: HTMLElement;
  private decayFill!: HTMLElement;
  private decayTime!: HTMLSpanElement;
  private headingRows: { el: HTMLElement; delta: HTMLSpanElement }[] = [];
  private hlkBtns: { el: HTMLButtonElement; mode: HeadingLockMode; minTier: number }[] = [];
  private pauseBtn!: HTMLButtonElement;
  private isPaused = false;

  constructor(
    galaxy: Galaxy,
    getSimSpeed: () => number = () => 1,
    setSimSpeed: (v: number) => void = () => {},
    onPause: (paused: boolean) => void = () => {}
  ) {
    this.galaxy = galaxy;
    this.getSpeedCb = getSimSpeed;
    this.setSpeedCb = setSimSpeed;
    this.onPauseCb = onPause;
    const panel = document.createElement("div");
    panel.className = "cockpit-panel";

    this.mfd1 = new MFD(galaxy);
    this.mfd2 = new MFD(galaxy);

    panel.appendChild(this.mfd1.getRoot());
    panel.appendChild(this.mfd2.getRoot());
    panel.appendChild(this.buildSimParams());
    panel.appendChild(this.buildPredictionSection());
    panel.appendChild(this.buildFlightCtrlSection());
    const lastCol = document.createElement("div");
    lastCol.style.cssText = "display:flex;flex-direction:column;overflow:hidden;border-left:1px solid var(--border)";
    lastCol.appendChild(this.buildHeadingSection());
    lastCol.appendChild(this.buildStatusSection());
    panel.appendChild(lastCol);
    this.buildHelpButton();

    document.body.appendChild(panel);
  }

  private buildHelpButton() {
    const btnContainer = document.createElement("div");
    btnContainer.className = "floating-btns";

    const homeBtn = document.createElement("button");
    homeBtn.className = "floating-btn home-btn";
    homeBtn.textContent = "H";
    homeBtn.title = "Return Home";
    homeBtn.addEventListener("click", () => {
      window.location.href = "/index.html";
    });

    const helpBtn = document.createElement("button");
    helpBtn.className = "floating-btn help-btn";
    helpBtn.textContent = "?";
    helpBtn.title = "Open Manual";
    helpBtn.addEventListener("click", () => {
      window.open("/docs.html", "_blank");
    });

    btnContainer.appendChild(homeBtn);
    btnContainer.appendChild(helpBtn);
    document.body.appendChild(btnContainer);
  }

  update(data: MFDData): void {
    this.mfd1.update(data);
    this.mfd2.update(data);

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

    for (const { el, mode, minTier } of this.hlkBtns) {
      el.disabled = ship.headingLockTier < minTier;
      el.classList.toggle('hlk-active', ship.headingLock === mode);
    }

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

  setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (this.pauseBtn) {
      this.pauseBtn.classList.toggle("autostab-active", paused);
      this.pauseBtn.textContent = paused ? "RESUME" : "PAUSE";
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
      
    section.appendChild(this.makeFader("RCS", 20, 0, 100, 5, "cyan",
      (v) => { Ship.RADIALPOWER = rotDefault * (v / 20); },
      (v) => `${v}%`,
      () => Math.round((Ship.RADIALPOWER / rotDefault) * 20)));

    section.appendChild(this.makeFader("SIM SPEED", 10, 1, 100, 1, "yellow",
      (v) => { this.setSpeedCb(v / 10); },
      (v) => `${(v / 10).toFixed(1)}×`,
      () => Math.round(this.getSpeedCb() * 10)));

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
      if (on) this.galaxy.ship.headingLock = 'manual';
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

    this.pauseBtn = document.createElement("button");
    this.pauseBtn.className = "autostab-btn";
    this.pauseBtn.textContent = "PAUSE";
    this.pauseBtn.addEventListener("click", () => {
      this.isPaused = !this.isPaused;
      this.pauseBtn.classList.toggle("autostab-active", this.isPaused);
      this.pauseBtn.textContent = this.isPaused ? "RESUME" : "PAUSE";
      this.onPauseCb(this.isPaused);
    });

    const dockBtn = document.createElement("button");
    dockBtn.className = "autostab-btn";
    dockBtn.textContent = "DOCK MODE";
    dockBtn.addEventListener("click", () => {
      const ship = this.galaxy.ship;
      if (!ship) return;
      ship.dockingMode = !ship.dockingMode;
      dockBtn.classList.toggle("autostab-active", ship.dockingMode);
    });

    wrap.appendChild(this.autoStabBtn);
    wrap.appendChild(this.retroBtn);
    wrap.appendChild(this.pauseBtn);
    wrap.appendChild(dockBtn);
    section.appendChild(wrap);

    const hlkDefs: { label: string; mode: HeadingLockMode; minTier: number }[] = [
      { label: 'MAN', mode: 'manual',     minTier: 0 },
      { label: 'PRO', mode: 'prograde',   minTier: 1 },
      { label: 'RET', mode: 'retrograde', minTier: 1 },
      { label: 'RDL', mode: 'radial',     minTier: 2 },
      { label: 'ANT', mode: 'anti-radial',minTier: 2 },
    ];
    const hlkRow = document.createElement('div');
    hlkRow.className = 'hlk-row';
    for (const { label, mode, minTier } of hlkDefs) {
      const btn = document.createElement('button');
      btn.className = 'hlk-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        const ship = this.galaxy.ship;
        if (!ship) return;
        ship.headingLock = mode;
        if (mode !== 'manual') { ship.retrogradeActive = false; ship.retrogradePhase = null; }
      });
      hlkRow.appendChild(btn);
      this.hlkBtns.push({ el: btn, mode, minTier });
    }
    section.appendChild(hlkRow);
    return section;
  }

  // ─── Heading Ref ──────────────────────────────────────────────────────────

  private buildHeadingSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "heading-section";

    section.appendChild(Object.assign(document.createElement("div"), {
      className: "cockpit-section-label",
      textContent: "HEADING REF",
    }));

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

    section.appendChild(rows);
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

    const dw = document.createElement('div');
    dw.className = 'decay-wrap';
    dw.style.display = 'none';
    dw.appendChild(Object.assign(document.createElement('span'), { className: 'decay-label', textContent: 'TIDAL DECAY' }));
    const track = document.createElement('div');
    track.className = 'decay-track';
    const fill = document.createElement('div');
    fill.className = 'decay-fill';
    track.appendChild(fill);
    dw.appendChild(track);
    const dt = Object.assign(document.createElement('span'), { className: 'decay-time' });
    dw.appendChild(dt);
    this.decayWrap = dw;
    this.decayFill = fill;
    this.decayTime = dt;
    section.appendChild(dw);

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

  updateStatusGauges(vx: number, vy: number, liquidErgol: number, maxLE: number, monergol: number, maxM: number, decaySeconds: number | null = null, decayMax: number | null = null): void {
    const lePct = maxLE > 0 ? Math.max(0, liquidErgol / maxLE) : 0;
    const moPct = maxM  > 0 ? Math.max(0, monergol   / maxM)  : 0;

    const speed = Math.hypot(vx, vy) * 2000;
    const speedPct = Math.min(1, speed / 100); // 100 units as max for gauge
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

    if (decaySeconds === null || decayMax === null) {
      this.decayWrap.style.display = 'none';
    } else {
      this.decayWrap.style.display = 'block';
      this.decayFill.style.width = `${Math.max(0, decaySeconds / decayMax) * 100}%`;
      this.decayTime.textContent = `${Math.ceil(decaySeconds)}s`;
      this.decayFill.classList.toggle('decay-urgent', decaySeconds < 30);
    }
  }
}
