import { render, createRef } from 'preact';
import { forwardRef, useImperativeHandle } from 'preact/compat';
import { useRef, useEffect } from 'preact/hooks';
import { mountMFD, type MFDData } from './MFD';
import { mountSimParamsPanel } from './cockpit/SimParamsPanel';
import { mountPredictionPanel } from './cockpit/PredictionPanel';
import { mountFlightControlsPanel, type FlightControlsPanelRef } from './cockpit/FlightControlsPanel';
import { mountHeadingPanel } from './cockpit/HeadingPanel';
import { mountStatusPanel, type StatusPanelRef } from './cockpit/StatusPanel';
import { mountVelocityPanel, type VelocityPanelRef } from './cockpit/VelocityPanel';
import { velSignal, headingSignal } from '../core/gameSignals';
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
    const mfdEl = useRef<HTMLDivElement>(null);
    const simEl = useRef<HTMLDivElement>(null);
    const predEl = useRef<HTMLDivElement>(null);
    const flightEl = useRef<HTMLDivElement>(null);
    const headEl = useRef<HTMLDivElement>(null);
    const statEl = useRef<HTMLDivElement>(null);
    const mfd = useRef<{ update(d: MFDData): void } | null>(null);
    const flightRef = useRef<RefObject<FlightControlsPanelRef> | null>(null);
    const statusRef = useRef<RefObject<StatusPanelRef> | null>(null);
    const velRef = useRef<RefObject<VelocityPanelRef> | null>(null);
    const velEl = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (mfdEl.current) mfd.current = mountMFD(mfdEl.current, galaxy);
      if (simEl.current) mountSimParamsPanel(simEl.current, getSimSpeed, setSimSpeed);
      if (predEl.current) mountPredictionPanel(predEl.current, galaxy);
      if (flightEl.current) flightRef.current = mountFlightControlsPanel(flightEl.current, galaxy, onPause);
      if (headEl.current) mountHeadingPanel(headEl.current, galaxy);
      if (statEl.current) statusRef.current = mountStatusPanel(statEl.current);
      if (velEl.current) velRef.current = mountVelocityPanel(velEl.current);
    }, []);

    useImperativeHandle(ref, () => ({
      update(data: MFDData) {
        const secs = Math.floor((Date.now() - startTime.current) / 1000);
        const mm = String(Math.floor(secs / 60)).padStart(2, '0');
        const ss = String(secs % 60).padStart(2, '0');
        if (metaRef.current) metaRef.current.textContent = `FLIGHT · ${data.systemId}  ·  ${mm}:${ss}  ·  PKT ${data.completedCount}/${data.totalSystems}`;
        mfd.current?.update(data);
        velRef.current?.current?.update(data);
        flightRef.current?.current?.update();
        const ship = galaxy.ship;
        if (ship) { velSignal.value = { x: ship.vel.x, y: ship.vel.y }; headingSignal.value = ship.angle; }
      },
      updateStatusGauges(vx, vy, le, leMax, mo, moMax, decay, decayMax) {
        statusRef.current?.current?.draw(vx, vy, le, leMax, mo, moMax, decay, decayMax);
      },
      setPaused(paused) { flightRef.current?.current?.setPaused(paused); },
    }));

    return (
      <>
        <div class="top-bar">
          <span class="top-bar__dot">●</span>
          <span class="top-bar__meta" ref={metaRef} />
        </div>

        <div class="left-panel">
          <div class="left-top" ref={velEl} />
          <div class="left-bottom">
            <div ref={mfdEl} class="left-mfd" />
            <div ref={simEl} class="left-sim" />
          </div>
        </div>

        <div class="right-panel">
          <div class="right-top" ref={statEl} />
          <div class="right-mid">
            <button class="nav-btn" title="Return Home" onClick={() => { window.location.href = '/index.html'; }}>H</button>
            <button class="nav-btn" title="Galaxy Map" onClick={onOpenMap}>M</button>
            <button class="nav-btn" title="Tech Tree" onClick={onOpenTech}>T</button>
            <button class="nav-btn" title="Open Manual" onClick={() => window.open('/docs.html', '_blank')}>?</button>
          </div>
          <div class="right-bottom">
            <div ref={headEl} />
            <div ref={flightEl} />
          </div>
        </div>

        <div class="pred-bar-slot" ref={predEl} />
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
