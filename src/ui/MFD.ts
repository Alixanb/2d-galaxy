import Galaxy from "../systems/Galaxy";

export interface MFDData {
  vx: number;
  vy: number;
  dist: number;
  angularVel: number;
  starCount: number;
  totalStars: number;
  fps: number;
  liquidErgol: number;
  maxLiquidErgol: number;
  monergol: number;
  maxMonergol: number;
  isThrusting: boolean;
}

type MFDView = "home" | "vel" | "att" | "tel" | "fuel" | "radar";

const CHART_MAX_POINTS = 120;
const SCALE = 2000;
const VEL_THRESHOLD = 0.00008;

export default class MFD {
  private galaxy: Galaxy;
  private root: HTMLElement;
  private screen: HTMLElement;

  // Top row: osbs[0-2], bottom row: osbs[3-5]
  private osbs!: [HTMLButtonElement, HTMLButtonElement, HTMLButtonElement,
                  HTMLButtonElement, HTMLButtonElement, HTMLButtonElement];
  // Matching label cells: lbls[0-2] = top, lbls[3-5] = bottom
  private lbls!: [HTMLElement, HTMLElement, HTMLElement,
                  HTMLElement, HTMLElement, HTMLElement];

  private currentView: MFDView = "home";

  private flags = {
    vel:   { showAngVel: false },
    att:   { showOrient: true, showVector: true },
    tel:   { showFPS: true, showChart: true },
    fuel:  { showRate: true, showEst: true },
    radar: { showGrid: true, showVector: true },
  };

  private data: MFDData = {
    vx: 0, vy: 0, dist: 0, angularVel: 0,
    starCount: 0, totalStars: 0, fps: 0,
    liquidErgol: 0, maxLiquidErgol: 500,
    monergol: 0, maxMonergol: 100,
    isThrusting: false,
  };

  // VEL view
  private velArrowX!: HTMLElement;
  private velArrowY!: HTMLElement;
  private velValueX!: HTMLElement;
  private velValueY!: HTMLElement;
  private velMag!: HTMLElement;
  private velSpd!: HTMLElement;
  private velAngRow!: HTMLElement;
  private velAngValue!: HTMLElement;

  // ATT view
  private attCanvas!: HTMLCanvasElement;
  private attCtx: CanvasRenderingContext2D | null = null;
  private attSpriteCache: HTMLCanvasElement | null = null;
  private attInitialized = false;

  // TEL view
  private telStarsEl!: HTMLElement;
  private telTotalEl!: HTMLElement;
  private telFpsEl!: HTMLElement;
  private telFpsRow!: HTMLElement;
  private telChartWrap!: HTMLElement;
  private chartCanvas!: HTMLCanvasElement;
  private chartCtx: CanvasRenderingContext2D | null = null;
  private chartData: number[] = [];

  // FUEL view
  private fuelLeFill!: HTMLElement;
  private fuelLeAmount!: HTMLElement;
  private fuelMoFill!: HTMLElement;
  private fuelMoAmount!: HTMLElement;
  private fuelRateWrap!: HTMLElement;
  private fuelLeRateEl!: HTMLElement;
  private fuelMoRateEl!: HTMLElement;
  private fuelEstWrap!: HTMLElement;
  private fuelLeEstEl!: HTMLElement;
  private fuelMoEstEl!: HTMLElement;
  private leRateSmoothed = 0;
  private moRateSmoothed = 0;
  private lastFuelLE = -1;
  private lastFuelMO = -1;
  private lastFuelTime = 0;

  // RADAR view
  private radarCanvas!: HTMLCanvasElement;
  private radarCtx: CanvasRenderingContext2D | null = null;
  private radarInitialized = false;

