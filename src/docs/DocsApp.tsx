import { useState, useEffect } from 'preact/hooks';
import { QuickStart } from './sections/QuickStart';
import { Controls } from './sections/Controls';
import { ShipSystems } from './sections/ShipSystems';
import { Hazards } from './sections/Hazards';

type Section = 'quick' | 'controls' | 'ship' | 'hazards';

export function DocsApp() {
  const [activeSection, setActiveSection] = useState<Section>('quick');

  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as Section;
    if (hash && ['quick', 'controls', 'ship', 'hazards'].includes(hash)) {
      setActiveSection(hash);
    }
  }, []);

  const handleNav = (section: Section) => {
    setActiveSection(section);
    window.location.hash = section;
    window.scrollTo(0, 0);
  };

  return (
    <div className="docs-layout">
      <nav className="docs-sidebar">
        <div className="docs-logo">
          <h1>2D GALAXY</h1>
          <span>FLIGHT MANUAL</span>
        </div>
        <ul className="docs-nav-list">
          <li className={activeSection === 'quick' ? 'active' : ''} onClick={() => handleNav('quick')}>Quick Start</li>
          <li className={activeSection === 'controls' ? 'active' : ''} onClick={() => handleNav('controls')}>Controls & Nav</li>
          <li className={activeSection === 'ship' ? 'active' : ''} onClick={() => handleNav('ship')}>Systems & Upgrades</li>
          <li className={activeSection === 'hazards' ? 'active' : ''} onClick={() => handleNav('hazards')}>Hazards</li>
        </ul>
        <div className="docs-sidebar-footer">
          <a href="/simulation.html">Back to Simulator</a>
        </div>
      </nav>
      <main className="docs-content">
        {activeSection === 'quick' && <QuickStart />}
        {activeSection === 'controls' && <Controls />}
        {activeSection === 'ship' && <ShipSystems />}
        {activeSection === 'hazards' && <Hazards />}
      </main>
    </div>
  );
}
