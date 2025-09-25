import Vec2 from "../core/Vec2";
import Canvas from "../systems/Canvas";
import Star from "./Star";

export default class BlackHole extends Star {
  static SIZE_MASS_RATIO = 10;
  mass: number;

  constructor(pos: Vec2 = new Vec2(), size: number = 10) {
    super(pos);

    this.size = size;
    this.mass = size / BlackHole.SIZE_MASS_RATIO;
  }

  draw(canvas: Canvas) {
    const screenPos = canvas.place(this.pos);
    const ctx = canvas.context;

    const eventHorizonRadius = this.size;
    const glowRadius = eventHorizonRadius * 1.5;

    ctx.save();

    const outerGlow = ctx.createRadialGradient(
      screenPos.x,
      screenPos.y,
      eventHorizonRadius,
      screenPos.x,
      screenPos.y,
      glowRadius
    );
    outerGlow.addColorStop(0, "rgb(255, 255, 255)");
    outerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, eventHorizonRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
