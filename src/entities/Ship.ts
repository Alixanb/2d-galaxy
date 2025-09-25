import { clamp } from "../core/Utils";
import Vec2 from "../core/Vec2";
import Canvas from "../systems/Canvas";
import Galaxy from "../systems/Galaxy";
import BlackHole from "./Blackhole";
import Star from "./Star";

export type ShipStatus = "idle" | "thrusting";
export type ShipSprite = {
  [key in ShipStatus]: HTMLImageElement;
};

export default class Ship {
  static THRUSTPOWER = 0.0001;
  static RADIALPOWER = 0.002;
  static MASS = 3;

  size: number;
  pos: Vec2;
  vel: Vec2 = new Vec2();

  keys: { [key: string]: boolean } = {};
  sprites: ShipSprite;
  status: ShipStatus = "idle";
  angle: number = 0; // en radian
  angluarVel: number = 0;
  spriteWidthRatio: number;

  constructor(
    pos: Vec2,
    spriteThrusterOff: HTMLImageElement,
    spriteThrusterOn: HTMLImageElement,
    size: number
  ) {
    this.pos = pos;

    this.sprites = {
      idle: spriteThrusterOff,
      thrusting: spriteThrusterOn,
    };
    this.size = size;

    this.spriteWidthRatio = spriteThrusterOff.height / spriteThrusterOff.width;

    document.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });
  }

  draw(canvas: Canvas, bhPos: Vec2) {
    const screenPos = canvas.place(this.pos);

    canvas.context.save();
    canvas.context.globalAlpha = clamp(this.pos.distance(bhPos) * -1, 0.3, 1);

    canvas.context.translate(
      screenPos.x + this.size / 2,
      screenPos.y + (this.size * this.spriteWidthRatio) / 2
    );
    canvas.context.rotate(this.angle);

    canvas.context.drawImage(
      this.sprites[this.status],
      -this.size / 2,
      -this.size / 2,
      this.size,
      this.size * this.spriteWidthRatio
    );

    canvas.context.restore();
  }

  update(blackholes: BlackHole[]) {
    if (this.keys["ArrowRight"]) {
      this.angluarVel += Ship.RADIALPOWER;
    }
    if (this.keys["ArrowLeft"]) this.angluarVel -= Ship.RADIALPOWER;

    if (this.keys["ArrowUp"]) {
      this.status = "thrusting";

      const ax = Ship.THRUSTPOWER * Math.sin(this.angle);
      const ay = -Ship.THRUSTPOWER * Math.cos(this.angle);

      this.vel = this.vel.add(new Vec2(ax, ay));
    } else {
      this.status = "idle";
    }

    for (let blackhole of blackholes) {
      const distance = this.pos.distance(blackhole.pos);

      const forceMagnitude =
        Galaxy.G * (blackhole.mass / distance ** 2) * Star.kGravity * Ship.MASS;

      const directionX = (blackhole.pos.x - this.pos.x) / distance;
      const directionY = (blackhole.pos.y - this.pos.y) / distance;

      const forceVector = new Vec2(
        directionX * forceMagnitude,
        directionY * forceMagnitude
      );

      this.vel = this.vel.add(forceVector);
    }

    this.pos = this.pos.add(this.vel);
    this.angle += this.angluarVel;
  }
}