  constructor(galaxy: Galaxy) {
    this.galaxy = galaxy;

    this.root = document.createElement("div");
    this.root.className = "mfd";

    // ── Top buttons ────────────────────────────────────────────
    const topStrip = document.createElement("div");
    topStrip.className = "mfd-btns-top";

    const topLabels = document.createElement("div");
    topLabels.className = "mfd-labels-top";

    // ── Screen ─────────────────────────────────────────────────
    this.screen = document.createElement("div");
    this.screen.className = "mfd-screen";

    // ── Bottom buttons ──────────────────────────────────────────
    const bottomLabels = document.createElement("div");
    bottomLabels.className = "mfd-labels-bottom";

    const bottomStrip = document.createElement("div");
    bottomStrip.className = "mfd-btns-bottom";

    // Create OSBs and labels
    const osb1 = this.makeOSB(() => this.setView("home"));
    const osb2 = this.makeOSB(() => this.onOSB(2));
    const osb3 = this.makeOSB(() => this.onOSB(3));
    const osb4 = this.makeOSB(() => this.onOSB(4));
    const osb5 = this.makeOSB(() => this.onOSB(5));
    const osb6 = this.makeOSB(() => this.onOSB(6));
    this.osbs = [osb1, osb2, osb3, osb4, osb5, osb6];

    topStrip.appendChild(osb1);
    topStrip.appendChild(osb2);
    topStrip.appendChild(osb3);
    bottomStrip.appendChild(osb4);
    bottomStrip.appendChild(osb5);
    bottomStrip.appendChild(osb6);

    const lbls: HTMLElement[] = [];
    for (let i = 0; i < 3; i++) {
      const l = document.createElement("span");
      l.className = "mfd-lbl";
      topLabels.appendChild(l);
      lbls.push(l);
    }
    for (let i = 0; i < 3; i++) {
      const l = document.createElement("span");
      l.className = "mfd-lbl";
      bottomLabels.appendChild(l);
      lbls.push(l);
    }
    this.lbls = lbls as typeof this.lbls;

    this.root.appendChild(topStrip);
    this.root.appendChild(topLabels);
    this.root.appendChild(this.screen);
    this.root.appendChild(bottomLabels);
    this.root.appendChild(bottomStrip);

    this.buildHomeView();
    this.buildVelView();
    this.buildAttView();
    this.buildTelView();
    this.buildFuelView();
    this.buildRadarView();

    this.setView("home");
  }

  getRoot(): HTMLElement {
    return this.root;
  }

