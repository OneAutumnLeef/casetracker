const STEPS = [
  {
    n: '01', title: 'Load your community',
    body: ['Open Community → Bulk import.', 'Paste one person per line — optionally add gender and engineering background after a comma (e.g. "Priya, female, non-eng").', 'Everyone is tagged so teams can be balanced later.'],
  },
  {
    n: '02', title: 'Browse competitions',
    body: ['The Overview lists every case comp as a tile with photo, prize, rounds, team size and deadline.', 'Filter by status or theme, or search by name.', 'Use New competition to add one — paste the official link and an image URL.'],
  },
  {
    n: '03', title: 'Build teams',
    body: ['Open a competition and drag people from Free members into a team.', 'Each team shows a live mix bar (M/F and Eng/Non-eng) and warns if it is over the size limit, below minimum, or all one background.', 'Set a team lead with the crown, and lock a team once it is final.'],
  },
  {
    n: '04', title: 'Auto-form & shuffle',
    body: ['Auto-balance fills open teams with a balanced, random mix.', 'Shuffle reshuffles everyone into fresh balanced teams (locked teams are kept).', 'Great when you want random-but-fair pairings to find your best partners.'],
  },
  {
    n: '05', title: 'Track progress',
    body: ['On each team, mark Registered, step through the rounds, and record the result.', 'The Calendar tab shows every deadline in one timeline.', 'A person’s profile shows which team they are in for every competition — and flags conflicts.'],
  },
  {
    n: '06', title: 'Share',
    body: ['Copy a single team roster (formatted for WhatsApp) from the copy icon.', 'Copy all teams or Export CSV from the competition sidebar.', 'No login — anyone with the link can view and edit, and changes sync live for everyone.'],
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
