import { loadImage } from "./core/Functions";
import Vec2 from "./core/Vec2";
import BlackHole from "./entities/Blackhole";
import Ship from "./entities/Ship";
import Canvas from "./systems/Canvas";
import Galaxy from "./systems/Galaxy";

const spriteThrusterOffUrl = "../public/ship.png";
const spriteThrusterOnUrl = "../public/ship-thrust.png";

const gargantua = new BlackHole(new Vec2(0, 0), 50);
// const gargantua2 = new BlackHole(new Vec2(0.5, 0), 50)
let discovery = undefined;
const canvas = new Canvas("#app");
const galaxy = new Galaxy(canvas, [gargantua], discovery, 50000);

const fps = 60;
const interval = 1000 / fps;
let lastTime = 0;

export function animate(time: number) {
  const delta = time - lastTime;
  if (delta >= interval) {
    lastTime = time - (delta % interval);

    galaxy.update();
    galaxy.draw();
  }
}

Promise.all([loadImage(spriteThrusterOffUrl), loadImage(spriteThrusterOnUrl)])
  .then(([spriteThrusterOff, spriteThrusterOn]) => {
    console.log(
      "Both images are ready!",
      spriteThrusterOffUrl,
      spriteThrusterOnUrl
    );

    galaxy.ship = new Ship(
      new Vec2(0.8, 0.8),
      spriteThrusterOff,
      spriteThrusterOn,
      50
    );
  })
  .catch((err) => {
    console.error("Failed to load one or more images", err);
  });

requestAnimationFrame(animate);
