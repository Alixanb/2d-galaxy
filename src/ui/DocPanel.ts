import { createFloatingWindow } from "../systems/FloatingWindow";

export function buildDocPanel(): HTMLElement {
  const { panel, body } = createFloatingWindow("FLIGHT MANUAL", 320, 280, 200);
  panel.style.right = "20px";
  panel.style.bottom = "180px";
  panel.style.display = "none";

  body.innerHTML = `
    <div class="doc-container">
      <section>
        <h3>COMMANDS</h3>
        <ul class="doc-list">
          <li><strong>ARROWS:</strong> Up (Thrust), Left/Right (Rotate)</li>
          <li><strong>Z / S:</strong> Increase / Decrease Thrust Power</li>
          <li><strong>Q / E:</strong> Increase / Decrease RCS Rate</li>
        </ul>
      </section>

      <section id="doc-fuel">
        <h3>PROPELLANTS</h3>
        <p><strong>L-ERGOL:</strong> Liquid fuel for the main engine. Essential for gaining speed.</p>
        <p><strong>MONO:</strong> <a href="#doc-rcs">Monergol</a>. High-pressure gas used by the <a href="#doc-rcs">RCS</a> for rotation.</p>
      </section>

      <section id="doc-rcs">
        <h3>RCS (Rotation)</h3>
        <p>Reaction Control System. Uses <strong>Monergol</strong> to rotate the ship. Higher RCS Rate means faster turns but higher fuel consumption.</p>
      </section>

      <section id="doc-mfd">
        <h3>MFD (Displays)</h3>
        <p>Multi-Function Displays. Use the top/bottom buttons (OSBs) to switch views:</p>
        <ul class="doc-list">
          <li><strong>VEL:</strong> Detailed velocity vectors and speed.</li>
          <li><strong>ATT:</strong> Ship orientation relative to the horizon.</li>
          <li><strong>TEL:</strong> Star count and performance charts.</li>
        </ul>
      </section>

      <section id="doc-traj">
        <h3>TRAJECTORY</h3>
        <p>Real-time path prediction. It calculates your future position based on current velocity and the gravitational pull of nearby black holes.</p>
      </section>

      <section id="doc-ctrl">
        <h3>FLIGHT SYSTEMS</h3>
        <p><strong>AUTO-STAB:</strong> Flight computer uses RCS to automatically stop any rotation.</p>
        <p><strong>RETRO-BURN:</strong> Automatically aligns the ship against its velocity vector and fires the main engine to come to a full stop.</p>
      </section>
    </div>
  `;

  // Internal links and highlighting
  body.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = a.getAttribute('href')?.substring(1);
      const target = body.querySelector("#" + targetId) as HTMLElement;
      if (target) {
        // Use scrollTop on the body (the scrollable container) instead of scrollIntoView
        // to avoid scrolling the entire browser window.
        body.scrollTo({
          top: target.offsetTop - 10,
          behavior: 'smooth'
        });
        target.classList.add("doc-highlight");
        setTimeout(() => target.classList.remove("doc-highlight"), 2000);
      }
    });
  });

  document.body.appendChild(panel);
  return panel;
}
