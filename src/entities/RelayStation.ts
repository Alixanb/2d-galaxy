import Vec2 from "../core/Vec2";
import type { Canvas2d } from "../systems/Canvas";

export default class RelayStation {
  pos: Vec2;
  orbitCenter: Vec2;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  completionRadius = 0.04;

  constructor(orbitCenter: Vec2, orbitRadius: number, orbitAngle: number, orbitSpeed: number) {
    this.orbitCenter = orbitCenter;
    this.orbitRadius = orbitRadius;
    this.orbitAngle = orbitAngle;
    this.orbitSpeed = orbitSpeed;
    this.pos = new Vec2(orbitCenter.x + Math.cos(orbitAngle) * orbitRadius, orbitCenter.y + Math.sin(orbitAngle) * orbitRadius);
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
    const r = 12;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.strokeStyle = "#50b6c9";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
    ctx.beginPath();
    ctx.arc(0, 0, 3 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = "#50b6c9";
    ctx.fill();
    ctx.restore();
  }
}
