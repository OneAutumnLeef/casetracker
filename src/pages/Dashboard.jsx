import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../App';
import { Trophy, Calendar, Award, Users, Search, Layers, AlertCircle, Plus } from 'lucide-react';
import { deadlineInfo, formatDate } from '../utils';

const STATUS_FILTERS = ['all', 'upcoming', 'open', 'ongoing', 'completed'];

export default function Dashboard({ onAdd }) {
  const { competitions, allTeams, members, loading } = useAppData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [tag, setTag] = useState('all');
  const navigate = useNavigate();

  const allTags = useMemo(
    () => ['all', ...Array.from(new Set(competitions.flatMap((c) => c.tags || []))).sort()],
    [competitions],
  );

  const filtered = competitions.filter((c) => {
    const q = search.toLowerCase();
    if (q && !c.name?.toLowerCase().includes(q) && !c.organizer?.toLowerCase().includes(q)) return false;
    if (filter !== 'all' && c.status !== filter) return false;
    if (tag !== 'all' && !(c.tags || []).includes(tag)) return false;
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

      <div className="toolbar">
        <div className="search-bar">
          <Search size={18} />
          <input className="form-input" placeholder="Search competitions or organizers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filters">
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
          <h3>No competitions match</h3>
          <p>Try clearing filters, or add a new competition.</p>
          <button className="btn btn-primary" onClick={onAdd}><Plus size={16} /> Add competition</button>
        </div>
      ) : (
        <div className="comp-grid">
          {filtered.map((c) => {
            const teams = teamsFor(c.id);
            const dl = deadlineInfo(c.deadline);
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

                  {(c.tags?.length > 0) && (
                    <div className="tag-row">
                      {c.tags.map((t) => <span key={t} className="theme-tag">{t}</span>)}
                    </div>
                  )}

                  <div className="comp-meta">
                    <span className="badge"><Users size={12} /> {c.isIndividual ? 'Individual' : (c.teamSizeLabel || c.teamSize || '?')}</span>
                    {c.rounds > 0 && <span className="badge"><Layers size={12} /> {c.rounds} rounds</span>}
                    {c.prize && <span className="badge strong"><Award size={12} /> {c.prize}</span>}
                  </div>

                  <div className="comp-footer">
                    <span className={`deadline-tag ${dl.tone}`}>
                      <Calendar size={12} /> {c.deadline ? `${formatDate(c.deadline, { day: 'numeric', month: 'short' })} · ${dl.label}` : 'No deadline'}
                    </span>
                    {!c.isIndividual && (
                      <span className="teams-count">{teams.length} team{teams.length !== 1 ? 's' : ''} · {peopleIn(c.id)} in</span>
                    )}
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
