export function Hazards() {
  return (
    <section>
      <h1>Hazards</h1>
      
      <div className="doc-box hazard">
        <h3>Black Holes</h3>
        <p>Stay away from the center. Crossing the event horizon is fatal.</p>
      </div>

      <h2>Tidal Decay</h2>
      <p>High-gravity systems emit tidal forces that decay your hull. If your <strong>Tidal Shielding</strong> (Hull upgrades) is lower than the system rating, a timer starts.</p>
      
      <table className="doc-table">
        <thead>
          <tr>
            <th>System Rating</th>
            <th>Required Hull</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>None / Low</td><td>Basic / Hull I</td></tr>
          <tr><td>Medium</td><td>Hull II</td></tr>
          <tr><td>High / Extreme</td><td>Hull III</td></tr>
        </tbody>
      </table>

      <div className="doc-tip">
        <strong>Warning:</strong> If the decay timer reaches zero, you will be ejected from the system.
      </div>
    </section>
  );
}
