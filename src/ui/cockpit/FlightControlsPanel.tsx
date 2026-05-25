import { useState, useEffect } from 'preact/hooks';
import type { HeadingLockMode } from '../../core/GameState';
import type Galaxy from '../../systems/Galaxy';
import { isPausedSignal } from '../../core/gameSignals';
import './FlightControlsPanel.scss';

const HLK_DEFS: { label: string; mode: HeadingLockMode; minTier: number }[] = [
  { label: 'MAN', mode: 'manual',      minTier: 0 },
  { label: 'PRO', mode: 'prograde',    minTier: 1 },
  { label: 'RET', mode: 'retrograde',  minTier: 1 },
  { label: 'RDL', mode: 'radial',      minTier: 2 },
  { label: 'ANT', mode: 'anti-radial', minTier: 2 },
];

interface Props { galaxy: Galaxy; onPause: (paused: boolean) => void; }

export function FlightControlsPanel({ galaxy, onPause }: Props) {
  const [autoStab, setAutoStab] = useState(false);
  const [autoStabEnabled, setAutoStabEnabled] = useState(false);
  const [retroPhase, setRetroPhase] = useState<'align' | 'burn' | null>(null);
  const [retroEnabled, setRetroEnabled] = useState(false);
  const [dockMode, setDockMode] = useState(false);
  const [headingLock, setHeadingLock] = useState<HeadingLockMode>('manual');
  const [headingLockTier, setHeadingLockTier] = useState<0 | 1 | 2 | 3>(0);
  const isPaused = isPausedSignal.value;

  useEffect(() => {
    let frame: number;
    let lastTime = 0;
    const loop = (time: number) => {
      if (time - lastTime >= 200) {
        const ship = galaxy.ship;
        if (ship) {
          setAutoStab(ship.autoStab);
          setAutoStabEnabled(ship.autoStabUnlocked);
          setRetroPhase(ship.retrogradePhase);
          setRetroEnabled(ship.retroBurnUnlocked);
          setDockMode(ship.dockingMode);
          setHeadingLock(ship.headingLock);
          setHeadingLockTier(ship.headingLockTier);
        }
        lastTime = time;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [galaxy]);

  function handleAutoStab() {
    const ship = galaxy.ship;
    if (!ship) return;
    const on = !ship.autoStab;
    ship.autoStab = on;
    setAutoStab(on);
    if (on) { ship.retrogradeActive = false; ship.retrogradePhase = null; setRetroPhase(null); }
  }

  function handleRetro() {
    const ship = galaxy.ship;
    if (!ship) return;
    const on = !ship.retrogradeActive;
    ship.retrogradeActive = on;
    ship.retrogradePhase = on ? 'align' : null;
    if (on) { ship.headingLock = 'manual'; ship.autoStab = false; setAutoStab(false); setHeadingLock('manual'); }
    setRetroPhase(on ? 'align' : null);
  }

  function handlePause() {
    const next = !isPaused;
    isPausedSignal.value = next;
    onPause(next);
  }

  function handleDock() {
    const ship = galaxy.ship;
    if (!ship) return;
    ship.dockingMode = !ship.dockingMode;
    setDockMode(ship.dockingMode);
  }

  function handleHlk(mode: HeadingLockMode) {
    const ship = galaxy.ship;
    if (!ship) return;
    ship.headingLock = mode;
    if (mode !== 'manual') { ship.retrogradeActive = false; ship.retrogradePhase = null; setRetroPhase(null); }
    setHeadingLock(mode);
  }

  const retroClass = `retro-btn${retroPhase ? ' retro-active' : ''}${retroPhase === 'align' ? ' retro-align' : ''}`;

  return (
    <div class="autostab-section">
      <div class="cockpit-section-label">FLIGHT CTRL</div>
      <div class="hlk-row">
        {HLK_DEFS.map(({ label, mode, minTier }) => (
          <button key={mode} class={`hlk-btn${headingLock === mode ? ' hlk-active' : ''}`} disabled={headingLockTier < minTier} onClick={() => handleHlk(mode)}>
            {label}
          </button>
        ))}
      </div>
      <div class="autostab-wrap">
        <button class={`autostab-btn${autoStab ? ' autostab-active' : ''}`} disabled={!autoStabEnabled} onClick={handleAutoStab}>AUTO</button>
        <button class={retroClass} disabled={!retroEnabled} onClick={handleRetro}>{retroPhase === 'align' ? 'ALIGNING' : 'RETRO'}</button>
        <button class={`autostab-btn${isPaused ? ' autostab-active' : ''}`} onClick={handlePause}>{isPaused ? 'RESUME' : 'PAUSE'}</button>
        <button class={`autostab-btn${dockMode ? ' autostab-active' : ''}`} onClick={handleDock}>DOCK</button>
      </div>
    </div>
  );
}
