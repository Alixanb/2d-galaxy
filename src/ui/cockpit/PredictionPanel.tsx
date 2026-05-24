import { render } from 'preact';
import { useState, useRef } from 'preact/hooks';
import type Galaxy from '../../systems/Galaxy';
import './PredictionPanel.scss';

function PredictionPanel({ galaxy }: { galaxy: Galaxy }) {
  const [active, setActive] = useState(false);
  const startedAt = useRef<number | null>(null);
  const [eta, setEta] = useState('--:--');

  function toggle() {
    const ship = galaxy.ship;
    if (!ship) return;
    ship.showPath = !ship.showPath;
    if (ship.showPath) {
      startedAt.current = Date.now();
      const iv = setInterval(() => {
        if (!startedAt.current) { clearInterval(iv); return; }
        const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
        const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const ss = String(elapsed % 60).padStart(2, '0');
        setEta(`${mm}:${ss}`);
        if (!galaxy.ship?.showPath) clearInterval(iv);
      }, 1000);
    } else {
      startedAt.current = null;
      setEta('--:--');
    }
    setActive(ship.showPath);
  }

  return (
    <button class={`pred-bar${active ? ' pred-bar--active' : ''}`} onClick={toggle}>
      <span class="pred-bar__stripe" aria-hidden="true" />
      <span class="pred-bar__text">
        PREDICTION SYS
        <span class="pred-bar__eta">{active ? `  ETA ${eta}` : ''}</span>
      </span>
    </button>
  );
}

export function mountPredictionPanel(container: HTMLElement, galaxy: Galaxy): void {
  render(<PredictionPanel galaxy={galaxy} />, container);
}
