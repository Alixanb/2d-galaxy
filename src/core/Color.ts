import { interpolate } from "./Utils";

export default class Color {
  r: number;
  g: number;
  b: number;
  a: number;

  constructor(r: number, g: number, b: number, a: number = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  getHex() {
    return (
      "#" +
      this.r.toString(16) +
      this.g.toString(16) +
      this.b.toString(16) +
      this.a.toString(16)
    );
  }

  getRGBA() {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }
}

type GradienElement = {
  value: number;
  color: Color;
};

export class Gradient {
  stops: GradienElement[];

  constructor(...color: GradienElement[]) {
    this.stops = color;
  }

  get(n: number) {
    if (n < 0 || n > 1) throw new Error("n must be between 0 and 1");

    let [up, down] = this.getNearest(n);
    return this.blend(up, down, n);
  }

  blend(down: GradienElement, up: GradienElement, coefficient: number = 0.5) {
    return new Color(
      interpolate(down.color.r, up.color.r, coefficient),
      interpolate(down.color.g, up.color.g, coefficient),
      interpolate(down.color.b, up.color.b, coefficient),
      interpolate(down.color.a, up.color.a, coefficient)
    );
  }

  getNearest(n: number): [GradienElement, GradienElement] {
    let down: GradienElement = this.stops[0];
    let up: GradienElement = this.stops[0];

    for (let stop of this.stops) {
      if (stop.value <= n) {
        if (stop.value > down.value) {
          down = stop;
        }
      } else {
        if (stop.value < up.value) {
          up = stop;
        }
      }
    }

    return [up, down];
  }
}
