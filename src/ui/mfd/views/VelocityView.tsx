import { render, createRef } from 'preact';
import { signal } from '@preact/signals';
import { forwardRef, useImperativeHandle } from 'preact/compat';
import { useRef, useState } from 'preact/hooks';
import { velSignal } from '../../../core/gameSignals';
const SCALE = 2000, VEL_THRESHOLD = 0.00008;
import type { MFDData } from '../../MFD';
import type { MFDView } from '../MFDView';
import './VelocityView.scss';

const angVelSig = signal(0);

interface VelViewRef { getLabels(): string[]; onOSB(idx: number): void; }

const VelocityViewComponent = forwardRef<VelViewRef>((_, ref) => {
  const { x: vx, y: vy } = velSignal.value;
  const angVel = angVelSig.value;
  const showAngVel = useRef(false);
  const [, setTick] = useState(0);
  const speed = Math.hypot(vx, vy);
  const fmt = (v: number) => (Math.abs(v) * SCALE).toFixed(2);

  useImperativeHandle(ref, () => ({
    getLabels: () => ['HOME', showAngVel.current ? 'ANG VEL*' : 'ANG VEL', '—', 'TEL', 'FUEL', 'RADAR'],
    onOSB(idx) { if (idx === 2) { showAngVel.current = !showAngVel.current; setTick(n => n + 1); } },
  }));

  return (
    <div class="mfd-view mfd-view-vel" style="display:flex">
      <div class="mfd-header">VELOCITY</div>
      <div class="mfd-sep" />
      <div class="mfd-row">
        <span class="mfd-label">VX</span>
        <span class="mfd-arrow">{vx > VEL_THRESHOLD ? '→' : vx < -VEL_THRESHOLD ? '←' : '·'}</span>
        <span class="mfd-val" style={{ opacity: Math.abs(vx) < VEL_THRESHOLD ? '0.35' : '1' }}>{fmt(vx)}</span>
      </div>
      <div class="mfd-row">
        <span class="mfd-label">VY</span>
        <span class="mfd-arrow">{vy > VEL_THRESHOLD ? '↓' : vy < -VEL_THRESHOLD ? '↑' : '·'}</span>
        <span class="mfd-val" style={{ opacity: Math.abs(vy) < VEL_THRESHOLD ? '0.35' : '1' }}>{fmt(vy)}</span>
      </div>
      <div class="mfd-sep" />
      <div class="mfd-row">
        <span class="mfd-label">|V|</span>
        <span class="mfd-val" style={{ opacity: speed < VEL_THRESHOLD ? '0.35' : '1' }}>{(speed * SCALE).toFixed(2)}</span>
      </div>
      <div class="mfd-row">
        <span class="mfd-label">SPD</span>
        <span class="mfd-unit">m/s</span>
        <span class="mfd-val mfd-val-spd">{(speed * SCALE).toFixed(1)}</span>
      </div>
      {showAngVel.current && (
        <div class="mfd-row">
          <span class="mfd-label">ω RAD</span>
          <span class="mfd-val">{(angVel * 1000).toFixed(3)}</span>
        </div>
      )}
    </div>
  );
});

export class VelocityView implements MFDView {
  private r = createRef<VelViewRef>();
  mount(container: HTMLElement): void { render(<VelocityViewComponent ref={this.r} />, container); }
  update(data: MFDData): void { angVelSig.value = data.angularVel; }
  getLabels(): string[] { return this.r.current?.getLabels() ?? ['HOME', 'ANG VEL', '—', 'TEL', 'FUEL', 'RADAR']; }
  onOSB(idx: number): void { this.r.current?.onOSB(idx); }
}
