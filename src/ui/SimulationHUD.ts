import { createFloatingWindow } from "../systems/FloatingWindow";

const CHART_BG = "#130e0e";
const CHART_LINE = "#50b6c9";
const CHART_GRID = "rgba(236, 223, 205, 0.1)";
const MAX_CHART_POINTS = 120;

export default class SimulationHUD {
  private panel: HTMLElement;
  private fpsEl: HTMLElement;
  private starsEl: HTMLElement;
  private chartCanvas: HTMLCanvasElement;
  private chartCtx: CanvasRenderingContext2D;
  private chartData: number[] = [];
  private chartMax = 1;

  constructor() {
    const { panel, body } = createFloatingWindow("Simulation", 260, 200, 120);
    this.panel = panel;
    panel.style.right = "20px";
    panel.style.top = "20px";
    panel.style.display = "none";
    document.body.appendChild(panel);

    const stats = document.createElement("div");
    stats.className = "hud-stats";

    this.fpsEl = this.buildStatRow(stats, "FPS");
    this.starsEl = this.buildStatRow(stats, "Stars");
    body.appendChild(stats);

    const chartWrap = document.createElement("div");
    chartWrap.className = "hud-chart";

    const chartLabel = document.createElement("span");
    chartLabel.className = "chart-label";
    chartLabel.textContent = "Stars over time";
    chartWrap.appendChild(chartLabel);

    this.chartCanvas = document.createElement("canvas");
    this.chartCanvas.id = "chart-canvas";
    chartWrap.appendChild(this.chartCanvas);
    body.appendChild(chartWrap);

    this.resizeChart();
    window.addEventListener("resize", () => this.resizeChart());

    const ctx = this.chartCanvas.getContext("2d");
    if (!ctx) throw new Error("Could not get chart canvas context");
    this.chartCtx = ctx;
  }

  private buildStatRow(parent: HTMLElement, label: string): HTMLElement {
    const row = document.createElement("div");
    row.className = "stat";

    const labelEl = document.createElement("span");
    labelEl.className = "stat-label";
    labelEl.textContent = label;

    const valueEl = document.createElement("span");
    valueEl.className = "stat-value";
    valueEl.textContent = "—";

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    parent.appendChild(row);
    return valueEl;
  }

  private resizeChart() {
    const rect = this.chartCanvas.getBoundingClientRect();
    this.chartCanvas.width = rect.width * devicePixelRatio;
    this.chartCanvas.height = rect.height * devicePixelRatio;
  }

  show() {
    this.panel.style.display = "flex";
    this.resizeChart();
  }

  setFPS(v: number) {
    this.fpsEl.textContent = v.toString();
  }

  setStarCount(v: number) {
    this.starsEl.textContent = v.toString();
  }

  pushChartValue(starCount: number) {
    this.chartData.push(starCount);
    if (this.chartData.length > MAX_CHART_POINTS) {
      this.chartData.shift();
    }
    this.chartMax = Math.max(...this.chartData, 1);
    this.drawChart();
  }

  private drawChart() {
    const canvas = this.chartCanvas;
    const ctx = this.chartCtx;
    const w = canvas.width;
    const h = canvas.height;
    const data = this.chartData;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = CHART_BG;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = CHART_GRID;
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = Math.round((h / 4) * i);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (data.length < 2) return;

    const stepX = w / (MAX_CHART_POINTS - 1);

    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i + MAX_CHART_POINTS - data.length) * stepX;
      const y = h - (data[i] / this.chartMax) * h * 0.85 - h * 0.05;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const lastX = (MAX_CHART_POINTS - 1) * stepX;
    const firstX = (MAX_CHART_POINTS - data.length) * stepX;
    ctx.lineTo(lastX, h);
    ctx.lineTo(firstX, h);
    ctx.closePath();
    ctx.fillStyle = "rgba(80, 182, 201, 0.08)";
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = CHART_LINE;
    ctx.lineWidth = 1.5 * devicePixelRatio;
    ctx.lineJoin = "round";
    for (let i = 0; i < data.length; i++) {
      const x = (i + MAX_CHART_POINTS - data.length) * stepX;
      const y = h - (data[i] / this.chartMax) * h * 0.85 - h * 0.05;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
