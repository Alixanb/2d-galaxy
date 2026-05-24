import { render, createRef } from 'preact';
import { forwardRef, useImperativeHandle } from 'preact/compat';
import { useRef } from 'preact/hooks';
import { MFD, type MFDData, type MFDRef } from './MFD';
import { SimParamsPanel } from './cockpit/SimParamsPanel';
import { PredictionPanel } from './cockpit/PredictionPanel';
import { FlightControlsPanel, type FlightControlsPanelRef } from './cockpit/FlightControlsPanel';
import { HeadingPanel } from './cockpit/HeadingPanel';
import { StatusPanel, type StatusPanelRef } from './cockpit/StatusPanel';
import { VelocityPanel } from './cockpit/VelocityPanel';
import type Galaxy from '../systems/Galaxy';
import type { RefObject } from 'preact';
import './CockpitHUD.scss';

export interface CockpitHUDRef {
  update(data: MFDData): void;
  updateStatusGauges(vx: number, vy: number, le: number, leMax: number, mo: number, moMax: number, decay: number | null, decayMax: number | null): void;
  setPaused(paused: boolean): void;
}

interface Props {
  galaxy: Galaxy;
  getSimSpeed: () => number;
  setSimSpeed: (v: number) => void;
  onPause: (paused: boolean) => void;
  onOpenMap: () => void;
  onOpenTech: () => void;
}

const CockpitHUD = forwardRef<CockpitHUDRef, Props>(
  ({ galaxy, getSimSpeed, setSimSpeed, onPause, onOpenMap, onOpenTech }, ref) => {
    const startTime = useRef(Date.now());
    const metaRef = useRef<HTMLSpanElement>(null);
    const mfdRef = useRef<MFDRef>(null);
    const flightRef = useRef<FlightControlsPanelRef>(null);
    const statusRef = useRef<StatusPanelRef>(null);

    useImperativeHandle(ref, () => ({
      update(data: MFDData) {
        const secs = Math.floor((Date.now() - startTime.current) / 1000);
        const mm = String(Math.floor(secs / 60)).padStart(2, '0');
        const ss = String(secs % 60).padStart(2, '0');
        if (metaRef.current) metaRef.current.textContent = `FLIGHT · ${data.systemId}  ·  ${mm}:${ss}  ·  PKT ${data.completedCount}/${data.totalSystems}`;
        mfdRef.current?.update(data);
        flightRef.current?.update();
      },
      updateStatusGauges(vx, vy, le, leMax, mo, moMax, decay, decayMax) {
        statusRef.current?.draw(vx, vy, le, leMax, mo, moMax, decay, decayMax);
      },
      setPaused(paused) { flightRef.current?.setPaused(paused); },
    }));

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
              <MFD ref={mfdRef} galaxy={galaxy} />
            </div>
            <div class="left-sim">
              <SimParamsPanel getSimSpeed={getSimSpeed} setSimSpeed={setSimSpeed} />
            </div>
          </div>
        </div>

        <div class="right-panel">
          <div class="right-top">
            <StatusPanel ref={statusRef} />
          </div>
          <div class="right-mid">
            <button class="nav-btn" title="Return Home" onClick={() => { window.location.href = '/index.html'; }}>H</button>
            <button class="nav-btn" title="Galaxy Map" onClick={onOpenMap}>M</button>
            <button class="nav-btn" title="Tech Tree" onClick={onOpenTech}>T</button>
            <button class="nav-btn" title="Open Manual" onClick={() => window.open('/docs.html', '_blank')}>?</button>
          </div>
          <div class="right-bottom">
            <HeadingPanel galaxy={galaxy} />
            <FlightControlsPanel ref={flightRef} galaxy={galaxy} onPause={onPause} />
          </div>
        </div>

        <div class="pred-bar-slot">
          <PredictionPanel galaxy={galaxy} />
        </div>
      </>
    );
  }
);

export function mountCockpitHUD(
  container: HTMLElement,
  galaxy: Galaxy,
  getSimSpeed: () => number,
  setSimSpeed: (v: number) => void,
  onPause: (paused: boolean) => void,
  onOpenMap: () => void,
  onOpenTech: () => void,
): RefObject<CockpitHUDRef> {
  const r = createRef<CockpitHUDRef>();
  render(
    <CockpitHUD ref={r} galaxy={galaxy} getSimSpeed={getSimSpeed} setSimSpeed={setSimSpeed}
      onPause={onPause} onOpenMap={onOpenMap} onOpenTech={onOpenTech} />,
    container,
  );
  return r;
}
