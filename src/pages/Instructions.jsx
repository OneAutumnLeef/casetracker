const STEPS = [
  {
    n: '01', title: 'Load your community',
    body: ['Open Community → Bulk import.', 'Paste one person per line — optionally add gender, background and domain after commas (e.g. "Priya, female, non-eng, finance").', 'Everyone is tagged (incl. domain: Consulting/Finance/Marketing/Product/Ops/Analytics) so teams can be balanced.'],
  },
  {
    n: '02', title: 'Browse competitions',
    body: ['The Overview lists every case comp as a tile with photo, prize, rounds, team size and deadline.', 'Filter by status or theme, or search by name.', 'Use New competition to add one — paste the official link and an image URL.'],
  },
  {
    n: '03', title: 'Signal interest, then build',
    body: ['Pick yourself in the top-bar chooser, then hit "I\'m interested" on any competition — interested people rise to the top of the Free-members pool with a ★.', 'Drag people into a team; each team shows a live mix bar (M/F, Eng/Non-eng, domain) and warns on imbalance or size issues.', 'Set a team lead with the crown, and lock a team once it is final.'],
  },
  {
    n: '04', title: 'Auto-form & shuffle',
    body: ['Auto-balance fills open teams with a balanced, random mix.', 'Shuffle reshuffles everyone into fresh balanced teams (locked teams are kept).', 'Great when you want random-but-fair pairings to find your best partners.'],
  },
  {
    n: '05', title: 'Track & personalize',
    body: ['On each team, mark Registered, step through the rounds, and record the result.', 'Pick yourself in the top bar → the Overview shows a "Needs your attention" panel and a "For you" filter; the Calendar filters to just your competitions with registered / not-registered status.', 'A person’s profile shows every competition they’re on or interested in — and flags conflicts.'],
  },
  {
    n: '06', title: 'Share & export',
    body: ['Copy a team roster (WhatsApp-ready) or all teams, and Export CSV from the competition sidebar.', 'On the Calendar, hit Export to download an .ics and drop every deadline into Google / Apple Calendar.', 'Install it as an app (Add to Home Screen). No login — anyone with the link edits, and changes sync live.'],
  },
];

export default function Instructions() {
  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="hero-title">How it works.</h1>
        <p>A shared, no-login workspace for tracking case competitions and forming teams across the community.</p>
      </div>
      <div className="guide-grid">
        {STEPS.map((s) => (
          <section key={s.n} className="guide-card">
            <span className="guide-step">{s.n}</span>
            <h3 className="card-title">{s.title}</h3>
            <ul className="guide-list">{s.body.map((b, i) => <li key={i}>{b}</li>)}</ul>
          </section>
        ))}
      </div>
    </div>
  );
}
