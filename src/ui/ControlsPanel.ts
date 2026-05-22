import Ship from "../entities/Ship";
import Galaxy from "../systems/Galaxy";
import { createFloatingWindow } from "../systems/FloatingWindow";

export function buildControlsPanel(
  galaxy: Galaxy,
  initialPath: boolean,
  getSpeed: () => number,
  setSpeed: (v: number) => void
): void {
  const { panel, body } = createFloatingWindow("CONTROLS", 240, 200, 80);
  panel.style.left = "20px";
  panel.style.bottom = "20px";

  const thrustDefault = Ship.DEFAULT_THRUSTPOWER;
  const rotDefault = Ship.DEFAULT_RADIALPOWER;

  body.appendChild(
    makeToggleRow("PATH", initialPath, "green", (checked) => {
      if (galaxy.ship) galaxy.ship.showPath = checked;
    })
  );

  body.appendChild(
    makeSliderRow("SIM SPEED", getSpeed(), 0.1, 10, 0.1, "cyan",
      (v) => setSpeed(v),
      (v) => `${v.toFixed(1)}×`
    )
  );

  body.appendChild(
    makeSliderRow("THRUST", 1, 0.5, 5, 0.1, "yellow",
      (v) => { Ship.THRUSTPOWER = thrustDefault * v; },
      (v) => `${v.toFixed(1)}×`
    )
  );

  body.appendChild(
    makeSliderRow("ROTATION", 1, 0.5, 5, 0.1, "yellow",
      (v) => { Ship.RADIALPOWER = rotDefault * v; },
      (v) => `${v.toFixed(1)}×`
    )
  );

  body.appendChild(
    makeSliderRow("PATH STEPS", 3000, 500, 8000, 500, "cyan",
      (v) => { if (galaxy.ship) galaxy.ship.predictionInteration = v; },
      (v) => `${Math.round(v)}`
    )
  );

  panel.style.display = "block";
  document.body.appendChild(panel);
}

function makeToggleRow(
  label: string,
  defaultOn: boolean,
  _colorClass: string,
  onChange: (checked: boolean) => void
): HTMLElement {
  const row = document.createElement("div");
  row.className = "ctrl-row";

  const header = document.createElement("div");
  header.className = "ctrl-header";

  const lbl = document.createElement("span");
  lbl.className = "ctrl-label";
  lbl.textContent = label;

  const toggle = document.createElement("label");
  toggle.className = "toggle";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = defaultOn;

  const track = document.createElement("span");
  track.className = "toggle-track";

  toggle.appendChild(input);
  toggle.appendChild(track);
  input.addEventListener("change", () => onChange(input.checked));

  header.appendChild(lbl);
  header.appendChild(toggle);
  row.appendChild(header);

  return row;
}

function makeSliderRow(
  label: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  colorClass: string,
  onChange: (v: number) => void,
  format: (v: number) => string
): HTMLElement {
  const row = document.createElement("div");
  row.className = "ctrl-row";

  const header = document.createElement("div");
  header.className = "ctrl-header";

  const lbl = document.createElement("span");
  lbl.className = "ctrl-label";
  lbl.textContent = label;

  const val = document.createElement("span");
  val.className = `ctrl-value ${colorClass}`;
  val.textContent = format(defaultValue);

  header.appendChild(lbl);
  header.appendChild(val);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(defaultValue);
  slider.addEventListener("input", () => {
    const v = parseFloat(slider.value);
    val.textContent = format(v);
    onChange(v);
  });

  row.appendChild(header);
  row.appendChild(slider);

  return row;
}
