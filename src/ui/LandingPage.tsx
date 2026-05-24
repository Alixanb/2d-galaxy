import { useState } from 'preact/hooks';
import type { GameMode } from '../core/GameState';
import './LandingPage.scss';

const MODES: { mode: GameMode; name: string; desc: string }[] = [
  { mode: 'RELAY',       name: 'RELAY',       desc: 'Career · deliver signal packets · earn parts · unlock upgrades' },
  { mode: 'FREE_FLIGHT', name: 'FREE FLIGHT',  desc: 'Creative sandbox · no failure state · full upgrades' },
  { mode: 'DEAD_SIGNAL', name: 'DEAD SIGNAL',  desc: 'Hardcore · fuel out = game over · no respawn' },
];

type Props = { onStart: (mode: GameMode, showBlackholes: boolean) => void };

export default function LandingPage({ onStart }: Props) {
  const [showBH, setShowBH] = useState(true);
  const [hidden, setHidden] = useState(false);

  function start(mode: GameMode) {
    setHidden(true);
    onStart(mode, showBH);
  }

  return (
    <div id="landing" class={hidden ? 'hidden' : ''}>
      <div class="landing-hero">
        <div class="landing-left">
          <h1 class="landing-title">2D<br />Galaxy</h1>
          <p class="landing-sub">Gravitational Simulation</p>
        </div>

        <div class="landing-panel">
          <div class="landing-panel-body">
            <div class="landing-panel-label">Select Mode</div>
            <div class="mode-list">
              {MODES.map(({ mode, name, desc }) => (
                <button key={mode} class="mode-btn" onClick={() => start(mode)}>
                  <span class="mode-name">{name}</span>
                  <span class="mode-desc">{desc}</span>
                </button>
              ))}
            </div>
            <div class="setting setting--toggle">
              <span class="setting-label">Black holes</span>
              <label class="toggle">
                <input
                  type="checkbox"
                  checked={showBH}
                  onChange={(e) => setShowBH(e.currentTarget.checked)}
                />
                <span class="toggle-track" />
              </label>
            </div>
          </div>
        </div>

        <div class="scroll-indicator">
          <span class="scroll-text">Scroll to explore simulation details</span>
          <div class="scroll-icon" />
        </div>
      </div>

      <div class="landing-seo">
        <section class="seo-section">
          <h2>Advanced N-Body Simulation</h2>
          <p>Experience the beauty of orbital mechanics through our highly optimized 2D gravitational simulator. Powered by WebGL, it can handle thousands of stars in real-time, creating stunning visual patterns that emerge from simple physical laws of universal gravitation.</p>
        </section>
        <section class="seo-section">
          <h2>Interactive Galactic Exploration</h2>
          <p>Customize your universe by adjusting stellar density, galactic scale, and temporal flow. Add supermassive black holes to observe how they warp spacetime and dictate the movement of entire star systems within your simulation.</p>
        </section>
        <section class="seo-section">
          <h2>Precision Flight Mechanics</h2>
          <p>Take command of a sophisticated spacecraft. Our simulation features a real-time prediction engine that calculates your future trajectory, allowing you to execute complex gravity assists and navigate the treacherous proximity of singularities.</p>
        </section>
        <section class="seo-section">
          <h2>Simulation Features</h2>
          <div class="feature-grid">
            {(['High-Performance WebGL', 'Dynamic N-Body Physics', 'Integrated MFD Systems', 'Trajectory Prediction'] as const).map((title, i) => (
              <div key={i} class="feature-card">
                <h3>{title}</h3>
              </div>
            ))}
          </div>
        </section>
        <footer class="landing-footer">
          <div class="footer-crosslink">
            <span class="crosslink-label">Explore More Simulations</span>
            <a href="https://evolution.alixan.dev" target="_blank" rel="noopener" class="crosslink-card">
              <div class="crosslink-content">
                <h3>Evolution Simulator</h3>
                <p>Digital ecosystem where artificial life forms compete, survive, and evolve through generations.</p>
              </div>
              <div class="crosslink-arrow">→</div>
            </a>
          </div>
          <p class="footer-copy">© 2026 2D Galaxy Project. An open-source gravitational experiment.</p>
        </footer>
      </div>
    </div>
  );
}
