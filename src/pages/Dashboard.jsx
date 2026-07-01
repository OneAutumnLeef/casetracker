import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../App';
import { Trophy, Calendar, Award, Users, Search, Layers, AlertCircle, Plus, Star, Heart, Check, Zap } from 'lucide-react';
import { deadlineInfo, formatDate } from '../utils';

const STATUS_FILTERS = ['all', 'upcoming', 'open', 'ongoing', 'completed'];

export default function Dashboard({ onAdd }) {
  const { competitions, allTeams, members, loading, viewMember } = useAppData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [tag, setTag] = useState('all');
  const [forYou, setForYou] = useState(false);
  const navigate = useNavigate();

  const allTags = useMemo(
    () => ['all', ...Array.from(new Set(competitions.flatMap((c) => c.tags || []))).sort()],
    [competitions],
  );

  // The viewing member's relationship to a competition.
  const statusFor = (c) => {
    if (!viewMember) return null;
    const team = allTeams.find((t) => t.competitionId === c.id && t.memberIds?.includes(viewMember.id));
    return { interested: (c.interestedIds || []).includes(viewMember.id), team, registered: !!team?.registered };
  };

  const filtered = competitions.filter((c) => {
    const q = search.toLowerCase();
    if (q && !c.name?.toLowerCase().includes(q) && !c.organizer?.toLowerCase().includes(q)) return false;
    if (filter !== 'all' && c.status !== filter) return false;
    if (tag !== 'all' && !(c.tags || []).includes(tag)) return false;
    if (forYou && viewMember) { const st = statusFor(c); if (!st.interested && !st.team) return false; }
    return true;
  });

  const stats = {
    total: competitions.length,
    live: competitions.filter((c) => c.status === 'ongoing' || c.status === 'open').length,
    members: members.length,
    teams: allTeams.length,
  };

  const teamsFor = (id) => allTeams.filter((t) => t.competitionId === id);
  const peopleIn = (id) => new Set(teamsFor(id).flatMap((t) => t.memberIds || [])).size;

  // Things the viewing member should act on: soon deadlines where they're
  // interested or on a team but not yet registered.
  const attention = viewMember
    ? competitions.map((c) => ({ c, st: statusFor(c), dl: deadlineInfo(c.deadline) }))
      .filter(({ c, st, dl }) => dl.tone === 'soon' && c.status !== 'completed' && (st.interested || st.team) && !st.registered)
      .sort((a, b) => (a.dl.days ?? 99) - (b.dl.days ?? 99))
    : [];

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="hero-title">Overview.</h1>
        <p>Every case competition, every team, one place. Pick a competition to build or join a team.</p>
      </div>

      <div className="stat-strip">
        {[
          { v: stats.live, l: 'Live now' },
          { v: stats.total, l: 'Competitions' },
          { v: stats.members, l: 'Community' },
          { v: stats.teams, l: 'Teams formed' },
        ].map((s, i) => (
          <div key={i} className="stat-cell">
            <div className="stat-value">{s.v}</div>
            <div className="stat-label">{s.l}</div>
          </div>
        ))}
      </div>

      {attention.length > 0 && (
        <div className="attention">
          <div className="attention-head"><Zap size={16} /> Needs your attention</div>
          <div className="attention-list">
            {attention.map(({ c, st, dl }) => (
              <div key={c.id} className="attention-row" onClick={() => navigate(`/competition/${c.id}`)}>
                <span className={`deadline-tag ${dl.tone}`}><Calendar size={12} /> {dl.label}</span>
                <span className="attention-name">{c.name}</span>
                <span className="attention-todo">{!st.team ? 'No team yet' : 'Not registered'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="search-bar">
          <Search size={18} />
          <input className="form-input" placeholder="Search competitions or organizers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filters">
          {viewMember && (
            <button className={`filter-chip${forYou ? ' active' : ''}`} onClick={() => setForYou((v) => !v)}>
              <Star size={13} /> For {viewMember.name.split(' ')[0]}
            </button>
          )}
          {STATUS_FILTERS.map((f) => (
            <button key={f} className={`filter-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {allTags.length > 1 && (
        <div className="filters" style={{ marginBottom: 28 }}>
          {allTags.map((t) => (
            <button key={t} className={`filter-chip subtle${tag === t ? ' active' : ''}`} onClick={() => setTag(t)}>
              {t === 'all' ? 'All themes' : t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="comp-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="comp-card skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-card">
          <Trophy size={44} />
          <h3>{forYou ? `Nothing for ${viewMember.name.split(' ')[0]} yet` : 'No competitions match'}</h3>
          <p>{forYou ? 'Flag interest or join a team from any competition.' : 'Try clearing filters, or add a new competition.'}</p>
          {!forYou && <button className="btn btn-primary" onClick={onAdd}><Plus size={16} /> Add competition</button>}
        </div>
      ) : (
        <div className="comp-grid">
          {filtered.map((c) => {
            const teams = teamsFor(c.id);
            const dl = deadlineInfo(c.deadline);
            const st = statusFor(c);
            const interestedCount = c.interestedIds?.length || 0;
            return (
              <article key={c.id} className="comp-card" onClick={() => navigate(`/competition/${c.id}`)}>
                <div className="comp-img-wrapper">
                  {c.imageUrl
                    ? <img className="comp-img" src={c.imageUrl} alt={c.name} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    : <Trophy size={40} color="var(--text-muted)" />}
                  <span className={`status-pill ${c.status || 'upcoming'}`}>{c.status || 'upcoming'}</span>
                  {c.unconfirmed && <span className="status-pill warn"><AlertCircle size={11} /> unconfirmed</span>}
                </div>

                <div className="comp-content">
                  <h3 className="card-title">{c.name}</h3>
                  {c.organizer && <p className="comp-org">{c.organizer}</p>}

                  {st && (st.interested || st.team) && (
                    <div className="you-row">
                      {st.registered ? <span className="status-chip registered"><Check size={12} /> Registered</span>
                        : st.team ? <span className="status-chip pending"><Users size={12} /> {st.team.name}</span>
                          : <span className="status-chip interested"><Star size={12} /> You're interested</span>}
                    </div>
                  )}

                  {(c.tags?.length > 0) && (
                    <div className="tag-row">
                      {c.tags.map((t) => <span key={t} className="theme-tag">{t}</span>)}
                    </div>
                  )}

                  <div className="comp-meta">
                    <span className="badge"><Users size={12} /> {c.isIndividual ? 'Individual' : (c.teamSizeLabel || c.teamSize || '?')}</span>
                    {c.rounds > 0 && <span className="badge"><Layers size={12} /> {c.rounds} rounds</span>}
                    {c.prize && c.prize !== 'TBA' && <span className="badge strong"><Award size={12} /> {c.prize}</span>}
                  </div>

                  <div className="comp-footer">
                    <span className={`deadline-tag ${dl.tone}`}>
                      <Calendar size={12} /> {c.deadline ? `${formatDate(c.deadline, { day: 'numeric', month: 'short' })} · ${dl.label}` : 'No deadline'}
                    </span>
                    <span className="teams-count">
                      {interestedCount > 0 && <span className="interest-count"><Heart size={11} /> {interestedCount}</span>}
                      {!c.isIndividual && ` ${teams.length} team${teams.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
