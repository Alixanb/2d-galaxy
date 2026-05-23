export function makeCockpitLabel(text: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "cockpit-section-label";
  el.textContent = text;
  return el;
}

export function makeFader(
  label: string, defaultValue: number, min: number, max: number, step: number,
  accent: string, onChange: (v: number) => void, format: (v: number) => string,
  getValue?: () => number
): HTMLElement {
  const row = document.createElement("div");
  row.className = "cockpit-fader";

  const header = document.createElement("div");
  header.className = "fader-header";
  header.appendChild(Object.assign(document.createElement("span"), { className: "fader-label", textContent: label }));
  const val = Object.assign(document.createElement("span"), { className: `fader-value ${accent}`, textContent: format(defaultValue) });
  header.appendChild(val);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "cockpit-slider";
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(defaultValue);
  
  let isDragging = false;
  
  slider.addEventListener("mousedown", () => { isDragging = true; });
  slider.addEventListener("mouseup", () => { isDragging = false; });
  
  slider.addEventListener("input", () => {
    const v = parseFloat(slider.value);
    val.textContent = format(v);
    onChange(v);
  });
  slider.addEventListener("change", () => slider.blur());

  if (getValue) {
    setInterval(() => {
      if (isDragging) return;
      const currentV = getValue();
      if (parseFloat(slider.value) !== currentV) {
        slider.value = String(currentV);
        val.textContent = format(currentV);
      }
    }, 100);
  }

  row.appendChild(header);
  row.appendChild(slider);
  return row;
}
