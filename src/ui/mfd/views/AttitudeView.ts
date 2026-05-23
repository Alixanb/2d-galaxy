import type { MFDData } from "../../MFD";
import type { MFDView } from "../MFDView";
import { VEL_THRESHOLD } from "../MFDUtils";
import Galaxy from "../../../systems/Galaxy";

export class AttitudeView implements MFDView {
  private galaxy: Galaxy;
  private container!: HTMLElement;
  private attCanvas!: HTMLCanvasElement;
  private attCtx: CanvasRenderingContext2D | null = null;
  private attSpriteCache: HTMLCanvasElement | null = null;
  private attInitialized = false;

  private flags = {
    showOrient: true,
    showVector: true
  };

  constructor(galaxy: Galaxy) {
    this.galaxy = galaxy;
  }

  mount(container: HTMLElement): void {
    this.container = document.createElement("div");
    this.container.className = "mfd-view mfd-view-att";
    
    this.attCanvas = document.createElement("canvas");
    this.attCanvas.className = "mfd-att-canvas";
    this.container.appendChild(this.attCanvas);

    container.appendChild(this.container);
  }

  update(data: MFDData): void {
    this.drawAttitude(data);
  }

  private initAttCanvas(): void {
    if (this.attInitialized) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio;
    this.attCanvas.width = Math.round(w * dpr);
    this.attCanvas.height = Math.round(h * dpr);
    this.attCanvas.style.width = `${w}px`;
    this.attCanvas.style.height = `${h}px`;
    this.attCtx = this.attCanvas.getContext("2d");
    this.attInitialized = true;
  }

  private drawAttitude(data: MFDData): void {
    this.initAttCanvas();
    if (!this.attCtx) return;

    const ship = this.galaxy.ship;
    const ctx = this.attCtx;
    const dpr = window.devicePixelRatio;
    const w = this.attCanvas.width;
    const h = this.attCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const { vx, vy, dist } = data;

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

    if (ship && this.flags.showOrient) {
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

    if (this.flags.showVector) {
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

  onOSB(index: number): void {
    if (index === 2) this.flags.showOrient = !this.flags.showOrient;
    if (index === 3) this.flags.showVector = !this.flags.showVector;
  }

  getLabels(): string[] {
    return [
      "HOME",
      this.flags.showOrient ? "ORIENT*" : "ORIENT",
      this.flags.showVector ? "VECTOR*" : "VECTOR",
      "TEL", "FUEL", "RADAR"
    ];
  }
}
