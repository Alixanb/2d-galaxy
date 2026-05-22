import Vec2 from "../core/Vec2";
import type { Canvas2d } from "../systems/Canvas";
import Star from "./Star";

export default class BlackHole extends Star {
  static SIZE_MASS_RATIO = 10;
  mass: number;
  show: boolean;

  constructor(pos: Vec2 = new Vec2(), size: number = 10, show = false) {
    super(pos);

    this.show = show;
    this.size = size;
    this.mass = size / BlackHole.SIZE_MASS_RATIO;
  }

  draw(canvas: Canvas2d) {
    if (!this.show) return;

    const screenPos = canvas.place(this.pos);
    const ctx = canvas.context;

    ctx.save();

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, this.size * 2.2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(80, 182, 201, 0.12)";
    ctx.lineWidth = this.size * 0.8;
    ctx.stroke();

    // Middle ring
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, this.size * 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(80, 182, 201, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner ring (event horizon border)
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, this.size * 1.1, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(80, 182, 201, 0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Core — filled with background color to "erase" stars behind it
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = "#2b201f";
    ctx.fill();

    ctx.restore();
  }
}
