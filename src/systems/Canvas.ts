import Vec2 from "../core/Vec2";

export default class Canvas {
  element: HTMLCanvasElement;
  dimensions: Vec2;
  grid: number;
  ratio: Vec2;
  context: CanvasRenderingContext2D;

  constructor(ref: string, grid: number = 1) {
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
    this.grid = grid;
    this.ratio = this.dimensions.divide(grid);

    const context = this.element.getContext("2d");
    if (!context) throw new Error("Unable to get canvas context");

    context.scale(devicePixelRatio, devicePixelRatio);

    this.context = context;
  }

  place(vec: Vec2) {
    const normalizedX =
      ((vec.x + 1) / 2) * (this.dimensions.x / window.devicePixelRatio || 1);
    const normalizedY =
      ((vec.y + 1) / 2) * (this.dimensions.y / window.devicePixelRatio || 1);
    return new Vec2(normalizedX, normalizedY);
  }

  randomPosition() {
    return new Vec2(Math.random() * 2 - 1, Math.random() * 2 - 1);
  }
}
