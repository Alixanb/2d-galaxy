import type { Nullable } from "../core/Type";
import Vec2 from "../core/Vec2";
import type { Canvas2d } from "../systems/Canvas";
import Star from "./Star";

export default class BlackHole extends Star {
  static SIZE_MASS_RATIO = 10;
  mass: number;
  show: boolean;
  glow: Nullable<CanvasGradient> = null;

  constructor(pos: Vec2 = new Vec2(), size: number = 10, show = false) {
    super(pos);

    this.show = show;
    this.size = size;
    this.mass = size / BlackHole.SIZE_MASS_RATIO;
  }

  draw(canvas: Canvas2d) {
    if (!this.show) return;

    const screenPos = canvas.place(this.pos);

    const eventHorizonRadius = this.size;
    const glowRadius = eventHorizonRadius * 1.5;

    canvas.context.save();

    if (!this.glow) {
      this.glow = canvas.context.createRadialGradient(
        screenPos.x,
        screenPos.y,
        eventHorizonRadius,
        screenPos.x,
        screenPos.y,
        glowRadius
      );
      this.glow.addColorStop(0, "rgb(255, 255, 255)");
      this.glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    }

    canvas.context.fillStyle = this.glow;

    canvas.context.beginPath();
    canvas.context.arc(screenPos.x, screenPos.y, glowRadius, 0, Math.PI * 2);
    canvas.context.fill();

    canvas.context.fillStyle = "rgba(0, 0, 0, 1)";
    canvas.context.beginPath();
    canvas.context.arc(
      screenPos.x,
      screenPos.y,
      eventHorizonRadius,
      0,
      Math.PI * 2
    );
    canvas.context.fill();

    canvas.context.restore();
  }
}
