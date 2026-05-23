import { makeCockpitLabel } from "./CockpitUtils";

export class StatusPanel {
  private root: HTMLElement;
  private spCanvas!: HTMLCanvasElement;
  private leCanvas!: HTMLCanvasElement;
  private moCanvas!: HTMLCanvasElement;
  private decayWrap!: HTMLElement;
  private decayFill!: HTMLElement;
  private decayTime!: HTMLSpanElement;

  constructor() {
    this.root = document.createElement("div");
    this.root.className = "status-section";

    this.root.appendChild(makeCockpitLabel("SHIP STATUS"));

    const wrap = document.createElement("div");
    wrap.className = "status-gauges";

    this.spCanvas = this.makeGaugeCanvas(80);
    this.leCanvas = this.makeGaugeCanvas(80);
    this.moCanvas = this.makeGaugeCanvas(80);
    wrap.appendChild(this.spCanvas);
    wrap.appendChild(this.leCanvas);
    wrap.appendChild(this.moCanvas);
    this.root.appendChild(wrap);

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
    this.root.appendChild(dw);
  }

  getRoot(): HTMLElement {
    return this.root;
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

    const START = (5 * Math.PI) / 4;
    const SWEEP = (3 * Math.PI) / 2;

    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(cx, cy, r, START, START + SWEEP);
    ctx.strokeStyle = "rgba(236, 223, 205, 0.09)";
    ctx.lineWidth = trackW;
    ctx.lineCap = "butt";
    ctx.stroke();

    for (let i = 0; i <= 4; i++) {
      const a = START + (i / 4) * SWEEP;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - trackW * 1.6), cy + Math.sin(a) * (r - trackW * 1.6));
      ctx.lineTo(cx + Math.cos(a) * (r + trackW * 0.6), cy + Math.sin(a) * (r + trackW * 0.6));
      ctx.strokeStyle = "rgba(236, 223, 205, 0.18)";
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();
    }

    const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 220);
    const fillColor = critical ? `rgba(236, 38, 38, ${pulse})` : color;

    if (pct > 0.004) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, START, START + SWEEP * pct);
      ctx.strokeStyle = fillColor;
      ctx.lineWidth = trackW;
      ctx.lineCap = "round";
      ctx.stroke();

      const tipA = START + SWEEP * pct;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(tipA) * r, cy + Math.sin(tipA) * r, trackW * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
    }

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

    ctx.fillStyle = "rgba(236, 223, 205, 0.32)";
    ctx.font = `${7 * dpr}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cx, cy + r * 0.6);
  }

  update(vx: number, vy: number, liquidErgol: number, maxLE: number, monergol: number, maxM: number, decaySeconds: number | null = null, decayMax: number | null = null): void {
    const lePct = maxLE > 0 ? Math.max(0, liquidErgol / maxLE) : 0;
    const moPct = maxM  > 0 ? Math.max(0, monergol   / maxM)  : 0;

    const speed = Math.hypot(vx, vy) * 2000;
    const speedPct = Math.min(1, speed / 100);
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
