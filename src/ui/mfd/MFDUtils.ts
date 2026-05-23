export const SCALE = 2000;
export const VEL_THRESHOLD = 0.00008;
export const CHART_MAX_POINTS = 120;

export function makeMFDHeader(text: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "mfd-header";
  el.textContent = text;
  return el;
}

export function makeSep(): HTMLElement {
  const el = document.createElement("div");
  el.className = "mfd-sep";
  return el;
}

export function makeDataRow(label: string): { el: HTMLElement; value: HTMLElement } {
  const el = document.createElement("div");
  el.className = "mfd-row";
  const lbl = document.createElement("span");
  lbl.className = "mfd-label";
  lbl.textContent = label;
  const value = document.createElement("span");
  value.className = "mfd-val";
  value.textContent = "—";
  el.appendChild(lbl);
  el.appendChild(value);
  return { el, value };
}

export function makeVelRow(axis: string): { el: HTMLElement; arrow: HTMLElement; value: HTMLElement } {
  const el = document.createElement("div");
  el.className = "mfd-row";
  const label = document.createElement("span");
  label.className = "mfd-label";
  label.textContent = axis;
  const arrow = document.createElement("span");
  arrow.className = "mfd-arrow";
  arrow.textContent = "·";
  const value = document.createElement("span");
  value.className = "mfd-val";
  value.textContent = "0.00";
  el.appendChild(label);
  el.appendChild(arrow);
  el.appendChild(value);
  return { el, arrow, value };
}
