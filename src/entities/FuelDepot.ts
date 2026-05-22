import Vec2 from "../core/Vec2";
import type { Canvas2d } from "../systems/Canvas";

export type FuelType = 'liquid-ergol' | 'monergol';

const COLORS: Record<FuelType, string> = {
  'liquid-ergol': '#50b6c9',
  'monergol': '#b06fd8',
};

const RADII: Record<FuelType, number> = {
  'liquid-ergol': 5,
  'monergol': 3.5,
};

export default class FuelDepot {
  pos: Vec2;
  type: FuelType;
  amount: number;
  collected: boolean = false;
  collectRadius: number = 0.035;

  private orbitCenter: Vec2;
  private orbitRadius: number;
  private orbitAngle: number;
  private orbitSpeed: number;

  constructor(
    orbitCenter: Vec2,
    orbitRadius: number,
    startAngle: number,
    type: FuelType,
    amount: number,
    orbitSpeed: number = 0.3
  ) {
    this.orbitCenter = orbitCenter.clone();
    this.orbitRadius = orbitRadius;
    this.orbitAngle = startAngle;
    this.orbitSpeed = orbitSpeed;
    this.type = type;
    this.amount = amount;
    this.pos = this.computePos();
  }

  private computePos(): Vec2 {
    return new Vec2(
      this.orbitCenter.x + Math.cos(this.orbitAngle) * this.orbitRadius,
      this.orbitCenter.y + Math.sin(this.orbitAngle) * this.orbitRadius
    );
  }

  update(dt: number): void {
    this.orbitAngle += this.orbitSpeed * dt;
    this.pos = this.computePos();
  }

  draw(canvas: Canvas2d, shipPos?: Vec2): void {
    const sp = canvas.place(this.pos);
    const ctx = canvas.context;
    const r = RADII[this.type];
    const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 600);
    const color = COLORS[this.type];

    ctx.save();

    // Approach indicator ring when ship is nearby
    if (shipPos) {
      const dist = this.pos.distance(shipPos);
      if (dist < this.collectRadius * 4) {
        const edgeSp = canvas.place(new Vec2(this.pos.x + this.collectRadius, this.pos.y));
        const ringPx = Math.abs(edgeSp.x - sp.x);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, ringPx, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.globalAlpha = (1 - dist / (this.collectRadius * 4)) * 0.5;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Outer glow
    ctx.globalAlpha = 0.18 * pulse;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, r * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Core circle
    ctx.globalAlpha = 0.9 * pulse;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Bright center dot
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, r * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }
}
