import Vec2 from "../../core/Vec2";
import Color from "../../core/Color";
import type { Canvas2d } from "../../systems/Canvas";
import type { UpgradeState } from "../../core/GameState";
import { drawProbeDynamic, getEngineExitY, PROBE_SIZE } from "../../sprites/probe";
import Ship from "../Ship";
import { ShipNavigator } from "./ShipNavigator";

export class ShipRenderer {
  private ship: Ship;
  private navigator: ShipNavigator;
  private pathColor = new Color(80, 182, 201);
  private offscreen: HTMLCanvasElement;
  private thrustStartY: number = 0;

  constructor(ship: Ship, navigator: ShipNavigator) {
    this.ship = ship;
    this.navigator = navigator;
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = PROBE_SIZE;
    this.offscreen.height = PROBE_SIZE;
    const defaultUp = { hull: 0, thrust: 0, ergol: 0, rcs: 0, avionics: 0 };
    drawProbeDynamic(this.offscreen.getContext('2d')!, 0, PROBE_SIZE, defaultUp);
    this.thrustStartY = this.probeYToScreen(getEngineExitY(PROBE_SIZE, defaultUp));
  }

  refreshSprite(u: UpgradeState): void {
    const up = {
      hull:     u.hullLevel,
      thrust:   Math.min(u.thrustLevel, 3),
      ergol:    Math.min(u.lErgolLevel, 2),
      rcs:      u.rcsBoostLevel,
      avionics: Math.min(u.headingLockTier, 2),
    };
    drawProbeDynamic(this.offscreen.getContext('2d')!, 0, PROBE_SIZE, up);
    this.thrustStartY = this.probeYToScreen(getEngineExitY(PROBE_SIZE, up));
  }

  private probeYToScreen(probeY: number): number {
    const w = this.ship.size;
    return (probeY / PROBE_SIZE) * w - w / 2;
  }

  draw(canvas: Canvas2d) {
    const screenPos = canvas.place(this.ship.pos);
    const width = this.ship.size;
    const height = this.ship.size * this.ship.spritesWidthRatio["idle"];

    canvas.context.save();
    canvas.context.translate(screenPos.x, screenPos.y);
    canvas.context.rotate(this.ship.angle);

    if (this.ship.status === "thrusting") {
      this.drawThruster(canvas, width, height, this.ship.thrusterPct);
    }

    canvas.context.drawImage(this.offscreen, -width / 2, -width / 2, width, width);

    canvas.context.restore();

    if (this.ship.showPath) {
      this.drawPath(canvas);
    }

    this.drawOffscreenIndicator(canvas);
  }

  private drawOffscreenIndicator(canvas: Canvas2d) {
    const dpr = window.devicePixelRatio;
    const W = canvas.dimensions.x / dpr;
    const H = canvas.dimensions.y / dpr;
    const sp = canvas.place(this.ship.pos);

    if (sp.x >= 0 && sp.x <= W && sp.y >= 0 && sp.y <= H) return;

    const margin = 40;
    const cx = W / 2;
    const cy = H / 2;
    const dx = sp.x - cx;
    const dy = sp.y - cy;
    const theta = Math.atan2(dy, dx);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    let t = Infinity;
    if (cosT > 1e-4) t = Math.min(t, (W / 2 - margin) / cosT);
    if (cosT < -1e-4) t = Math.min(t, -(W / 2 - margin) / cosT);
    if (sinT > 1e-4) t = Math.min(t, (H / 2 - margin) / sinT);
    if (sinT < -1e-4) t = Math.min(t, -(H / 2 - margin) / sinT);

    const ex = cx + t * cosT;
    const ey = cy + t * sinT;

    const ctx = canvas.context;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);

    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(theta);
    ctx.globalAlpha = 0.55 + 0.45 * pulse;
    ctx.fillStyle = "#3dff7a";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#3dff7a";
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawThruster(canvas: Canvas2d, w: number, _h: number, pct: number) {
    if (pct <= 0) return;
    const ctx = canvas.context;
    const rearY = this.thrustStartY;

    const flicker = 0.8 + Math.random() * 0.4;
    const tipY = rearY + w * 0.45 * pct * flicker;
    const sideW = w * 0.1 * (0.85 + Math.random() * 0.3);

    const grad = ctx.createLinearGradient(0, rearY, 0, tipY);
    grad.addColorStop(0,    "rgba(200, 240, 255, 1.0)");
    grad.addColorStop(0.25, "rgba(80, 170, 255, 0.95)");
    grad.addColorStop(0.65, "rgba(40, 90, 230, 0.7)");
    grad.addColorStop(1,    "rgba(20, 50, 200, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-sideW, rearY);
    ctx.lineTo(sideW, rearY);
    ctx.lineTo(0, tipY);
    ctx.closePath();
    ctx.fill();
  }

  drawPath(canvas: Canvas2d) {
    const path = this.navigator.path;
    if (path.length < 2) return;

    const ctx = canvas.context;
    const total = path.length;
    const segmentSize = Math.max(1, Math.floor(total / 200));

    ctx.save();
    ctx.lineWidth = 2;

    for (let i = 0; i < total - 1; i += segmentSize) {
      const alpha = 1 - i / total;
      ctx.globalAlpha = alpha * 0.8;
      const escaped = this.navigator.escapeTrajectory && i >= this.navigator.escapeStepIndex;
      ctx.strokeStyle = escaped ? "#3dff7a" : `rgb(${this.pathColor.r}, ${this.pathColor.g}, ${this.pathColor.b})`;

      const from = canvas.place(path[i]);
      const to = canvas.place(path[Math.min(i + segmentSize, total - 1)]);

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    ctx.restore();

    if (this.navigator.pe)
      this.drawOrbitalMarker(
        canvas,
        this.navigator.pe.worldPos,
        "▼",
        "rgba(236, 100, 100, 0.75)",
      );
    if (this.navigator.ap)
      this.drawOrbitalMarker(
        canvas,
        this.navigator.ap.worldPos,
        "▲",
        "rgba(233, 214, 40, 0.75)",
      );
    if (this.navigator.encounterPoint) {
      this.drawOrbitalMarker(canvas, this.navigator.encounterPoint.worldPos, "◆", "#50b6c9");
      const s = canvas.place(this.navigator.encounterPoint.worldPos);
      const ctx = canvas.context;
      ctx.save();
      ctx.fillStyle = "#50b6c9";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.globalAlpha = 0.85;
      ctx.fillText(this.navigator.encounterPoint.dist.toFixed(3) + " wu", s.x, s.y + 10);
      ctx.restore();
    }
  }

  private drawOrbitalMarker(
    canvas: Canvas2d,
    worldPos: Vec2,
    glyph: string,
    color: string,
  ): void {
    const s = canvas.place(worldPos);
    const ctx = canvas.context;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, s.x, s.y);
    ctx.restore();
  }
}
