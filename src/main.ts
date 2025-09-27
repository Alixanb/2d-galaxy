import { loadImage } from "./core/Functions";
import Vec2 from "./core/Vec2";
import BlackHole from "./entities/BlackHole";
import Information from "./entities/Information";
import { RangeInput } from "./entities/Input";
import Ship from "./entities/Ship";
import Canvas from "./systems/Canvas";
import Galaxy from "./systems/Galaxy";
import ToolManager from "./systems/ToolManager";

// IMAGES
const spriteThrusterOffUrl = "/assets/ship.png";
const spriteThrusterOnUrl = "/assets/ship-thrust.png";

// INFORMATIONS BOX
const fpsInfo = new Information("FPS");
const nbStarInfo = new Information("Stars");
const shipSpeedIndo = new Information("Speed", "m/s");

const simulationSpeedRangeInput = new RangeInput(
  "Simulation speed",
  1,
  [0, 10],
  () => {
    SIMULATION_SPEED = simulationSpeedRangeInput.value;
  },
  10
);

const infoManager = new ToolManager("#info", [
  nbStarInfo,
  fpsInfo,
  shipSpeedIndo,
  simulationSpeedRangeInput,
]);

// WORLD
const gargantua = new BlackHole(new Vec2(-0.5, 0), 10);
const gargantua2 = new BlackHole(new Vec2(0.5, 0), 10);
let discovery: Ship | null = null;
const canvas = new Canvas("#app");
const galaxy = new Galaxy(
  canvas,
  [gargantua, gargantua2],
  discovery ?? undefined,
  10000
);

let SIMULATION_SPEED = 1;
let lastTime = 0;
const UPDATE_INTERVAL_MS = 100;
let lastUpdate: number = Date.now();

const FIXED_STEP = 1 / 60; // 60Hz physics
let accumulator = 0;

function animate(time: number) {
  let rawDelta = (time - lastTime) / 1000;
  lastTime = time;

  accumulator += rawDelta * SIMULATION_SPEED;

  const now = Date.now();
  if (now - lastUpdate >= UPDATE_INTERVAL_MS) {
    fpsInfo.set(Math.round(1 / rawDelta)); // use frameDelta, not simDelta
    nbStarInfo.set(galaxy.stars.filter((star) => !star.shouldDestroy).length);
    shipSpeedIndo.set(Math.round((galaxy.ship?.vel?.length() ?? 0) * 1000));

    infoManager.update();
    lastUpdate = now;
  }

  while (accumulator >= FIXED_STEP) {
    galaxy.update(FIXED_STEP);
    accumulator -= FIXED_STEP;
  }

  galaxy.draw();
  requestAnimationFrame(animate);
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
      30,
      true,
      [gargantua, gargantua2]
    );
  })
  .catch((err) => {
    console.error("Failed to load one or more images", err);
  });

requestAnimationFrame(animate);
