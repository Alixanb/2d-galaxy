import { render } from 'preact';
import { velSignal, headingSignal } from '../../core/gameSignals';
import type Galaxy from '../../systems/Galaxy';
import './HeadingPanel.scss';

const DEFS = [
  { label: 'PRO', color: '#3dff7a' },
  { label: 'RET', color: '#3dff7a' },
  { label: 'RDL', color: '#e9d628' },
  { label: 'ANT', color: '#e9d628' },
] as const;

function HeadingPanel({ galaxy }: { galaxy: Galaxy }) {
  const vel = velSignal.value;
  const angle = headingSignal.value;
  const ship = galaxy.ship;
  const bh = galaxy.blackholes[0];
  const moving = !!ship && Math.hypot(vel.x, vel.y) > 0.0001;

  return (
    <div class="heading-section">
      <div class="cockpit-section-label">HEADING REF</div>
      <div class="heading-rows">
        {DEFS.map(({ label, color }, i) => {
          let delta = '---';
          let aligned = false;
          if (moving && ship) {
            const pro = Math.atan2(vel.x, -vel.y);
            const dx = bh ? bh.pos.x - ship.pos.x : 0;
            const dy = bh ? bh.pos.y - ship.pos.y : 0;
            const rdl = bh ? Math.atan2(dx, -dy) : pro;
            const angles = [pro, pro + Math.PI, rdl, rdl + Math.PI];
            let diff = angles[i] - angle;
            while (diff > Math.PI) diff -= 2 * Math.PI;
            while (diff < -Math.PI) diff += 2 * Math.PI;
            aligned = Math.abs(diff) < 0.26;
            const deg = Math.round((diff * 180) / Math.PI);
            delta = aligned ? 'ALIGNED' : `${deg > 0 ? '+' : ''}${deg}°`;
          }
          return (
            <div class={`heading-row${aligned ? ' heading-aligned' : ''}`} key={label}>
              <span style={{ color }}>⊙</span>
              <span class="heading-label">{label}</span>
              <span class="heading-delta">{delta}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function mountHeadingPanel(container: HTMLElement, galaxy: Galaxy): void {
  render(<HeadingPanel galaxy={galaxy} />, container);
}
