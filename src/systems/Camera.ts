import Vec2 from "../core/Vec2";

export default class Camera {
  pos: Vec2;
  zoom: number;

  constructor() {
    this.pos = new Vec2();
    this.zoom = 1;
  }
}
