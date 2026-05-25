import { render } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import { MFD } from './MFD';
import { SimParamsPanel } from './cockpit/SimParamsPanel';
import { PredictionPanel } from './cockpit/PredictionPanel';
import { FlightControlsPanel } from './cockpit/FlightControlsPanel';
import { HeadingPanel } from './cockpit/HeadingPanel';
import { StatusPanel } from './cockpit/StatusPanel';
import { VelocityPanel } from './cockpit/VelocityPanel';
import type Galaxy from '../systems/Galaxy';
import { systemIdSignal, elapsedSignal, completedCountSignal, totalSystemsSignal } from '../core/gameSignals';
import './CockpitHUD.scss';

interface Props {
  galaxy: Galaxy;
  getSimSpeed: () => number;
  setSimSpeed: (v: number) => void;
  onPause: (paused: boolean) => void;
  onOpenMap: () => void;
  onOpenTech: () => void;
}

export function CockpitHUD({ galaxy, getSimSpeed, setSimSpeed, onPause, onOpenMap, onOpenTech }: Props) {
  const metaRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame: number;
    const updateMeta = () => {
      if (metaRef.current) {
        const secs = elapsedSignal.peek();
        const mm = String(Math.floor(secs / 60)).padStart(2, '0');
        const ss = String(secs % 60).padStart(2, '0');
        metaRef.current.textContent = `FLIGHT · ${systemIdSignal.peek()}  ·  ${mm}:${ss}  ·  PKT ${completedCountSignal.peek()}/${totalSystemsSignal.peek()}`;
      }
      frame = requestAnimationFrame(updateMeta);
    };
    frame = requestAnimationFrame(updateMeta);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <div class="corner corner--tl" />
      <div class="corner corner--tr" />
      <div class="top-bar">
        <span class="top-bar__dot">●</span>
        <span class="top-bar__meta" ref={metaRef} />
      </div>

      <div class="left-panel">
        <div class="left-top">
          <VelocityPanel />
        </div>
        <div class="left-bottom">
          <div class="left-mfd">
            <MFD galaxy={galaxy} />
          </div>
          <div class="left-sim">
            <SimParamsPanel getSimSpeed={getSimSpeed} setSimSpeed={setSimSpeed} />
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="right-top">
          <StatusPanel />
        </div>
        <div class="right-mid">
          <button class="nav-btn" title="Return Home" onClick={() => { window.location.href = '/index.html'; }}>H</button>
          <button class="nav-btn" title="Galaxy Map" onClick={onOpenMap}>M</button>
          <button class="nav-btn" title="Tech Tree" onClick={onOpenTech}>T</button>
          <button class="nav-btn" title="Open Manual" onClick={() => window.open('/docs.html', '_blank')}>?</button>
        </div>
        <div class="right-bottom">
          <HeadingPanel galaxy={galaxy} />
          <FlightControlsPanel galaxy={galaxy} onPause={onPause} />
        </div>
      </div>

      <div class="pred-bar-slot">
        <PredictionPanel galaxy={galaxy} />
      </div>
    </>
  );
}

export function mountCockpitHUD(
  container: HTMLElement,
  galaxy: Galaxy,
  getSimSpeed: () => number,
  setSimSpeed: (v: number) => void,
  onPause: (paused: boolean) => void,
  onOpenMap: () => void,
  onOpenTech: () => void,
): void {
  render(
    <CockpitHUD galaxy={galaxy} getSimSpeed={getSimSpeed} setSimSpeed={setSimSpeed}
      onPause={onPause} onOpenMap={onOpenMap} onOpenTech={onOpenTech} />,
    container,
  );
}
