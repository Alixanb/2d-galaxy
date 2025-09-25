export default class Vec2 {
  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  add(vec2: Vec2) {
    return new Vec2(this.x + vec2.x, this.y + vec2.y);
  }

  sub(vec2: Vec2) {
    return new Vec2(this.x - vec2.x, this.y - vec2.y);
  }

  multiply(scalar: number): Vec2;
  multiply(vec: Vec2): Vec2;

  multiply(arg: number | Vec2) {
    if (typeof arg === "number") {
      return new Vec2(this.x * arg, this.y * arg);
    }
    return new Vec2(this.x * arg.x, this.y * arg.y);
  }

  divide(scalar: number): Vec2;
  divide(vec: Vec2): Vec2;

  divide(arg: number | Vec2) {
    if (typeof arg === "number") {
      return new Vec2(this.x / arg, this.y / arg);
    }
    return new Vec2(this.x / arg.x, this.y / arg.y);
  }

  distance(vec: Vec2) {
    return Math.sqrt((vec.x - this.x) ** 2 + (vec.y - this.y) ** 2);
  }

  length() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }

  normalize() {
    const len = this.length();
    if (len === 0) return new Vec2(0, 0);
    return new Vec2(this.x / len, this.y / len);
  }
}