  update(data: MFDData): void {
    this.data = data;

    this.chartData.push(data.starCount);
    if (this.chartData.length > CHART_MAX_POINTS) this.chartData.shift();

    // Smoothed fuel consumption rate (EMA)
    const now = performance.now();
    if (this.lastFuelLE >= 0) {
      const dt = (now - this.lastFuelTime) / 1000;
      if (dt > 0.05) {
        const leRate = (this.lastFuelLE - data.liquidErgol) / dt;
        const moRate = (this.lastFuelMO - data.monergol) / dt;
        this.leRateSmoothed = this.leRateSmoothed * 0.88 + Math.max(0, leRate) * 0.12;
        this.moRateSmoothed = this.moRateSmoothed * 0.88 + Math.max(0, moRate) * 0.12;
      }
    }
    this.lastFuelLE = data.liquidErgol;
    this.lastFuelMO = data.monergol;
    this.lastFuelTime = now;

    if (this.currentView === "vel")   this.refreshVel();
    if (this.currentView === "att")   this.drawAttitude();
    if (this.currentView === "tel")   this.refreshTel();
    if (this.currentView === "fuel")  this.refreshFuel();
    if (this.currentView === "radar") this.drawRadar();
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  private setView(view: MFDView): void {
    this.currentView = view;
    for (const child of Array.from(this.screen.children) as HTMLElement[]) {
      if (child.classList.contains("mfd-corner-lbls")) continue;
      child.style.display = "none";
    }
    const el = this.screen.querySelector(`.mfd-view-${view}`) as HTMLElement | null;
    if (el) el.style.display = "flex";
    this.updateOSBs();
  }

  private onOSB(n: number): void {
    // Bottom row always navigates to TEL / FUEL / RADAR
    if (n === 4) { this.setView("tel");   return; }
    if (n === 5) { this.setView("fuel");  return; }
    if (n === 6) { this.setView("radar"); return; }

    // Top-middle (OSB2)
    if (n === 2) {
      switch (this.currentView) {
        case "home":  this.setView("vel"); break;
        case "vel":
          this.flags.vel.showAngVel = !this.flags.vel.showAngVel;
          this.velAngRow.style.display = this.flags.vel.showAngVel ? "flex" : "none";
          this.updateOSBs(); break;
        case "att":
          this.flags.att.showOrient = !this.flags.att.showOrient;
          this.drawAttitude(); this.updateOSBs(); break;
        case "tel":
          this.flags.tel.showFPS = !this.flags.tel.showFPS;
          this.telFpsRow.style.display = this.flags.tel.showFPS ? "flex" : "none";
          this.updateOSBs(); break;
        case "fuel":
          this.flags.fuel.showRate = !this.flags.fuel.showRate;
          this.fuelRateWrap.style.display = this.flags.fuel.showRate ? "block" : "none";
          this.updateOSBs(); break;
        case "radar":
          this.flags.radar.showGrid = !this.flags.radar.showGrid;
          this.drawRadar(); this.updateOSBs(); break;
      }
    }

    // Top-right (OSB3)
    if (n === 3) {
      switch (this.currentView) {
        case "home":  this.setView("att"); break;
        case "att":
          this.flags.att.showVector = !this.flags.att.showVector;
          this.drawAttitude(); this.updateOSBs(); break;
        case "tel":
          this.flags.tel.showChart = !this.flags.tel.showChart;
          this.telChartWrap.style.display = this.flags.tel.showChart ? "block" : "none";
          this.updateOSBs(); break;
        case "fuel":
          this.flags.fuel.showEst = !this.flags.fuel.showEst;
          this.fuelEstWrap.style.display = this.flags.fuel.showEst ? "block" : "none";
          this.updateOSBs(); break;
        case "radar":
          this.flags.radar.showVector = !this.flags.radar.showVector;
          this.drawRadar(); this.updateOSBs(); break;
        // vel: OSB3 unused
      }
    }
  }

  private makeOSB(onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "mfd-osb";
    btn.addEventListener("click", onClick);
    return btn;
  }

  private updateOSBs(): void {
    const [osb1, osb2, osb3, osb4, osb5, osb6] = this.osbs;
    const [lbl1, lbl2, lbl3, lbl4, lbl5, lbl6] = this.lbls;

    for (const o of this.osbs) o.className = "mfd-osb";
    for (const l of this.lbls) { l.className = "mfd-lbl"; l.textContent = ""; }

    // OSB1: always HOME
    lbl1.textContent = "HOME";
    if (this.currentView === "home") { osb1.classList.add("active"); lbl1.classList.add("active"); }

    // Bottom row: always TEL / FUEL / RADAR
    lbl4.textContent = "TEL";  lbl5.textContent = "FUEL"; lbl6.textContent = "RADAR";
    if (this.currentView === "tel")   { osb4.classList.add("active"); lbl4.classList.add("active"); }
    if (this.currentView === "fuel")  { osb5.classList.add("active"); lbl5.classList.add("active"); }
    if (this.currentView === "radar") { osb6.classList.add("active"); lbl6.classList.add("active"); }

    const tog = (btn: HTMLButtonElement, lbl: HTMLElement, text: string, on: boolean) => {
      lbl.textContent = text;
      if (on) { btn.classList.add("modifier-on"); lbl.classList.add("modifier-on"); }
    };
    const unused = (btn: HTMLButtonElement, lbl: HTMLElement) => {
      btn.classList.add("unused"); lbl.classList.add("unused"); lbl.textContent = "—";
    };

    switch (this.currentView) {
      case "home":
        lbl2.textContent = "VEL"; lbl3.textContent = "ATT"; break;
      case "vel":
        tog(osb2, lbl2, "ANG VEL", this.flags.vel.showAngVel);
        unused(osb3, lbl3);
        break;
      case "att":
        tog(osb2, lbl2, "ORIENT", this.flags.att.showOrient);
        tog(osb3, lbl3, "VECTOR", this.flags.att.showVector);
        break;
      case "tel":
        tog(osb2, lbl2, "FPS",   this.flags.tel.showFPS);
        tog(osb3, lbl3, "CHART", this.flags.tel.showChart);
        break;
      case "fuel":
        tog(osb2, lbl2, "RATE", this.flags.fuel.showRate);
        tog(osb3, lbl3, "EST",  this.flags.fuel.showEst);
        break;
      case "radar":
        tog(osb2, lbl2, "GRID", this.flags.radar.showGrid);
        tog(osb3, lbl3, "VECT", this.flags.radar.showVector);
        break;
    }
  }

  // ─── HOME view ────────────────────────────────────────────────────────────

  private buildHomeView(): void {
    const view = document.createElement("div");
    view.className = "mfd-view mfd-view-home";
    view.style.display = "none";

    // Top row: VEL, ATT (matching OSB2, OSB3)
    const rowTop = document.createElement("div");
    rowTop.className = "mfd-home-row";
    const rowBot = document.createElement("div");
    rowBot.className = "mfd-home-row";

    const items: [string, MFDView][] = [
      ["VELOCITY", "vel"], ["ATTITUDE", "att"],   // top
      ["TELEMETRY", "tel"], ["ERGOL SYS", "fuel"], ["RADAR NAV", "radar"], // bottom
    ];

    items.forEach(([label, targetView], i) => {
      const item = document.createElement("div");
      item.className = "mfd-home-item";
      item.addEventListener("click", () => this.setView(targetView));
      item.textContent = label;
      if (i < 2) rowTop.appendChild(item);
      else rowBot.appendChild(item);
    });

    view.appendChild(rowTop);
    view.appendChild(rowBot);
    this.screen.appendChild(view);
  }

  // ─── VEL view ─────────────────────────────────────────────────────────────

  private buildVelView(): void {
    const view = document.createElement("div");
    view.className = "mfd-view mfd-view-vel";
    view.style.display = "none";

    view.appendChild(this.makeMFDHeader("VELOCITY"));
    view.appendChild(this.makeSep());

    const rx = this.makeVelRow("VX");
    this.velArrowX = rx.arrow; this.velValueX = rx.value;
    view.appendChild(rx.el);

    const ry = this.makeVelRow("VY");
    this.velArrowY = ry.arrow; this.velValueY = ry.value;
    view.appendChild(ry.el);

    view.appendChild(this.makeSep());

    const magRow = this.makeDataRow("|V|");
    this.velMag = magRow.value;
    view.appendChild(magRow.el);

    const spdRow = document.createElement("div");
    spdRow.className = "mfd-row";
    spdRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-label", textContent: "SPD" }));
    spdRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-unit", textContent: "m/s" }));
    this.velSpd = Object.assign(document.createElement("span"), { className: "mfd-val mfd-val-spd", textContent: "0.0" });
    spdRow.appendChild(this.velSpd);
    view.appendChild(spdRow);

    this.velAngRow = document.createElement("div");
    this.velAngRow.className = "mfd-row";
    this.velAngRow.style.display = "none";
    this.velAngRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-label", textContent: "ω RAD" }));
    this.velAngValue = Object.assign(document.createElement("span"), { className: "mfd-val", textContent: "0.000" });
    this.velAngRow.appendChild(this.velAngValue);
    view.appendChild(this.velAngRow);

    this.screen.appendChild(view);
  }

  private makeVelRow(axis: string): { el: HTMLElement; arrow: HTMLElement; value: HTMLElement } {
    const el = document.createElement("div");
    el.className = "mfd-row";
    const label = Object.assign(document.createElement("span"), { className: "mfd-label", textContent: axis });
    const arrow = Object.assign(document.createElement("span"), { className: "mfd-arrow", textContent: "·" });
    const value = Object.assign(document.createElement("span"), { className: "mfd-val", textContent: "0.00" });
    el.appendChild(label); el.appendChild(arrow); el.appendChild(value);
    return { el, arrow, value };
  }

  private makeDataRow(label: string): { el: HTMLElement; value: HTMLElement } {
    const el = document.createElement("div");
    el.className = "mfd-row";
    el.appendChild(Object.assign(document.createElement("span"), { className: "mfd-label", textContent: label }));
    const value = Object.assign(document.createElement("span"), { className: "mfd-val", textContent: "—" });
    el.appendChild(value);
    return { el, value };
  }

  private refreshVel(): void {
    const { vx, vy, angularVel } = this.data;
    const fmt = (v: number) => (Math.abs(v) * SCALE).toFixed(2);
    const speed = Math.hypot(vx, vy);

    this.velArrowX.textContent = vx > VEL_THRESHOLD ? "→" : vx < -VEL_THRESHOLD ? "←" : "·";
    this.velArrowY.textContent = vy > VEL_THRESHOLD ? "↓" : vy < -VEL_THRESHOLD ? "↑" : "·";
    this.velValueX.textContent = fmt(vx);
    this.velValueY.textContent = fmt(vy);
    this.velMag.textContent = (speed * SCALE).toFixed(2);
    this.velSpd.textContent = (speed * SCALE).toFixed(1);

    this.velValueX.style.opacity = Math.abs(vx) < VEL_THRESHOLD ? "0.35" : "1";
    this.velValueY.style.opacity = Math.abs(vy) < VEL_THRESHOLD ? "0.35" : "1";
    this.velMag.style.opacity = speed < VEL_THRESHOLD ? "0.35" : "1";

    if (this.flags.vel.showAngVel) {
      this.velAngValue.textContent = (angularVel * 1000).toFixed(3);
    }
  }

  // ─── ATT view ─────────────────────────────────────────────────────────────

  private buildAttView(): void {
    const view = document.createElement("div");
    view.className = "mfd-view mfd-view-att";
    view.style.display = "none";

    this.attCanvas = document.createElement("canvas");
    this.attCanvas.className = "mfd-att-canvas";
    view.appendChild(this.attCanvas);

    this.screen.appendChild(view);
  }

  private initAttCanvas(): void {
    if (this.attInitialized) return;
    const w = this.screen.clientWidth;
    const h = this.screen.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio;
    this.attCanvas.width = Math.round(w * dpr);
    this.attCanvas.height = Math.round(h * dpr);
    this.attCanvas.style.width = `${w}px`;
    this.attCanvas.style.height = `${h}px`;
    this.attCtx = this.attCanvas.getContext("2d");
    this.attInitialized = true;
  }

  private drawAttitude(): void {
    this.initAttCanvas();
    if (!this.attCtx) return;

    const ship = this.galaxy.ship;
    const ctx = this.attCtx;
    const dpr = window.devicePixelRatio;
    const w = this.attCanvas.width;
    const h = this.attCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const { vx, vy, dist } = this.data;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#030a04";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(61, 255, 122, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.stroke();

    ctx.strokeStyle = "rgba(61, 255, 122, 0.18)";
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(cx, cy) * 0.84, 0, Math.PI * 2);
    ctx.stroke();

    if (ship && this.flags.att.showOrient) {
      if (!this.attSpriteCache) {
        const sprite = ship.sprites["idle"];
        const ratio = sprite.height / sprite.width;
        const size = Math.round(32 * dpr);
        const tmp = document.createElement("canvas");
        tmp.width = size;
        tmp.height = Math.round(size * ratio);
        const tmpCtx = tmp.getContext("2d")!;
        tmpCtx.drawImage(sprite, 0, 0, size, size * ratio);
        tmpCtx.globalCompositeOperation = "source-in";
        tmpCtx.fillStyle = "#3dff7a";
        tmpCtx.fillRect(0, 0, size, size * ratio);
        this.attSpriteCache = tmp;
      }

      const sw = this.attSpriteCache.width;
      const sh = this.attSpriteCache.height;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ship.angle);
      ctx.globalAlpha = 0.88;
      ctx.drawImage(this.attSpriteCache, -sw / 2, -sh / 2, sw, sh);
      ctx.restore();
    }

