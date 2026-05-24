import { render } from 'preact';
import { useState } from 'preact/hooks';
import type Galaxy from '../../systems/Galaxy';
import './PredictionPanel.scss';

function PredictionPanel({ galaxy }: { galaxy: Galaxy }) {
  const [active, setActive] = useState(false);

  function toggle() {
    const ship = galaxy.ship;
    if (!ship) return;
    ship.showPath = !ship.showPath;
    setActive(ship.showPath);
  }

  return (
    <div class="pred-section">
      <div class="cockpit-section-label">TRAJECTORY</div>
      <button class={`pred-btn${active ? ' pred-active' : ''}`} onClick={toggle}>
        PREDICTION SYS
      </button>
    </div>
  );
}

export function mountPredictionPanel(container: HTMLElement, galaxy: Galaxy): void {
  render(<PredictionPanel galaxy={galaxy} />, container);
}
