export default function Instructions() {
  return (
    <div className="animate-fade-up">
      <div className="page-header" style={{ marginBottom: 48 }}>
        <h1 className="hero-title">How to Use.</h1>
        <p>A quick guide to managing your case competitions.</p>
      </div>

      <div className="guide-grid" style={{ maxWidth: 1120 }}>
        <section className="bento-card guide-card">
          <span className="guide-step">01</span>
          <h3 className="card-title">Add Your Members</h3>
          <ul className="guide-list">
            <li>Go to the <strong>Members</strong> page from the top navigation.</li>
            <li>Click <strong>Add Member</strong> to register each community member.</li>
            <li>Set their <strong>gender</strong>, <strong>background</strong>, and avatar color.</li>
          </ul>
        </section>

        <section className="bento-card guide-card">
          <span className="guide-step">02</span>
          <h3 className="card-title">Add Competitions</h3>
          <ul className="guide-list">
            <li>Open the <strong>Dashboard</strong> and click <strong>New Competition</strong>.</li>
            <li>Fill in the full competition details, including <strong>team size</strong>, <strong>rounds</strong>, <strong>deadline</strong>, and <strong>prize</strong>.</li>
            <li>Paste the <strong>official link</strong> and <strong>image URL</strong> if you have them.</li>
          </ul>
        </section>

        <section className="bento-card guide-card">
          <span className="guide-step">03</span>
          <h3 className="card-title">Create Teams</h3>
          <div className="case-block">
            Teams are the main working unit. Create them from a competition page, then drag members into place.
          </div>
          <ul className="guide-list" style={{ marginTop: 16 }}>
            <li>Open any <strong>competition card</strong> from the Dashboard.</li>
            <li>Click <strong>Create Team</strong> to add a new team slot.</li>
            <li><strong>Drag and drop</strong> members from the pool into teams, or between teams.</li>
            <li>Use the team counter to see assigned members versus the limit.</li>
          </ul>
        </section>

        <section className="bento-card guide-card">
          <span className="guide-step">04</span>
          <h3 className="card-title">Track Assignments</h3>
          <ul className="guide-list">
            <li>Open a <strong>member card</strong> to see their profile.</li>
            <li>The profile shows <strong>every competition</strong> and the team they belong to.</li>
            <li>Members without a team are marked as <strong>Not assigned</strong>.</li>
          </ul>
        </section>

        <section className="bento-card guide-card">
          <span className="guide-step">05</span>
          <h3 className="card-title">Tips & Tricks</h3>
          <ul className="guide-list">
            <li>Use the <strong>search bar</strong> and <strong>filters</strong> to move faster.</li>
            <li>Filter members by <strong>gender</strong> and <strong>background</strong> when balancing teams.</li>
            <li>Changes should appear instantly after saving.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
