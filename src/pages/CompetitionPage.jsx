import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppData } from '../App';
import {
  getCompetition, subscribeTeams, addTeam, updateTeam, deleteTeam,
  updateCompetition, deleteCompetition
} from '../firebase/services';
import { ArrowLeft, Plus, Trash2, ExternalLink, Users, Layers, Calendar, DollarSign, Edit3, AlertCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

export default function CompetitionPage() {
  const { id } = useParams();
  const { members, competitions } = useAppData();
  const navigate = useNavigate();
  const [comp, setComp] = useState(null);
  const [teams, setTeams] = useState([]);
  const [dragMember, setDragMember] = useState(null);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [showEdit, setShowEdit] = useState(false);

  const competition = competitions.find(c => c.id === id) || comp;

  useEffect(() => {
    getCompetition(id).then(setComp);
    const unsub = subscribeTeams(id, setTeams);
    return unsub;
  }, [id]);

  if (!competition) return <div className="animate-in"><p style={{ color: 'var(--text-muted)' }}>Loading...</p></div>;

  const assignedIds = new Set(teams.flatMap(t => t.memberIds || []));
  const unassigned = members.filter(m => !assignedIds.has(m.id));

  const handleDragStart = (memberId) => setDragMember(memberId);

  const handleDropOnTeam = async (teamId) => {
    if (!dragMember) return;
    const team = teams.find(t => t.id === teamId);
    if (!team || team.memberIds?.includes(dragMember)) { setDragMember(null); return; }
    for (const t of teams) {
      if (t.id !== teamId && t.memberIds?.includes(dragMember)) {
        await updateTeam(t.id, { memberIds: t.memberIds.filter(mid => mid !== dragMember) });
      }
    }
    await updateTeam(teamId, { memberIds: [...(team.memberIds || []), dragMember] });
    setDragMember(null);
  };

  const handleDropOnPool = async () => {
    if (!dragMember) return;
    for (const t of teams) {
      if (t.memberIds?.includes(dragMember)) {
        await updateTeam(t.id, { memberIds: t.memberIds.filter(mid => mid !== dragMember) });
      }
    }
    setDragMember(null);
  };

  const handleAddTeam = async () => {
    if (!teamName.trim()) return;
    const created = await addTeam({ name: teamName, competitionId: id, memberIds: [] });
    if (created) setTeams(prev => [...prev, created]);
    setTeamName('');
    setShowAddTeam(false);
  };

  const removeMemberFromTeam = async (teamId, memberId) => {
    const team = teams.find(t => t.id === teamId);
    if (team) await updateTeam(teamId, { memberIds: team.memberIds.filter(mid => mid !== memberId) });
  };

  const getMember = (mid) => members.find(m => m.id === mid);

  const handleDeleteComp = async () => {
    if (confirm('Delete this competition and all its teams?')) {
      await deleteCompetition(id);
      navigate('/');
    }
  };

  return (
    <div className="animate-fade-up">
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: 24, fontWeight: 500, transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--text-white)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
        <ArrowLeft size={16} /> Back to Overview
      </Link>

      <div className="detail-hero">
        {competition.imageUrl ? (
          <img className="detail-img" src={competition.imageUrl} alt={competition.name} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <h1 style={{ opacity: 0.1, fontSize: '10rem', letterSpacing: '-0.05em' }}>{competition.name?.substring(0, 3).toUpperCase()}</h1>
          </div>
        )}
      </div>

      <div className="detail-content">
        <div>
          <h1 className="hero-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: 8 }}>{competition.name}</h1>
          {competition.organizer && <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: 32 }}>Presented by {competition.organizer}</p>}
          
          <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: 48, whiteSpace: 'pre-wrap' }}>
            {competition.description || 'No detailed description provided for this competition.'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
            <h2 className="section-title" style={{ marginBottom: 0, fontSize: '2rem' }}>Teams ({teams.length})</h2>
            <button className="btn btn-primary" onClick={() => setShowAddTeam(true)}>
              <Plus size={16} /> Create Team
            </button>
          </div>

          <div className="team-builder">
            <div className="unassigned-pool">
              <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Community Pool</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Drag members into teams.</p>
              
              <div
                className="pool-list"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDropOnPool}
              >
                {unassigned.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>All members are assigned.</p>
                  </div>
                ) : (
                  unassigned.map(m => (
                    <div key={m.id} className="member-chip" draggable onDragStart={() => handleDragStart(m.id)} onDragEnd={() => setDragMember(null)}>
                      {m.name}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="teams-area">
              {teams.length === 0 ? (
                <div style={{ padding: 64, textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-color)' }}>
                  <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                  <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>No teams formed yet.</p>
                </div>
              ) : (
                teams.map(t => (
                  <div key={t.id} className="bento-card" style={{ minHeight: 280 }} onDragOver={e => e.preventDefault()} onDrop={() => handleDropOnTeam(t.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 style={{ fontSize: '1.25rem', letterSpacing: '-0.02em' }}>{t.name}</h3>
                      <button className="btn btn-secondary" style={{ padding: 6 }} onClick={async () => { if (confirm('Delete team?')) { await deleteTeam(t.id); setTeams(prev => prev.filter(team => team.id !== t.id)); } }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                      {t.memberIds?.length || 0} {competition.teamSize ? `/ ${competition.teamSize}` : ''} members
                    </div>
                    
                    <div className={`team-drop-zone ${dragMember ? 'active' : ''}`}>
                      {(!t.memberIds || t.memberIds.length === 0) ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Drop members here</p>
                      ) : (
                        t.memberIds.map(mid => {
                          const m = getMember(mid);
                          if (!m) return null;
                          return (
                            <div key={mid} className="member-chip" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} draggable onDragStart={() => handleDragStart(mid)} onDragEnd={() => setDragMember(null)}>
                              <span>{m.name}</span>
                              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => removeMemberFromTeam(t.id, mid)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="sticky-sidebar">
          <div className="bento-card">
            <h3 style={{ marginBottom: 24, fontSize: '1.25rem' }}>Details</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                <span className={`badge`} style={{ color: competition.status === 'ongoing' ? '#34d399' : '#fff' }}>
                  {competition.status || 'Upcoming'}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Deadline</span>
                <span style={{ fontWeight: 500 }}>
                  {competition.deadline ? new Date(competition.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Prize</span>
                <span style={{ fontWeight: 500 }}>{competition.prize || 'TBA'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Team Size</span>
                <span style={{ fontWeight: 500 }}>{competition.teamSizeLabel || competition.teamSize || 'Varies'}</span>
              </div>

              {competition.format && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Format</span>
                  <p style={{ margin: 0, color: 'var(--text-primary)' }}>{competition.format}</p>
                </div>
              )}
              
              {competition.eligibility && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Eligibility</span>
                  <p style={{ margin: 0, color: 'var(--text-primary)' }}>{competition.eligibility}</p>
                </div>
              )}
            </div>

            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {competition.externalLink && (
                <a href={competition.externalLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none' }}>
                  View Official Page <ExternalLink size={16} />
                </a>
              )}
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowEdit(true)}>
                <Edit3 size={16} /> Edit Competition
              </button>
              <button className="btn" style={{ width: '100%', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClick={handleDeleteComp}>
                <Trash2 size={16} /> Delete Competition
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAddTeam && (
        <Modal onClose={() => setShowAddTeam(false)} title="New Team">
          <div className="form-group">
            <label className="form-label">Team Name *</label>
            <input className="form-input" placeholder="e.g. Team Alpha" value={teamName} onChange={e => setTeamName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTeam()} />
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setShowAddTeam(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddTeam}>Create</button>
          </div>
        </Modal>
      )}

      {showEdit && <EditCompModal comp={competition} onClose={() => setShowEdit(false)} />}
    </div>
  );
}

function EditCompModal({ comp, onClose }) {
  const [form, setForm] = useState({
    name: comp.name || '', description: comp.description || '', imageUrl: comp.imageUrl || '',
    externalLink: comp.externalLink || '', teamSize: comp.teamSize || '', teamSizeLabel: comp.teamSizeLabel || '', rounds: comp.rounds || '',
    deadline: comp.deadline || '', prize: comp.prize || '', status: comp.status || 'upcoming',
    isIndividual: comp.isIndividual || false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await updateCompetition(comp.id, {
      ...form,
      teamSize: Number(form.teamSize) || 0,
      rounds: Number(form.rounds) || 0,
      teamSizeLabel: form.teamSizeLabel || (form.teamSize ? String(form.teamSize) : ''),
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} title="Edit Competition">
      <div className="form-grid">
        <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={form.description} onChange={e => set('description', e.target.value)} /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Team Size</label><input className="form-input" type="number" value={form.teamSize} onChange={e => set('teamSize', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Team Size Label</label><input className="form-input" value={form.teamSizeLabel} onChange={e => set('teamSizeLabel', e.target.value)} placeholder="e.g. 1–3" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Rounds</label><input className="form-input" type="number" value={form.rounds} onChange={e => set('rounds', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Deadline</label><input className="form-input" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Prize</label><input className="form-input" value={form.prize} onChange={e => set('prize', e.target.value)} /></div>
        </div>
        <div className="form-group"><label className="form-label">Image URL</label><input className="form-input" value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Link</label><input className="form-input" value={form.externalLink} onChange={e => set('externalLink', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Status</label>
          <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option>
          </select>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Update'}</button>
      </div>
    </Modal>
  );
}
