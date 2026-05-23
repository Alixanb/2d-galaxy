import Ship from "../Ship";

export class ShipControls {
  keys: { [key: string]: boolean } = {};

  constructor(_ship: Ship) {
    document.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      this.keys[e.key.toLowerCase()] = true;
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  isPressed(key: string): boolean {
    return !!this.keys[key];
  }
}
