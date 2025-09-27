import Vec2 from "../core/Vec2";
import Canvas from "../systems/Canvas";
import Galaxy from "../systems/Galaxy";
import BlackHole from "./BlackHole";
import Star from "./Star";

export type ShipStatus = "idle" | "thrusting";
export type SpriteStatusKey<T> = {
  [key in ShipStatus]: T;
};

export default class Ship {
  static THRUSTPOWER = 0.001;
  static RADIALPOWER = 0.002;
  static MASS = 3;

  size: number;
  pos: Vec2;
  vel: Vec2 = new Vec2();

  keys: { [key: string]: boolean } = {};
  sprites: SpriteStatusKey<HTMLImageElement>;
  status: ShipStatus = "idle";
  angle: number = 0; // en radian
  angluarVel: number = 0;
  spritesWidthRatio: SpriteStatusKey<number> = {idle: 0, thrusting: 0}; // ratio [idle, thrusting]

  constructor(
    pos: Vec2,
    spriteIdle: HTMLImageElement,
    spriteThrusting: HTMLImageElement,
    size: number
  ) {
    this.pos = pos;

    this.sprites = {
      idle: spriteIdle,
      thrusting: spriteThrusting,
    };
    this.size = size;

    this.spritesWidthRatio["idle"] = spriteIdle.height / spriteIdle.width;
    this.spritesWidthRatio["thrusting"] = spriteThrusting.height / spriteThrusting.width;

    document.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });
  }

  draw(canvas: Canvas, bhPos: Vec2) {
    const screenPos = canvas.place(this.pos);
  
    const width = this.size;
    const height = this.size * this.spritesWidthRatio[this.status];
  
    canvas.context.save();
  
    // translate to CENTER
    canvas.context.translate(screenPos.x, screenPos.y - height);
    
    canvas.context.rotate(this.angle);
  
    // draw with center at origin
    canvas.context.drawImage(
      this.sprites[this.status],
      -width / 2,
      -height / 2,
      width,
      height
    );

    canvas.context.restore();
  }
  

  update(blackholes: BlackHole[], dt: number) {
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

    this.pos = this.pos.add(this.vel.multiply(dt));
    this.angle += this.angluarVel;
  }
}
