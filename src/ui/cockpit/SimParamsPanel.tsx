import { useState } from 'preact/hooks';
import Ship from '../../entities/Ship';
import './SimParamsPanel.scss';

interface FaderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  accent: string;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

function Fader({ label, value, min, max, step, accent, format, onChange }: FaderProps) {
  return (
    <div class="cockpit-fader">
      <div class="fader-header">
        <span class="fader-label">{label}</span>
        <span class={`fader-value ${accent}`}>{format(value)}</span>
      </div>
      <input
        type="range"
        class="cockpit-slider"
        min={min} max={max} step={step}
        value={value}
        onInput={(e) => onChange(parseFloat((e.target as HTMLInputElement).value))}
        onChange={(e) => (e.target as HTMLInputElement).blur()}
      />
    </div>
  );
}

interface Props { getSimSpeed: () => number; setSimSpeed: (v: number) => void; }

export function SimParamsPanel({ getSimSpeed: _getSimSpeed, setSimSpeed }: Props) {
  const thrDefault = Ship.DEFAULT_THRUSTPOWER;
  const rotDefault = Ship.DEFAULT_RADIALPOWER;
  const [thrust, setThrust] = useState(20);
  const [rcs, setRcs] = useState(20);
  const [simSpd, setSimSpd] = useState(10);

  return (
    <div class="sim-params">
      <div class="cockpit-section-label">DRIVE SYS</div>
      <Fader label="THRUSTER" value={thrust} min={0} max={100} step={5} accent="cyan"
        format={(v) => `${v}%`}
        onChange={(v) => { Ship.THRUSTPOWER = thrDefault * (v / 20); setThrust(v); }} />
      <Fader label="RCS" value={rcs} min={0} max={100} step={5} accent="cyan"
        format={(v) => `${v}%`}
        onChange={(v) => { Ship.RADIALPOWER = rotDefault * (v / 20); setRcs(v); }} />
      <Fader label="SIM SPD" value={simSpd} min={1} max={100} step={1} accent="yellow"
        format={(v) => `${(v / 10).toFixed(1)}×`}
        onChange={(v) => { setSimSpeed(v / 10); setSimSpd(v); }} />
    </div>
  );
}
