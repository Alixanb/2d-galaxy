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

type MFDView = "home" | "vel" | "att" | "tel";

const CHART_MAX_POINTS = 120;
const SCALE = 10000;
const VEL_THRESHOLD = 0.00008;

export default class MFD {
  private galaxy: Galaxy;
  private root: HTMLElement;
  private screen: HTMLElement;
  private osbs: [HTMLButtonElement, HTMLButtonElement, HTMLButtonElement, HTMLButtonElement];
  private currentView: MFDView = "home";

  private flags = {
    vel: { showAngVel: false },
    att: { showOrient: true, showVector: true },
    tel: { showFPS: true, showChart: true },
  };

  private data: MFDData = { 
    vx: 0, vy: 0, dist: 0, angularVel: 0, 
    starCount: 0, totalStars: 0, fps: 0,
    liquidErgol: 0, maxLiquidErgol: 500,
    monergol: 0, maxMonergol: 100,
    isThrusting: false
  };

  // Corner label refs (overlay on screen)
  private lblOsb1!: HTMLElement;
  private lblOsb2!: HTMLElement;
  private lblOsb3!: HTMLElement;
  private lblOsb4!: HTMLElement;

  // VEL view refs
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

  // TEL view refs
  private telStarsEl!: HTMLElement;
  private telTotalEl!: HTMLElement;
  private telFpsEl!: HTMLElement;
  private telFpsRow!: HTMLElement;
  private telChartWrap!: HTMLElement;
  private chartCanvas!: HTMLCanvasElement;
  private chartCtx: CanvasRenderingContext2D | null = null;
  private chartData: number[] = [];

  constructor(galaxy: Galaxy) {
    this.galaxy = galaxy;

    this.root = document.createElement("div");
    this.root.className = "mfd";

    const leftStrip = document.createElement("div");
    leftStrip.className = "mfd-btns-left";

    const rightStrip = document.createElement("div");
    rightStrip.className = "mfd-btns-right";

    this.screen = document.createElement("div");
    this.screen.className = "mfd-screen";

    // Corner labels overlay
    const lblWrap = document.createElement("div");
    lblWrap.className = "mfd-corner-lbls";
    lblWrap.setAttribute("aria-hidden", "true");

    this.lblOsb1 = this.makeCornerLbl("mfd-lbl-tl");
    this.lblOsb2 = this.makeCornerLbl("mfd-lbl-bl");
    this.lblOsb3 = this.makeCornerLbl("mfd-lbl-tr");
    this.lblOsb4 = this.makeCornerLbl("mfd-lbl-br");

    lblWrap.appendChild(this.lblOsb1);
    lblWrap.appendChild(this.lblOsb2);
    lblWrap.appendChild(this.lblOsb3);
    lblWrap.appendChild(this.lblOsb4);
    this.screen.appendChild(lblWrap);

    // OSBs: plain LED indicator buttons
    const osb1 = this.makeOSB(() => this.setView("home"));
    const osb2 = this.makeOSB(() => this.onOSB2());
    const osb3 = this.makeOSB(() => this.onOSB3());
    const osb4 = this.makeOSB(() => this.onOSB4());
    this.osbs = [osb1, osb2, osb3, osb4];

    leftStrip.appendChild(osb1);
    leftStrip.appendChild(osb2);
    rightStrip.appendChild(osb3);
    rightStrip.appendChild(osb4);

    this.root.appendChild(leftStrip);
    this.root.appendChild(this.screen);
    this.root.appendChild(rightStrip);

    this.buildHomeView();
    this.buildVelView();
    this.buildAttView();
    this.buildTelView();

    this.setView("home");
  }

  getRoot(): HTMLElement {
    return this.root;
  }

