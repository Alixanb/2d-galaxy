let topZ = 300;

export function bringToFront(el: HTMLElement) {
  el.style.zIndex = String(++topZ);
}

export function createFloatingWindow(
  title: string,
  width: number,
  minWidth = 200,
  minHeight = 80,
): { panel: HTMLElement; body: HTMLElement } {
  const panel = document.createElement("div");
  panel.className = "draggable-window";
  panel.style.width = `${width}px`;

  const titlebar = document.createElement("div");
  titlebar.className = "window-titlebar";

  const titleEl = document.createElement("span");
  titleEl.className = "window-title";
  titleEl.textContent = title;

  const closeBtn = document.createElement("button");
  closeBtn.className = "panel-close";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => { panel.style.display = "none"; });

  titlebar.appendChild(titleEl);
  titlebar.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "window-body";

  const grip = document.createElement("div");
  grip.className = "window-resize-grip";

  panel.appendChild(titlebar);
  panel.appendChild(body);
  panel.appendChild(grip);

  panel.addEventListener("mousedown", () => bringToFront(panel), true);
  initDrag(titlebar, panel);
  initResize(grip, panel, minWidth, minHeight);

  return { panel, body };
}

function initDrag(titlebar: HTMLElement, panel: HTMLElement) {
  let dragging = false;
  let ox = 0, oy = 0;

  titlebar.addEventListener("mousedown", (e) => {
    if ((e.target as HTMLElement).closest(".panel-close")) return;
    dragging = true;
    const r = panel.getBoundingClientRect();
    panel.style.right = "auto";
    panel.style.left = `${r.left}px`;
    panel.style.top = `${r.top}px`;
    ox = e.clientX - r.left;
    oy = e.clientY - r.top;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    panel.style.left = `${e.clientX - ox}px`;
    panel.style.top = `${e.clientY - oy}px`;
  });

  document.addEventListener("mouseup", () => { dragging = false; });
}

function initResize(grip: HTMLElement, panel: HTMLElement, minW: number, minH: number) {
  let resizing = false;
  let sx = 0, sy = 0, sw = 0, sh = 0;

  grip.addEventListener("mousedown", (e) => {
    resizing = true;
    sx = e.clientX; sy = e.clientY;
    const r = panel.getBoundingClientRect();
    sw = r.width; sh = r.height;
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener("mousemove", (e) => {
    if (!resizing) return;
    panel.style.width  = `${Math.max(minW, sw + e.clientX - sx)}px`;
    panel.style.height = `${Math.max(minH, sh + e.clientY - sy)}px`;
  });

  document.addEventListener("mouseup", () => { resizing = false; });
}
