import { createFloatingWindow } from "../systems/FloatingWindow";

export function buildDocPanel(): HTMLElement {
  const { panel, body } = createFloatingWindow("MANUAL", 220, 200, 150);
  panel.style.right = "20px";
  panel.style.bottom = "180px";
  panel.style.display = "none";

  body.innerHTML = `
    <div class="doc-minimal">
      <p id="doc-fuel"><strong>FUEL:</strong> L-Ergol (Thrust). <a href="#doc-rcs">Monergol</a> (RCS).</p>
      <p id="doc-rcs"><strong>RCS:</strong> Rotates ship. Uses <a href="#doc-fuel">Monergol</a>.</p>
      <p><strong>MFD:</strong> Navigation screens (Vel/Att/Tel).</p>
      <p><strong>TRAJ:</strong> Gravity path prediction.</p>
      <p><strong>CTRL:</strong> Auto-Stab (Damp). Retro (Brakes).</p>
    </div>
  `;

  body.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = a.getAttribute('href')?.substring(1);
      const target = body.querySelector("#" + targetId) as HTMLElement;
      if (target) {
        target.style.color = "var(--cyan)";
        setTimeout(() => target.style.color = "", 1000);
      }
    });
  });

  document.body.appendChild(panel);
  return panel;
}
