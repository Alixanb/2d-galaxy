import type { MFDData } from "../../MFD";
import type { MFDView } from "../MFDView";
import { VEL_THRESHOLD } from "../MFDUtils";
import Galaxy from "../../../systems/Galaxy";

export class RadarView implements MFDView {
  private galaxy: Galaxy;
  private container!: HTMLElement;
  private radarCanvas!: HTMLCanvasElement;
  private radarCtx: CanvasRenderingContext2D | null = null;
  private radarInitialized = false;

  private flags = {
    showGrid: true,
    showVector: true
  };

  constructor(galaxy: Galaxy) {
    this.galaxy = galaxy;
  }

  mount(container: HTMLElement): void {
    this.container = document.createElement("div");
    this.container.className = "mfd-view mfd-view-radar";
    
    this.radarCanvas = document.createElement("canvas");
    this.radarCanvas.className = "mfd-radar-canvas";
    this.container.appendChild(this.radarCanvas);

    container.appendChild(this.container);
  }

  update(data: MFDData): void {
    this.drawRadar(data);
  }

  private initRadarCanvas(): void {
    if (this.radarInitialized) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio;
    this.radarCanvas.width = Math.round(w * dpr);
    this.radarCanvas.height = Math.round(h * dpr);
    this.radarCanvas.style.width = `${w}px`;
    this.radarCanvas.style.height = `${h}px`;
    this.radarCtx = this.radarCanvas.getContext("2d");
    this.radarInitialized = true;
  }

  private drawRadar(data: MFDData): void {
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

    if (this.flags.showGrid) {
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

      if (this.flags.showVector) {
        const speed = Math.hypot(data.vx, data.vy);
        if (speed > VEL_THRESHOLD) {
          const vAngle = Math.atan2(data.vy, data.vx);
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

  onOSB(index: number): void {
    if (index === 2) this.flags.showGrid = !this.flags.showGrid;
    if (index === 3) this.flags.showVector = !this.flags.showVector;
  }

  getLabels(): string[] {
    return [
      "HOME",
      this.flags.showGrid ? "GRID*" : "GRID",
      this.flags.showVector ? "VECT*" : "VECT",
      "TEL", "FUEL", "RADAR"
    ];
  }
}
