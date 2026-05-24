import { useRef } from 'preact/hooks';
import { velSignal, posSignal, bhAltSignal, headingSignal } from '../../core/gameSignals';
import './VelocityPanel.scss';

export function VelocityPanel() {
  const vel = velSignal.value;
  const pos = posSignal.value;
  const bhAlt = bhAltSignal.value;
  const heading = headingSignal.value;
  const prevSpeed = useRef(0);

  const speed = Math.hypot(vel.x, vel.y) * 2000;
  const delta = speed - prevSpeed.current;
  prevSpeed.current = speed;
  const sign = delta >= 0 ? '+' : '';
  const headDeg = heading * 180 / Math.PI;

  return (
    <div class="vel-panel">
      <div class="vel-speed">
        <span class="vel-number">{speed.toFixed(2)}</span>
        <span class="vel-unit"> z/s</span>
      </div>
      <span class="vel-delta">VELOCITY · Δ {sign}{delta.toFixed(2)}</span>
      <div class="vel-bar-track">
        <div class="vel-bar-fill" style={{ width: `${Math.min(1, speed / 100) * 100}%` }} />
      </div>
      <div class="vel-rows">
        <div class="vel-row"><span class="vel-label">POS</span><span class="vel-value">{pos.x}, {pos.y}</span></div>
        <div class="vel-row"><span class="vel-label">HEADING</span><span class="vel-value">{headDeg >= 0 ? '+' : ''}{Math.round(headDeg)}°</span></div>
        <div class="vel-row"><span class="vel-label">BH ALT</span><span class="vel-value">{bhAlt.toFixed(1)}z</span></div>
      </div>
    </div>
  );
}
