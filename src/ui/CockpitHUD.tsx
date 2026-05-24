import { render, createRef } from 'preact';
import { forwardRef, useImperativeHandle } from 'preact/compat';
import { useRef, useEffect } from 'preact/hooks';
import { mountMFD, type MFDData } from './MFD';
import { mountSimParamsPanel } from './cockpit/SimParamsPanel';
import { mountPredictionPanel } from './cockpit/PredictionPanel';
import { mountFlightControlsPanel, type FlightControlsPanelRef } from './cockpit/FlightControlsPanel';
import { mountHeadingPanel } from './cockpit/HeadingPanel';
import { mountStatusPanel, type StatusPanelRef } from './cockpit/StatusPanel';
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
    const mfd1El = useRef<HTMLDivElement>(null);
    const mfd2El = useRef<HTMLDivElement>(null);
    const simEl = useRef<HTMLDivElement>(null);
    const predEl = useRef<HTMLDivElement>(null);
    const flightEl = useRef<HTMLDivElement>(null);
    const headEl = useRef<HTMLDivElement>(null);
    const statEl = useRef<HTMLDivElement>(null);
    const mfd1 = useRef<{ update(d: MFDData): void } | null>(null);
    const mfd2 = useRef<{ update(d: MFDData): void } | null>(null);
    const flightRef = useRef<RefObject<FlightControlsPanelRef> | null>(null);
    const statusRef = useRef<RefObject<StatusPanelRef> | null>(null);

    useEffect(() => {
      if (mfd1El.current) mfd1.current = mountMFD(mfd1El.current, galaxy);
      if (mfd2El.current) mfd2.current = mountMFD(mfd2El.current, galaxy);
      if (simEl.current) mountSimParamsPanel(simEl.current, getSimSpeed, setSimSpeed);
      if (predEl.current) mountPredictionPanel(predEl.current, galaxy);
      if (flightEl.current) flightRef.current = mountFlightControlsPanel(flightEl.current, galaxy, onPause);
      if (headEl.current) mountHeadingPanel(headEl.current, galaxy);
      if (statEl.current) statusRef.current = mountStatusPanel(statEl.current);
    }, []);

    useImperativeHandle(ref, () => ({
      update(data: MFDData) {
        const secs = Math.floor((Date.now() - startTime.current) / 1000);
        const mm = String(Math.floor(secs / 60)).padStart(2, '0');
        const ss = String(secs % 60).padStart(2, '0');
        if (metaRef.current) metaRef.current.textContent = `FLIGHT · ${data.systemId}  ·  ${mm}:${ss}  ·  PKT ${data.completedCount}/${data.totalSystems}`;
        mfd1.current?.update(data);
        mfd2.current?.update(data);
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
        <div class="cockpit-panel">
          <div ref={mfd1El} />
          <div ref={mfd2El} />
          <div ref={simEl} />
          <div ref={predEl} />
          <div ref={flightEl} />
          <div style="display:flex;flex-direction:column;overflow:hidden;border-left:1px solid var(--border)">
            <div ref={headEl} />
            <div ref={statEl} />
          </div>
        </div>
        <div class="floating-btns">
          <button class="floating-btn home-btn" title="Return Home" onClick={() => { window.location.href = '/index.html'; }}>H</button>
          <button class="floating-btn" title="Galaxy Map" onClick={onOpenMap}>M</button>
          <button class="floating-btn" title="Tech Tree" onClick={onOpenTech}>T</button>
          <button class="floating-btn help-btn" title="Open Manual" onClick={() => window.open('/docs.html', '_blank')}>?</button>
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
