export function Controls() {
  return (
    <section>
      <h1>Controls & Navigation</h1>
      
      <div className="doc-grid">
        <div className="doc-box">
          <h3>Flight Controls</h3>
          <ul className="check-list">
            <li><strong>Up Arrow:</strong> Main Engine Thrust</li>
            <li><strong>Left/Right:</strong> Rotate Ship</li>
            <li><strong>Z / S:</strong> Change Thrust Power</li>
            <li><strong>Q / E:</strong> Change Rotation Rate</li>
          </ul>
        </div>
        <div className="doc-box">
          <h3>Docking Controls</h3>
          <p>Activate <strong>Docking Mode</strong> in the cockpit to use 4-axis translation:</p>
          <ul className="check-list">
            <li><strong>Arrows:</strong> Forward/Back/Lateral</li>
            <li><strong>Q / E:</strong> Rotation</li>
          </ul>
        </div>
      </div>

      <h2>Orbital Navigation</h2>
      <p>The blue line predicts your path. Watch for these markers:</p>
      <ul className="marker-list">
        <li><span className="marker-icon pe">▼</span> <strong>Periapsis:</strong> Closest point to black hole.</li>
        <li><span className="marker-icon ap">▲</span> <strong>Apoapsis:</strong> Farthest point from black hole.</li>
        <li><span className="marker-icon enc">◆</span> <strong>Encounter:</strong> Closest approach to target relay.</li>
      </ul>

      <div className="doc-tip">
        <strong>Escape:</strong> If the path turns <strong>green</strong>, you have enough speed to leave the system and travel to a new one.
      </div>
    </section>
  );
}
