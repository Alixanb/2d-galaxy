import { render } from 'preact';
import { useState } from 'preact/hooks';
import { SYSTEMS } from '../data/systems';
import './DebugPanel.scss';

interface Props {
  onWarp: (systemId: string) => void;
  onRefill: () => void;
  onMaxUpgrades: () => void;
  onAddParts: () => void;
}

function DebugPanel({ onWarp, onRefill, onMaxUpgrades, onAddParts }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState(SYSTEMS[0].id);

  return (
    <div class="debug-panel">
      <div class="debug-panel__header" onClick={() => setCollapsed(c => !c)}>
        <span>Debug UI</span>
        <button class="debug-panel__toggle">{collapsed ? '[+]' : '[-]'}</button>
      </div>
      {!collapsed && (
        <div class="debug-panel__content">
          <div class="debug-panel__warp">
            <select
              class="debug-panel__select"
              value={selectedSystem}
              onChange={e => setSelectedSystem((e.target as HTMLSelectElement).value)}
            >
              {SYSTEMS.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button class="debug-panel__btn" onClick={() => onWarp(selectedSystem)}>Warp</button>
          </div>
          <button class="debug-panel__btn" onClick={onRefill}>Refill Tanks</button>
          <button class="debug-panel__btn" onClick={onMaxUpgrades}>Max Upgrades</button>
          <button class="debug-panel__btn" onClick={onAddParts}>+100 Parts</button>
        </div>
      )}
    </div>
  );
}

export function mountDebugPanel(
  onWarp: (systemId: string) => void,
  onRefill: () => void,
  onMaxUpgrades: () => void,
  onAddParts: () => void,
) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  render(<DebugPanel onWarp={onWarp} onRefill={onRefill} onMaxUpgrades={onMaxUpgrades} onAddParts={onAddParts} />, el);
}
