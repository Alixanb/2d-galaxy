import { clamp } from "../core/Utils";
import Vec2 from "../core/Vec2";
import Canvas from "../systems/Canvas";
import Galaxy from "../systems/Galaxy";
import BlackHole from "./BlackHole";

export default class Star {
  static kGravity = 8.5 * 10e4;
  static kInitVelocity = 7.5 * 10e2;
  static MAX_VELOCITY = 10000; // Theoretical max velocity for a star, color will be calculted depending on that
  static MAX_SIZE = 1.5;

  pos: Vec2;
  vel: Vec2;
  size: number;
  mass: number;
  shouldDestroy: boolean = false;

  constructor(pos: Vec2, size: number = 1, vel: Vec2 = new Vec2()) {
    this.pos = pos;
    this.vel = vel;
    this.size = size;

    this.mass = size ** 3; //
  }

  update(blackholes: BlackHole[], dt: number) {
    for (let blackhole of blackholes) {
      const distance = this.pos.distance(blackhole.pos);

      if (distance > blackhole.size / 600) {
        const forceMagnitude =
          ((Galaxy.G * blackhole.mass * this.mass) / distance ** 2) *
          Star.kGravity;

        const directionX = (blackhole.pos.x - this.pos.x) / distance;
        const directionY = (blackhole.pos.y - this.pos.y) / distance;

        const forceVector = new Vec2(
          directionX * forceMagnitude,
          directionY * forceMagnitude
        );

        this.vel = this.vel.add(forceVector.divide(this.mass));
      } else {
        this.shouldDestroy = true;
      }
    }

    this.pos = this.pos.add(this.vel.multiply(dt));
  }

  draw(canvas: Canvas) {
    const screenPos = canvas.place(this.pos);

    canvas.context.fillStyle = Star.getColor(this.vel);
    canvas.context.beginPath();
    canvas.context.arc(screenPos.x, screenPos.y, this.size, 0, Math.PI * 2);
    canvas.context.fill();
  }

  static getColor(vec: Vec2): string {
    const COLOR_MULTIPLICATOR = 1;

    const value = clamp(
      Math.round(
        (vec.length() / this.MAX_VELOCITY) * 255 * COLOR_MULTIPLICATOR
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