  update(data: MFDData): void {
    this.data = data;

    // Always accumulate chart data so the graph records from simulation start
    this.chartData.push(data.starCount);
    if (this.chartData.length > CHART_MAX_POINTS) this.chartData.shift();

    if (this.currentView === "vel") this.refreshVel();
    if (this.currentView === "att") this.drawAttitude();
    if (this.currentView === "tel") this.refreshTel();
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

  private onOSB2(): void {
    switch (this.currentView) {
      case "home": this.setView("vel"); break;
      case "vel":
        this.flags.vel.showAngVel = !this.flags.vel.showAngVel;
        this.velAngRow.style.display = this.flags.vel.showAngVel ? "flex" : "none";
        this.updateOSBs();
        break;
      case "att":
        this.flags.att.showOrient = !this.flags.att.showOrient;
        this.drawAttitude();
        this.updateOSBs();
        break;
      case "tel":
        this.flags.tel.showFPS = !this.flags.tel.showFPS;
        this.telFpsRow.style.display = this.flags.tel.showFPS ? "flex" : "none";
        this.updateOSBs();
        break;
    }
  }

  private onOSB3(): void {
    switch (this.currentView) {
      case "home": this.setView("att"); break;
      case "att":
        this.flags.att.showVector = !this.flags.att.showVector;
        this.drawAttitude();
        this.updateOSBs();
        break;
      case "tel":
        this.flags.tel.showChart = !this.flags.tel.showChart;
        this.telChartWrap.style.display = this.flags.tel.showChart ? "block" : "none";
        this.updateOSBs();
        break;
    }
  }

  private onOSB4(): void {
    if (this.currentView === "home") this.setView("tel");
  }

  private makeOSB(onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "mfd-osb";
    btn.addEventListener("click", onClick);
    return btn;
  }

  private makeCornerLbl(posClass: string): HTMLElement {
    const el = document.createElement("span");
    el.className = `mfd-corner-lbl ${posClass}`;
    return el;
  }

  private updateOSBs(): void {
    const [osb1, osb2, osb3, osb4] = this.osbs;
    for (const o of this.osbs) o.className = "mfd-osb";

    // Reset corner labels
    this.lblOsb1.className = "mfd-corner-lbl mfd-lbl-tl";
    this.lblOsb2.className = "mfd-corner-lbl mfd-lbl-bl";
    this.lblOsb3.className = "mfd-corner-lbl mfd-lbl-tr";
    this.lblOsb4.className = "mfd-corner-lbl mfd-lbl-br";

    switch (this.currentView) {
      case "home":
        osb1.classList.add("active");
        this.lblOsb1.textContent = "HOME"; this.lblOsb1.classList.add("active");
        this.lblOsb2.textContent = "VEL";
        this.lblOsb3.textContent = "ATT";
        this.lblOsb4.textContent = "TEL";
        break;
      case "vel":
        this.lblOsb1.textContent = "HOME";
        this.lblOsb2.textContent = "ANG VEL";
        if (this.flags.vel.showAngVel) { osb2.classList.add("modifier-on"); this.lblOsb2.classList.add("modifier-on"); }
        osb3.classList.add("unused"); this.lblOsb3.textContent = "—"; this.lblOsb3.classList.add("unused");
        osb4.classList.add("unused"); this.lblOsb4.textContent = "—"; this.lblOsb4.classList.add("unused");
        break;
      case "att":
        this.lblOsb1.textContent = "HOME";
        this.lblOsb2.textContent = "ORIENT";
        if (this.flags.att.showOrient) { osb2.classList.add("modifier-on"); this.lblOsb2.classList.add("modifier-on"); }
        this.lblOsb3.textContent = "VECTOR";
        if (this.flags.att.showVector) { osb3.classList.add("modifier-on"); this.lblOsb3.classList.add("modifier-on"); }
        osb4.classList.add("unused"); this.lblOsb4.textContent = "—"; this.lblOsb4.classList.add("unused");
        break;
      case "tel":
        this.lblOsb1.textContent = "HOME";
        this.lblOsb2.textContent = "FPS";
        if (this.flags.tel.showFPS) { osb2.classList.add("modifier-on"); this.lblOsb2.classList.add("modifier-on"); }
        this.lblOsb3.textContent = "CHART";
        if (this.flags.tel.showChart) { osb3.classList.add("modifier-on"); this.lblOsb3.classList.add("modifier-on"); }
        osb4.classList.add("unused"); this.lblOsb4.textContent = "—"; this.lblOsb4.classList.add("unused");
        break;
    }
  }

  // ─── HOME view ────────────────────────────────────────────────────────────

  private buildHomeView(): void {
    const view = document.createElement("div");
    view.className = "mfd-view mfd-view-home";
    view.style.display = "none";

    const items: [string, MFDView][] = [["VELOCITY", "vel"], ["ATTITUDE", "att"], ["TELEMETRY", "tel"]];
    const osbLabels = ["OSB2", "OSB3", "OSB4"];

    items.forEach(([label, targetView], i) => {
      const item = document.createElement("div");
      item.className = "mfd-home-item";
      item.addEventListener("click", () => this.setView(targetView));

      const name = document.createElement("span");
      name.textContent = label;

      const key = document.createElement("span");
      key.className = "mfd-home-key";
      key.textContent = osbLabels[i];

      item.appendChild(name);
      item.appendChild(key);
      view.appendChild(item);
    });

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
    const spdLbl = Object.assign(document.createElement("span"), { className: "mfd-label", textContent: "SPD" });
    const spdUnit = Object.assign(document.createElement("span"), { className: "mfd-unit", textContent: "m/s" });
    this.velSpd = Object.assign(document.createElement("span"), { className: "mfd-val mfd-val-spd", textContent: "0.0" });
    spdRow.appendChild(spdLbl);
    spdRow.appendChild(spdUnit);
    spdRow.appendChild(this.velSpd);
    view.appendChild(spdRow);

    this.velAngRow = document.createElement("div");
    this.velAngRow.className = "mfd-row";
    this.velAngRow.style.display = "none";
    const angLbl = Object.assign(document.createElement("span"), { className: "mfd-label", textContent: "ω RAD" });
    this.velAngValue = Object.assign(document.createElement("span"), { className: "mfd-val", textContent: "0.000" });
    this.velAngRow.appendChild(angLbl);
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
    el.appendChild(label);
    el.appendChild(arrow);
    el.appendChild(value);
    return { el, arrow, value };
  }

  private makeDataRow(label: string): { el: HTMLElement; value: HTMLElement } {
    const el = document.createElement("div");
    el.className = "mfd-row";
    const lbl = Object.assign(document.createElement("span"), { className: "mfd-label", textContent: label });
    const value = Object.assign(document.createElement("span"), { className: "mfd-val", textContent: "—" });
    el.appendChild(lbl);
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
        ctx.moveTo(0, 0);
        ctx.lineTo(arrowLen, 0);
        ctx.moveTo(arrowLen, 0);
        ctx.lineTo(arrowLen - tip, -tip * 0.5);
        ctx.moveTo(arrowLen, 0);
        ctx.lineTo(arrowLen - tip, tip * 0.5);
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
    const fpsLbl = Object.assign(document.createElement("span"), { className: "mfd-label", textContent: "FPS" });
    this.telFpsEl = Object.assign(document.createElement("span"), { className: "mfd-val", textContent: "—" });
    this.telFpsRow.appendChild(fpsLbl);
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

    if (this.flags.tel.showChart) {
      this.initChartCanvas();
      if (this.chartCtx) this.drawChart();
    }
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
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (data.length < 2) return;

    const stepX = w / (CHART_MAX_POINTS - 1);

    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i + CHART_MAX_POINTS - data.length) * stepX;
      const y = h - (data[i] / chartMax) * h * 0.85 - h * 0.05;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const lastX = (CHART_MAX_POINTS - 1) * stepX;
    const firstX = (CHART_MAX_POINTS - data.length) * stepX;
    ctx.lineTo(lastX, h);
    ctx.lineTo(firstX, h);
    ctx.closePath();
    ctx.fillStyle = "rgba(61, 255, 122, 0.08)";
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = "#3dff7a";
    ctx.lineWidth = 1.5 * window.devicePixelRatio;
    ctx.lineJoin = "round";
    for (let i = 0; i < data.length; i++) {
      const x = (i + CHART_MAX_POINTS - data.length) * stepX;
      const y = h - (data[i] / chartMax) * h * 0.85 - h * 0.05;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
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
