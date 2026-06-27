import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../App';
import { addMember, updateMember, deleteMember } from '../firebase/services';
import { Plus, Search, Trash2, Edit3, User } from 'lucide-react';
import Modal from '../components/Modal';

const COLORS = ['#6c5ce7', '#00cec9', '#fd79a8', '#e17055', '#00b894', '#a29bfe', '#74b9ff', '#fdcb6e'];

export default function MembersPage() {
  const { members, allTeams, competitions, loading } = useAppData();
  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [search, setSearch] = useState('');
  const [gFilter, setGFilter] = useState('all');
  const [bFilter, setBFilter] = useState('all');
  const navigate = useNavigate();

  const filtered = members.filter(m => {
    if (search && !m.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (gFilter !== 'all' && m.gender !== gFilter) return false;
    if (bFilter !== 'all' && m.background !== bFilter) return false;
    return true;
  });

  const getTeamCount = (memberId) => allTeams.filter(t => t.memberIds?.includes(memberId)).length;

  return (
    <div className="animate-fade-up">
      <div className="page-header" style={{ marginBottom: 48 }}>
        <h1 className="hero-title">Community.</h1>
        <p>Manage and view all members in your batch.</p>
      </div>

      <div className="toolbar" style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <div className="search-bar">
          <Search size={18} />
          <input className="form-input" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filters">
          {['all', 'male', 'female'].map(f => (
            <button key={f} className={`filter-chip${gFilter === f ? ' active' : ''}`} onClick={() => setGFilter(f)}>
              {f === 'all' ? 'All Genders' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <div style={{ width: 1, background: 'var(--border-color)', margin: '0 8px' }} />
          {['all', 'engineering', 'non-engineering'].map(f => (
            <button key={f} className={`filter-chip${bFilter === f ? ' active' : ''}`} onClick={() => setBFilter(f)}>
              {f === 'all' ? 'All Backgrounds' : f === 'engineering' ? 'Engineering' : 'Non-Engineering'}
            </button>
          ))}
        </div>
        <div className="toolbar-spacer" style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Member
        </button>
      </div>

      {loading ? (
        <div className="bento-grid">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bento-card col-span-4" style={{ height: 120, background: '#111' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bento-card col-span-12" style={{ alignItems: 'center', textAlign: 'center', padding: '64px' }}>
          <User size={48} style={{ color: 'var(--text-muted)', marginBottom: 24 }} />
          <h3 className="section-title" style={{ marginBottom: 8 }}>No members found</h3>
          <p>Add community members to start forming teams.</p>
        </div>
      ) : (
        <div className="bento-grid">
          {filtered.map(m => (
            <div key={m.id} className="bento-card col-span-4" style={{ padding: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, flexDirection: 'row' }} onClick={() => navigate(`/member/${m.id}`)}>
              <div style={{ background: m.color || COLORS[0], width: 56, height: 56, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                {m.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: '1.1rem', marginBottom: 8, letterSpacing: '-0.02em', color: 'var(--text-white)' }}>{m.name}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="badge">{m.gender === 'male' ? 'Male' : 'Female'}</span>
                  <span className="badge">{m.background === 'engineering' ? 'Eng' : 'Non-Eng'}</span>
                  <span className="badge" style={{ borderColor: 'rgba(255, 255, 255, 0.2)', color: '#fff' }}>{getTeamCount(m.id)} teams</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn-secondary" style={{ padding: 8, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={e => { e.stopPropagation(); setEditMember(m); }}><Edit3 size={16} /></button>
                <button style={{ padding: 8, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }} onClick={e => { e.stopPropagation(); if (confirm('Delete ' + m.name + '?')) deleteMember(m.id); }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editMember) && (
        <MemberModal member={editMember} onClose={() => { setShowAdd(false); setEditMember(null); }} />
      )}
    </div>
  );
}

function MemberModal({ member, onClose }) {
  const [form, setForm] = useState({
    name: member?.name || '',
    gender: member?.gender || 'male',
    background: member?.background || 'engineering',
    color: member?.color || COLORS[Math.floor(Math.random() * COLORS.length)],
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (member) { await updateMember(member.id, form); }
      else { await addMember(form); }
      onClose();
    } catch (e) { console.error(e); setSaving(false); }
  };

  return (
    <Modal onClose={onClose} title={member ? 'Edit Member' : 'Add Member'}>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="form-input" placeholder="Full name" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select className="form-input" value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Background</label>
            <select className="form-input" value={form.background} onChange={e => set('background', e.target.value)}>
              <option value="engineering">Engineering</option>
              <option value="non-engineering">Non-Engineering</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Avatar Color</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => set('color', c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', transition: 'var(--transition)' }} />
            ))}
          </div>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : member ? 'Update' : 'Add Member'}</button>
      </div>
    </Modal>
  );
}

