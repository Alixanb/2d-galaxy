import { render, createRef } from 'preact';
import { forwardRef, useImperativeHandle } from 'preact/compat';
import { useRef } from 'preact/hooks';
import type { RefObject } from 'preact';
import type { MFDData } from '../MFD';
import './VelocityPanel.scss';

export interface VelocityPanelRef {
  update(data: MFDData): void;
}

const VelocityPanel = forwardRef<VelocityPanelRef>((_, ref) => {
  const speedRef = useRef<HTMLSpanElement>(null);
  const deltaRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<HTMLSpanElement>(null);
  const headRef = useRef<HTMLSpanElement>(null);
  const bhRef = useRef<HTMLSpanElement>(null);
  const prevSpeed = useRef(0);

  useImperativeHandle(ref, () => ({
    update(data: MFDData) {
      const speed = Math.hypot(data.vx, data.vy) * 2000;
      const delta = speed - prevSpeed.current;
      prevSpeed.current = speed;

      if (speedRef.current) speedRef.current.textContent = speed.toFixed(2);
      if (deltaRef.current) {
        const sign = delta >= 0 ? '+' : '';
        deltaRef.current.textContent = `VELOCITY · Δ ${sign}${delta.toFixed(2)}`;
      }
      if (barRef.current) barRef.current.style.width = `${Math.min(1, speed / 100) * 100}%`;
      if (posRef.current) posRef.current.textContent = `${data.posX}, ${data.posY}`;
      if (headRef.current) headRef.current.textContent = `${data.heading >= 0 ? '+' : ''}${Math.round(data.heading)}°`;
      if (bhRef.current) bhRef.current.textContent = `${data.bhAlt.toFixed(1)}z`;
    },
  }));

  return (
    <div class="vel-panel">
      <div class="vel-speed">
        <span ref={speedRef} class="vel-number">0.00</span>
        <span class="vel-unit"> z/s</span>
      </div>
      <span ref={deltaRef} class="vel-delta">VELOCITY · Δ +0.00</span>
      <div class="vel-bar-track"><div ref={barRef} class="vel-bar-fill" /></div>
      <div class="vel-rows">
        <div class="vel-row"><span class="vel-label">POS</span><span ref={posRef} class="vel-value">0, 0</span></div>
        <div class="vel-row"><span class="vel-label">HEADING</span><span ref={headRef} class="vel-value">+0°</span></div>
        <div class="vel-row"><span class="vel-label">BH ALT</span><span ref={bhRef} class="vel-value">0.0z</span></div>
      </div>
    </div>
  );
});

export function mountVelocityPanel(container: HTMLElement): RefObject<VelocityPanelRef> {
  const r = createRef<VelocityPanelRef>();
  render(<VelocityPanel ref={r} />, container);
  return r;
}