    if (this.flags.att.showVector) {
      const speed = Math.hypot(vx, vy);
      if (speed > VEL_THRESHOLD) {
        const velAngle = Math.atan2(vy, vx);
        const arrowLen = Math.min(cx, cy) * 0.72;
        const tip = 6 * dpr;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(velAngle);
        ctx.strokeStyle = "#3dff7a";
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 1.5 * dpr;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(arrowLen, 0);
        ctx.moveTo(arrowLen, 0); ctx.lineTo(arrowLen - tip, -tip * 0.5);
        ctx.moveTo(arrowLen, 0); ctx.lineTo(arrowLen - tip,  tip * 0.5);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.font = `${9 * dpr}px "Courier New", monospace`;
    ctx.fillStyle = "rgba(61, 255, 122, 0.45)";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${dist.toFixed(2)} AU`, cx, h - 3 * dpr);
    ctx.restore();
  }

  // ─── TEL view ─────────────────────────────────────────────────────────────

  private buildTelView(): void {
    const view = document.createElement("div");
    view.className = "mfd-view mfd-view-tel";
    view.style.display = "none";

    view.appendChild(this.makeMFDHeader("TELEMETRY"));
    view.appendChild(this.makeSep());

    const starsRow = this.makeDataRow("ALIVE");
    this.telStarsEl = starsRow.value;
    view.appendChild(starsRow.el);

    const totalRow = this.makeDataRow("TOTAL");
    this.telTotalEl = totalRow.value;
    view.appendChild(totalRow.el);

    this.telFpsRow = document.createElement("div");
    this.telFpsRow.className = "mfd-row";
    this.telFpsRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-label", textContent: "FPS" }));
    this.telFpsEl = Object.assign(document.createElement("span"), { className: "mfd-val", textContent: "—" });
    this.telFpsRow.appendChild(this.telFpsEl);
    view.appendChild(this.telFpsRow);

    view.appendChild(this.makeSep());

    this.telChartWrap = document.createElement("div");
    this.telChartWrap.className = "mfd-chart-wrap";
    this.chartCanvas = document.createElement("canvas");
    this.telChartWrap.appendChild(this.chartCanvas);
    view.appendChild(this.telChartWrap);

    this.screen.appendChild(view);
  }

  private initChartCanvas(): void {
    if (this.chartCtx) return;
    const w = this.telChartWrap.clientWidth;
    const h = this.telChartWrap.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio;
    this.chartCanvas.width = Math.round(w * dpr);
    this.chartCanvas.height = Math.round(h * dpr);
    this.chartCtx = this.chartCanvas.getContext("2d");
  }

  private refreshTel(): void {
    this.telStarsEl.textContent = String(this.data.starCount);
    this.telTotalEl.textContent = String(this.data.totalStars);
    if (this.flags.tel.showFPS) this.telFpsEl.textContent = String(this.data.fps);
    if (this.flags.tel.showChart) { this.initChartCanvas(); if (this.chartCtx) this.drawChart(); }
  }

  private drawChart(): void {
    if (!this.chartCtx) return;
    const ctx = this.chartCtx;
    const data = this.chartData;
    const w = this.chartCanvas.width;
    const h = this.chartCanvas.height;
    const chartMax = Math.max(...data, 1);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#030a04";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(236, 223, 205, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = Math.round((h / 4) * i);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    if (data.length < 2) return;

    const stepX = w / (CHART_MAX_POINTS - 1);

    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i + CHART_MAX_POINTS - data.length) * stepX;
      const y = h - (data[i] / chartMax) * h * 0.85 - h * 0.05;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    const lastX  = (CHART_MAX_POINTS - 1) * stepX;
    const firstX = (CHART_MAX_POINTS - data.length) * stepX;
    ctx.lineTo(lastX, h); ctx.lineTo(firstX, h); ctx.closePath();
    ctx.fillStyle = "rgba(61, 255, 122, 0.08)";
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = "#3dff7a";
    ctx.lineWidth = 1.5 * window.devicePixelRatio;
    ctx.lineJoin = "round";
    for (let i = 0; i < data.length; i++) {
      const x = (i + CHART_MAX_POINTS - data.length) * stepX;
      const y = h - (data[i] / chartMax) * h * 0.85 - h * 0.05;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // ─── FUEL view ────────────────────────────────────────────────────────────

  private buildFuelView(): void {
    const view = document.createElement("div");
    view.className = "mfd-view mfd-view-fuel";
    view.style.display = "none";

    view.appendChild(this.makeMFDHeader("ERGOL SYS"));
    view.appendChild(this.makeSep());

    const leBar = this.makeFuelBarRow("L-ERGOL", "mfd-fuel-le");
    this.fuelLeFill = leBar.fill; this.fuelLeAmount = leBar.amount;
    view.appendChild(leBar.el);

    const moBar = this.makeFuelBarRow("MONERGOL", "mfd-fuel-mo");
    this.fuelMoFill = moBar.fill; this.fuelMoAmount = moBar.amount;
    view.appendChild(moBar.el);

    view.appendChild(this.makeSep());

    // Rate section (toggleable via OSB2)
    this.fuelRateWrap = document.createElement("div");
    const leRateRow = document.createElement("div");
    leRateRow.className = "mfd-row";
    leRateRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-label", textContent: "LE/S" }));
    this.fuelLeRateEl = Object.assign(document.createElement("span"), { className: "mfd-val", textContent: "0.0" });
    leRateRow.appendChild(this.fuelLeRateEl);
    leRateRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-unit", textContent: "u/s" }));
    const moRateRow = document.createElement("div");
    moRateRow.className = "mfd-row";
    moRateRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-label", textContent: "MO/S" }));
    this.fuelMoRateEl = Object.assign(document.createElement("span"), { className: "mfd-val", textContent: "0.0" });
    moRateRow.appendChild(this.fuelMoRateEl);
    moRateRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-unit", textContent: "u/s" }));
    this.fuelRateWrap.appendChild(leRateRow);
    this.fuelRateWrap.appendChild(moRateRow);
    view.appendChild(this.fuelRateWrap);

    view.appendChild(this.makeSep());

    // Estimate section (toggleable via OSB3)
    this.fuelEstWrap = document.createElement("div");
    const leEstRow = document.createElement("div");
    leEstRow.className = "mfd-row";
    leEstRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-label", textContent: "LE ETA" }));
    this.fuelLeEstEl = Object.assign(document.createElement("span"), { className: "mfd-val", textContent: "—" });
    leEstRow.appendChild(this.fuelLeEstEl);
    const moEstRow = document.createElement("div");
    moEstRow.className = "mfd-row";
    moEstRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-label", textContent: "MO ETA" }));
    this.fuelMoEstEl = Object.assign(document.createElement("span"), { className: "mfd-val", textContent: "—" });
    moEstRow.appendChild(this.fuelMoEstEl);
    this.fuelEstWrap.appendChild(leEstRow);
    this.fuelEstWrap.appendChild(moEstRow);
    view.appendChild(this.fuelEstWrap);

    this.screen.appendChild(view);
  }

  private makeFuelBarRow(label: string, colorClass: string): { el: HTMLElement; fill: HTMLElement; amount: HTMLElement } {
    const el = document.createElement("div");
    el.className = "mfd-fuel-row";

    const headerRow = document.createElement("div");
    headerRow.className = "mfd-row";
    headerRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-label", textContent: label }));
    const amount = Object.assign(document.createElement("span"), { className: "mfd-val mfd-fuel-amount", textContent: "—" });
    headerRow.appendChild(amount);
    el.appendChild(headerRow);

    const barWrap = document.createElement("div");
    barWrap.className = "mfd-fuel-bar-wrap";
    const fill = document.createElement("div");
    fill.className = `mfd-fuel-bar-fill ${colorClass}`;
    fill.style.width = "100%";
    barWrap.appendChild(fill);
    el.appendChild(barWrap);

    return { el, fill, amount };
  }

  private refreshFuel(): void {
    const { liquidErgol, maxLiquidErgol, monergol, maxMonergol } = this.data;

    const lePct = maxLiquidErgol > 0 ? liquidErgol / maxLiquidErgol : 0;
    const moPct = maxMonergol    > 0 ? monergol    / maxMonergol    : 0;

    this.fuelLeFill.style.width = `${lePct * 100}%`;
    this.fuelLeAmount.textContent = `${Math.ceil(liquidErgol)}/${maxLiquidErgol}`;
    this.fuelLeFill.classList.toggle("mfd-fuel-critical", lePct < 0.2);

    this.fuelMoFill.style.width = `${moPct * 100}%`;
    this.fuelMoAmount.textContent = `${Math.ceil(monergol)}/${maxMonergol}`;
    this.fuelMoFill.classList.toggle("mfd-fuel-critical", moPct < 0.2);

    if (this.flags.fuel.showRate) {
      this.fuelLeRateEl.textContent = this.leRateSmoothed.toFixed(1);
      this.fuelMoRateEl.textContent = this.moRateSmoothed.toFixed(1);
    }

    if (this.flags.fuel.showEst) {
      const eta = (fuel: number, rate: number) => {
        if (rate < 0.05) return "∞";
        const s = fuel / rate;
        if (s > 3600) return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`;
        if (s > 60)   return `${Math.floor(s / 60)}m${Math.floor(s % 60)}s`;
        return `${Math.floor(s)}s`;
      };
      this.fuelLeEstEl.textContent = eta(liquidErgol, this.leRateSmoothed);
      this.fuelMoEstEl.textContent = eta(monergol,    this.moRateSmoothed);
    }
  }

  // ─── RADAR view ───────────────────────────────────────────────────────────

  private buildRadarView(): void {
    const view = document.createElement("div");
    view.className = "mfd-view mfd-view-radar";
    view.style.display = "none";

    this.radarCanvas = document.createElement("canvas");
    this.radarCanvas.className = "mfd-radar-canvas";
    view.appendChild(this.radarCanvas);

    this.screen.appendChild(view);
  }

  private initRadarCanvas(): void {
    if (this.radarInitialized) return;
    const w = this.screen.clientWidth;
    const h = this.screen.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio;
    this.radarCanvas.width = Math.round(w * dpr);
    this.radarCanvas.height = Math.round(h * dpr);
    this.radarCanvas.style.width = `${w}px`;
    this.radarCanvas.style.height = `${h}px`;
    this.radarCtx = this.radarCanvas.getContext("2d");
    this.radarInitialized = true;
  }

  private drawRadar(): void {
    this.initRadarCanvas();
    if (!this.radarCtx) return;

    const ctx = this.radarCtx;
    const dpr = window.devicePixelRatio;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#030a04";
    ctx.fillRect(0, 0, w, h);

    const range = this.galaxy.size * 1.3;
    const scale = Math.min(cx, cy) * 0.88 / range;

    const toScreen = (wx: number, wy: number): [number, number] => [
      cx + wx * scale,
      cy + wy * scale,
    ];

    if (this.flags.radar.showGrid) {
      ctx.strokeStyle = "rgba(61, 255, 122, 0.07)";
      ctx.lineWidth = 1;
      for (let r = 0.25; r <= 1.25; r += 0.25) {
        ctx.beginPath();
        ctx.arc(cx, cy, r * this.galaxy.size * scale, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
      ctx.moveTo(0, cy); ctx.lineTo(w, cy);
      ctx.stroke();
    }

    // Galaxy boundary
    ctx.strokeStyle = "rgba(61, 255, 122, 0.18)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3 * dpr, 4 * dpr]);
    ctx.beginPath();
    ctx.arc(cx, cy, this.galaxy.size * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Black holes
    for (const bh of this.galaxy.blackholes) {
      const [sx, sy] = toScreen(bh.pos.x, bh.pos.y);
      const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 18 * dpr);
      grd.addColorStop(0, "rgba(236, 38, 38, 0.45)");
      grd.addColorStop(1, "rgba(236, 38, 38, 0)");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(sx, sy, 18 * dpr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ec2626";
      ctx.beginPath(); ctx.arc(sx, sy, 3 * dpr, 0, Math.PI * 2); ctx.fill();
    }

    const ship = this.galaxy.ship;
    if (ship) {
      const [sx, sy] = toScreen(ship.pos.x, ship.pos.y);

      if (this.flags.radar.showVector) {
        const speed = Math.hypot(this.data.vx, this.data.vy);
        if (speed > VEL_THRESHOLD) {
          const vAngle = Math.atan2(this.data.vy, this.data.vx);
          const len = Math.min(cx * 0.35, speed * scale * 60000) * dpr;
          ctx.strokeStyle = "rgba(61, 255, 122, 0.55)";
          ctx.lineWidth = 1.5 * dpr;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + Math.cos(vAngle) * len, sy + Math.sin(vAngle) * len);
          ctx.stroke();
        }
      }

      // Ship triangle pointing in facing direction
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ship.angle);
      ctx.fillStyle = "#3dff7a";
      const s = 5 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.6);
      ctx.lineTo(s, s);
      ctx.lineTo(-s, s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.font = `${8 * dpr}px "Courier New", monospace`;
      ctx.fillStyle = "rgba(61, 255, 122, 0.3)";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(`±${range.toFixed(1)} AU`, w - 5 * dpr, h - 4 * dpr);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private makeMFDHeader(text: string): HTMLElement {
    const el = document.createElement("div");
    el.className = "mfd-header";
    el.textContent = text;
    return el;
  }

  private makeSep(): HTMLElement {
    const el = document.createElement("div");
    el.className = "mfd-sep";
    return el;
  }
}
