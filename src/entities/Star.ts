import { clamp } from "../core/Utils";
import Vec2 from "../core/Vec2";
import Canvas from "../systems/Canvas";
import Galaxy from "../systems/Galaxy";
import BlackHole from "./BlackHole";

export default class Star {
  static kGravity = 5000;
  static kInitVelocity = 80;
  static MAX_VELOCITY = 0.005; // Theoretical max velocity for a star, color will be calculted depending on that

  pos: Vec2;
  vel: Vec2;
  size: number;
  mass: number;
  shouldDestroy: boolean = false;

  constructor(pos: Vec2, size: number = 5, vel: Vec2 = new Vec2()) {
    this.pos = pos;
    this.vel = vel;
    this.size = size;

    this.mass = size;
  }

  update(blackholes: BlackHole[]) {
    this.pos = this.pos.add(this.vel);

    for (let blackhole of blackholes) {
      const distance = this.pos.distance(blackhole.pos);

      if (distance > blackhole.size / 600) {
        const forceMagnitude =
          Galaxy.G * (blackhole.mass / distance ** 2) * Star.kGravity;

        const directionX = (blackhole.pos.x - this.pos.x) / distance;
        const directionY = (blackhole.pos.y - this.pos.y) / distance;

        const forceVector = new Vec2(
          directionX * forceMagnitude,
          directionY * forceMagnitude
        );

        this.vel = this.vel.add(forceVector);
      } else {
        this.shouldDestroy = true;
      }
    }
  }

  draw(canvas: Canvas) {
    const screenPos = canvas.place(this.pos);

    const glow = canvas.context.createRadialGradient(
      screenPos.x,
      screenPos.y,
      0,
      screenPos.x,
      screenPos.y,
      this.size
    );
    glow.addColorStop(0, Star.getColor(this.vel));
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");

    canvas.context.fillStyle = glow;
    canvas.context.beginPath();
    canvas.context.arc(screenPos.x, screenPos.y, this.size, 0, Math.PI * 2);
    canvas.context.fill();
  }

  static getColor(vel: Vec2): string {
    const COLOR_MULTIPLICATOR = 1;

    const value = clamp(
      Math.round(
        (vel.length() / this.MAX_VELOCITY) * 255 * COLOR_MULTIPLICATOR
      ),
      0,
      255
    );
    const hex = value.toString(16).padStart(2, "0");
    return `#${hex + hex + hex}`;
  }

  static getVelocity(pos: Vec2, blackhole: BlackHole) {
    const M = blackhole.mass;
    const randFactor = 0.1;

    const rVec = pos.sub(blackhole.pos);
    const r = rVec.length();
    if (r === 0) return new Vec2(0, 0);

    const speed = Math.sqrt((Galaxy.G * M) / r) * Star.kInitVelocity;
    const delta = (Math.random() * 2 - 1) * randFactor;
    const finalSpeed = speed * (1 + delta);

    const tangent = new Vec2(-rVec.y, rVec.x).normalize();

    return tangent.multiply(finalSpeed);
  }
}
