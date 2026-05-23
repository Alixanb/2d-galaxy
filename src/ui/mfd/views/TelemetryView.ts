import type { MFDData } from "../../MFD";
import type { MFDView } from "../MFDView";
import { makeMFDHeader, makeSep, makeDataRow, CHART_MAX_POINTS } from "../MFDUtils";

export class TelemetryView implements MFDView {
  private container!: HTMLElement;
  private telStarsEl!: HTMLElement;
  private telTotalEl!: HTMLElement;
  private telFpsEl!: HTMLElement;
  private telFpsRow!: HTMLElement;
  private telChartWrap!: HTMLElement;
  private chartCanvas!: HTMLCanvasElement;
  private chartCtx: CanvasRenderingContext2D | null = null;
  private chartData: number[] = [];

  private flags = {
    showFPS: true,
    showChart: true
  };

  mount(container: HTMLElement): void {
    this.container = document.createElement("div");
    this.container.className = "mfd-view mfd-view-tel";
    
    this.container.appendChild(makeMFDHeader("TELEMETRY"));
    this.container.appendChild(makeSep());

    const starsRow = makeDataRow("ALIVE");
    this.telStarsEl = starsRow.value;
    this.container.appendChild(starsRow.el);

    const totalRow = makeDataRow("TOTAL");
    this.telTotalEl = totalRow.value;
    this.container.appendChild(totalRow.el);

    this.telFpsRow = document.createElement("div");
    this.telFpsRow.className = "mfd-row";
    const fpsLbl = document.createElement("span");
    fpsLbl.className = "mfd-label";
    fpsLbl.textContent = "FPS";
    this.telFpsEl = document.createElement("span");
    this.telFpsEl.className = "mfd-val";
    this.telFpsEl.textContent = "—";
    this.telFpsRow.appendChild(fpsLbl);
    this.telFpsRow.appendChild(this.telFpsEl);
    this.container.appendChild(this.telFpsRow);

    this.container.appendChild(makeSep());

    this.telChartWrap = document.createElement("div");
    this.telChartWrap.className = "mfd-chart-wrap";
    this.chartCanvas = document.createElement("canvas");
    this.telChartWrap.appendChild(this.chartCanvas);
    this.container.appendChild(this.telChartWrap);

    container.appendChild(this.container);
  }

  update(data: MFDData): void {
    this.chartData.push(data.starCount);
    if (this.chartData.length > CHART_MAX_POINTS) this.chartData.shift();

    this.telStarsEl.textContent = String(data.starCount);
    this.telTotalEl.textContent = String(data.totalStars);
    
    if (this.flags.showFPS) {
      this.telFpsEl.textContent = String(data.fps);
    }

    if (this.flags.showChart) {
      this.initChartCanvas();
      if (this.chartCtx) this.drawChart();
    }
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

  onOSB(index: number): void {
    if (index === 2) {
      this.flags.showFPS = !this.flags.showFPS;
      this.telFpsRow.style.display = this.flags.showFPS ? "flex" : "none";
    }
    if (index === 3) {
      this.flags.showChart = !this.flags.showChart;
      this.telChartWrap.style.display = this.flags.showChart ? "block" : "none";
    }
  }

  getLabels(): string[] {
    return [
      "HOME",
      this.flags.showFPS ? "FPS*" : "FPS",
      this.flags.showChart ? "CHART*" : "CHART",
      "TEL", "FUEL", "RADAR"
    ];
  }
}
