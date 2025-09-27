import { clamp } from "../core/Utils";
import BlackHole from "../entities/BlackHole";
import Ship from "../entities/Ship";
import Star from "../entities/Star";
import Canvas from "./Canvas";

export default class Galaxy {
  static G = 6.6743e-11;

  canvas: Canvas;
  stars: Star[];
  blackholes: BlackHole[];
  ship?: Ship;
  size: number;

  constructor(
    canvas: Canvas,
    blackholes: BlackHole[],
    ship?: Ship,
    nStar: number = 100,
    size: number = 0.7
  ) {
    this.canvas = canvas;
    this.stars = [];
    this.blackholes = blackholes;
    this.ship = ship;

    this.size = clamp(size, 0.1, 2);

    this.createStars(nStar);
  }

  createStars(n: number) {
    for (let i = 0; i < n; i++) {
      const pos = this.canvas.randomCirclePosition(this.size);
      const size = Math.random() * Star.MAX_SIZE;
      const vel = Star.getVelocity(pos, this.blackholes[0]);

      this.stars.push(new Star(pos, size, vel));
    }
  }

  update(dt: number) {
    if (this.ship) {
      this.ship.update(this.blackholes, dt);
    }

    this.stars = this.stars.filter((star) => !star.shouldDestroy);

    let maxVel = 0;

    for (let star of this.stars) {
      star.update(this.blackholes, dt);
      if (star.vel.length() > maxVel) {
        maxVel = star.vel.length();
      }
    }

    Star.MAX_VELOCITY = maxVel;
  }

  draw() {
    this.canvas.context.clearRect(
      0,
      0,
      this.canvas.dimensions.x,
      this.canvas.dimensions.y
    );

    this.stars.forEach((s) => s.draw(this.canvas));
    this.blackholes.forEach((b) => b.draw(this.canvas));
    if (this.ship) this.ship.draw(this.canvas, this.blackholes[0].pos);
  }
}
