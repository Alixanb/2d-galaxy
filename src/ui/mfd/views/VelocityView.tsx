import { useEffect } from 'preact/hooks';
import { useSignal, effect } from '@preact/signals';
import { velSignal, angularVelSignal, mfdLabelsSignal, mfdOsbPressSignal } from '../../../core/gameSignals';
import './VelocityView.scss';

const SCALE = 2000, VEL_THRESHOLD = 0.00008;

export function VelocityView() {
  const { x: vx, y: vy } = velSignal.value;
  const angVel = angularVelSignal.value;
  const showAngVel = useSignal(false);
  const speed = Math.hypot(vx, vy);
  const fmt = (v: number) => (Math.abs(v) * SCALE).toFixed(2);

  useEffect(() => {
    mfdLabelsSignal.value = ['HOME', showAngVel.value ? 'ANG VEL*' : 'ANG VEL', '—', 'TEL', 'FUEL', 'RADAR'];
  }, [showAngVel.value]);

  useEffect(() => {
    return effect(() => {
      const { btn, tick } = mfdOsbPressSignal.value;
      if (tick === 0) return;
      if (btn === 2) showAngVel.value = !showAngVel.value;
    });
  }, []);

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
      {showAngVel.value && (
        <div class="mfd-row">
          <span class="mfd-label">ω RAD</span>
          <span class="mfd-val">{(angVel * 1000).toFixed(3)}</span>
        </div>
      )}
    </div>
  );
}
