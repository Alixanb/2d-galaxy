import Vec2 from "../core/Vec2";

export default class Canvas {
  element: HTMLCanvasElement;
  dimensions: Vec2;
  height: number;
  ratio: number;
  context: CanvasRenderingContext2D;

  constructor(ref: string, height: number = 1) {
    const element = document.querySelector<HTMLCanvasElement>(ref);
    if (!element)
      throw new Error("Unable to fetch canvas element with string " + ref);

    this.element = element;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    this.element.width = displayWidth * devicePixelRatio;
    this.element.height = displayHeight * devicePixelRatio;

    this.element.style.width = displayWidth + "px";
    this.element.style.height = displayHeight + "px";

    this.dimensions = new Vec2(this.element.width, this.element.height);
    this.ratio = this.dimensions.x / this.dimensions.y;

    this.height = height;

    const context = this.element.getContext("2d");
    if (!context) throw new Error("Unable to get canvas context");

    context.scale(devicePixelRatio, devicePixelRatio);

    this.context = context;
  }

  place(vec: Vec2) {
    const normalizedY =
      ((vec.y + 1) / 2) * (this.dimensions.y / window.devicePixelRatio);
  
    const normalizedX =
      ((vec.x + this.ratio) / (2 * this.ratio)) *
      (this.dimensions.x / window.devicePixelRatio);
  
    return new Vec2(normalizedX, normalizedY);
  }
  

  randomPosition() {
    return new Vec2(Math.random() * 2 - 1, Math.random() * 2 - 1);
  }

  randomCirclePosition(radius: number = 1) {
    const theta = Math.random() * (Math.PI * 2)
    const u = Math.random();
    const r = Math.sqrt(u) ** 2 * radius;

    return new Vec2(
      Math.sin(theta) * r,
      Math.cos(theta) * r
    )
  }
}
