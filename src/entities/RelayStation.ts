import Vec2 from "../core/Vec2";
import type { Canvas2d } from "../systems/Canvas";
import { drawRelayStation, RELAY_SIZE, type TidalLevel } from "../sprites/relay";

export default class RelayStation {
  pos: Vec2;
  orbitCenter: Vec2;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  completionRadius = 0.04;
  tidalLevel: TidalLevel;
  private spriteCanvas: HTMLCanvasElement;

  constructor(orbitCenter: Vec2, orbitRadius: number, orbitAngle: number, orbitSpeed: number, tidalLevel: TidalLevel = 0) {
    this.orbitCenter = orbitCenter;
    this.orbitRadius = orbitRadius;
    this.orbitAngle = orbitAngle;
    this.orbitSpeed = orbitSpeed;
    this.tidalLevel = tidalLevel;
    this.pos = new Vec2(orbitCenter.x + Math.cos(orbitAngle) * orbitRadius, orbitCenter.y + Math.sin(orbitAngle) * orbitRadius);

    this.spriteCanvas = document.createElement('canvas');
    this.spriteCanvas.width = RELAY_SIZE;
    this.spriteCanvas.height = RELAY_SIZE;
    const ctx = this.spriteCanvas.getContext('2d')!;
    drawRelayStation(ctx, RELAY_SIZE, this.tidalLevel);
  }

  update(dt: number): void {
    this.orbitAngle += this.orbitSpeed * dt;
    this.pos = new Vec2(this.orbitCenter.x + Math.cos(this.orbitAngle) * this.orbitRadius, this.orbitCenter.y + Math.sin(this.orbitAngle) * this.orbitRadius);
  }

  projectPosition(steps: number, dt: number): Vec2 {
    const a = this.orbitAngle + this.orbitSpeed * steps * dt;
    return new Vec2(this.orbitCenter.x + Math.cos(a) * this.orbitRadius, this.orbitCenter.y + Math.sin(a) * this.orbitRadius);
  }

  draw(canvas: Canvas2d): void {
    const ctx = canvas.context;
    const s = canvas.place(this.pos);
    ctx.save();
    ctx.translate(s.x, s.y);
    const visualSize = 96; // 32 * 3
    ctx.drawImage(this.spriteCanvas, -visualSize / 2, -visualSize / 2, visualSize, visualSize);
    ctx.restore();
  }
}
