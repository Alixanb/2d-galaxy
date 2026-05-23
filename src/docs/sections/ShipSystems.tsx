export function ShipSystems() {
  return (
    <section>
      <h1>Systems & Upgrades</h1>
      
      <div className="doc-grid">
        <div className="doc-box">
          <h3>Propellants</h3>
          <p><strong>L-ERGOL:</strong> Fuel for the main engine.</p>
          <p><strong>MONO:</strong> Gas for RCS rotation and docking.</p>
        </div>
        <div className="doc-box">
          <h3>Upgrades</h3>
          <p>Spend <strong>Parts</strong> in the Tech Tree to improve thrust, fuel capacity, and navigation computers.</p>
          <p><em>All upgrades are 100% refundable at any time.</em></p>
        </div>
      </div>

      <h2>Flight Computers</h2>
      <ul className="check-list">
        <li><strong>AUTO-STAB:</strong> Automatically stops rotation.</li>
        <li><strong>HEADING LOCK:</strong> Auto-aligns ship to Prograde, Retrograde, or Radial directions.</li>
        <li><strong>TRAJECTORY:</strong> Higher tiers predict more steps into the future.</li>
      </ul>
    </section>
  );
}
