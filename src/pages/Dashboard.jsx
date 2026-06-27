import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../App';
import { addCompetition, deleteCompetition } from '../firebase/services';
import { Trophy, Calendar, DollarSign, Users, ExternalLink, Search, Layers, AlertCircle } from 'lucide-react';
import Modal from '../components/Modal';

export default function Dashboard() {
  const { competitions, allTeams, members, loading } = useAppData();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const filtered = competitions.filter(c => {
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase()) && !c.organizer?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== 'all' && c.status !== filter) return false;
    return true;
  });

  const stats = {
    total: competitions.length,
    members: members.length,
    teams: allTeams.length,
    ongoing: competitions.filter(c => c.status === 'ongoing').length,
  };

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="hero-title">Overview.</h1>
        <p>Track all case competitions, form teams, and manage your community.</p>
      </div>

      <div className="toolbar">
        <div className="search-bar">
          <Search size={18} />
          <input className="form-input" placeholder="Search competitions..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filters">
          {['all', 'upcoming', 'ongoing', 'completed'].map(f => (
            <button key={f} className={`filter-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bento-grid">
          {[1, 2, 3, 4].map(i => <div key={i} className={`bento-card col-span-${i === 1 ? '12' : '4'}`} style={{ height: 300, background: '#111' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bento-card col-span-12" style={{ alignItems: 'center', textAlign: 'center', padding: '64px' }}>
          <Trophy size={48} style={{ color: 'var(--text-muted)', marginBottom: 24 }} />
          <h3 className="section-title" style={{ marginBottom: 8 }}>No competitions found</h3>
          <p>Add your first case competition to get started.</p>
        </div>
      ) : (
        <div className="bento-grid">
          <div className="bento-card col-span-12" style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', padding: '24px 32px' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="stat-value" style={{ fontSize: '2.5rem', marginBottom: 4 }}>{stats.ongoing}</div>
              <div className="stat-label">Ongoing</div>
            </div>
            <div style={{ width: 1, height: '40px', background: 'var(--border-color)' }} />
            <div style={{ textAlign: 'center' }}>
              <div className="stat-value" style={{ fontSize: '2.5rem', marginBottom: 4 }}>{stats.total}</div>
              <div className="stat-label">Total</div>
            </div>
            <div style={{ width: 1, height: '40px', background: 'var(--border-color)' }} />
            <div style={{ textAlign: 'center' }}>
              <div className="stat-value" style={{ fontSize: '2.5rem', marginBottom: 4 }}>{stats.members}</div>
              <div className="stat-label">Members</div>
            </div>
            <div style={{ width: 1, height: '40px', background: 'var(--border-color)' }} />
            <div style={{ textAlign: 'center' }}>
              <div className="stat-value" style={{ fontSize: '2.5rem', marginBottom: 4 }}>{stats.teams}</div>
              <div className="stat-label">Teams</div>
            </div>
          </div>

          {filtered.map((c, idx) => {
            const teamCount = allTeams.filter(t => t.competitionId === c.id).length;
            const isDeadlineSoon = c.deadline && new Date(c.deadline) < new Date(Date.now() + 5 * 86400000);
            
            let spanClass = 'col-span-4';
            if (idx === 0) spanClass = 'col-span-8';
            else if (idx === 1) spanClass = 'col-span-4';
            else if (idx === 2) spanClass = 'col-span-6';
            else if (idx === 3) spanClass = 'col-span-6';

            return (
              <div key={c.id} className={`bento-card comp-card ${spanClass}`} onClick={() => navigate(`/competition/${c.id}`)}>
                <div className="comp-img-wrapper" style={{ height: spanClass === 'col-span-8' ? '320px' : '200px' }}>
                  {c.imageUrl ? (
                    <img className="comp-img" src={c.imageUrl} alt={c.name} loading="lazy" />
                  ) : (
                    <Trophy size={48} color="var(--text-muted)" />
                  )}
                </div>
                
                <div className="comp-content">
                  <div className="card-title">
                    <span className={`status-dot ${c.status || 'upcoming'}`} />
                    {c.name}
                  </div>
                  {c.organizer && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>{c.organizer}</p>}
                  
                  {spanClass === 'col-span-8' && (
                    <p className="card-desc" style={{ fontSize: '1.1rem', marginBottom: '24px' }}>
                      {c.description || 'No description available for this competition.'}
                    </p>
                  )}

                  <div className="comp-meta">
                    <span className="badge"><Users size={12} /> {c.teamSizeLabel || c.teamSize || '?'}</span>
                    {c.prize && <span className="badge" style={{ borderColor: 'rgba(255, 255, 255, 0.2)', color: '#fff' }}><DollarSign size={12} /> {c.prize}</span>}
                    {c.deadline && (
                      <span className="badge" style={isDeadlineSoon ? { color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)' } : {}}>
                        <Calendar size={12} /> {new Date(c.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {isDeadlineSoon && ' ⚡'}
                      </span>
                    )}
                    {c.unconfirmed && <span className="badge" style={{ color: '#fbbf24' }}><AlertCircle size={12} /> Unconfirmed</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
