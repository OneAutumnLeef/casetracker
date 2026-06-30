import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../App';
import { addMember, addMembers, updateMember, deleteMember } from '../firebase/services';
import { Plus, Search, Trash2, Edit3, User, Upload, Users } from 'lucide-react';
import Modal from '../components/Modal';
import Avatar from '../components/Avatar';
import { AVATAR_COLORS, colorForName, parseMemberLines, composition, totalTeamsForMember } from '../utils';

export default function MembersPage() {
  const { members, allTeams, loading } = useAppData();
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [search, setSearch] = useState('');
  const [gFilter, setGFilter] = useState('all');
  const [bFilter, setBFilter] = useState('all');
  const navigate = useNavigate();

  const filtered = members.filter((m) => {
    if (search && !m.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (gFilter !== 'all' && m.gender !== gFilter) return false;
    if (bFilter !== 'all' && m.background !== bFilter) return false;
    return true;
  });
  const c = composition(members);

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1 className="hero-title">Community.</h1>
        <p>Your batch. Each person is tagged by gender and engineering background to help build balanced teams.</p>
      </div>

      {members.length > 0 && (
        <div className="stat-strip">
          <div className="stat-cell"><div className="stat-value">{c.total}</div><div className="stat-label">People</div></div>
          <div className="stat-cell"><div className="stat-value">{c.male}/{c.female}</div><div className="stat-label">Male / Female</div></div>
          <div className="stat-cell"><div className="stat-value">{c.eng}/{c.nonEng}</div><div className="stat-label">Eng / Non-eng</div></div>
        </div>
      )}

      <div className="toolbar">
        <div className="search-bar">
          <Search size={18} />
          <input className="form-input" placeholder="Search members…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filters">
          {['all', 'male', 'female'].map((f) => (
            <button key={f} className={`filter-chip${gFilter === f ? ' active' : ''}`} onClick={() => setGFilter(f)}>
              {f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span className="filter-sep" />
          {['all', 'engineering', 'non-engineering'].map((f) => (
            <button key={f} className={`filter-chip${bFilter === f ? ' active' : ''}`} onClick={() => setBFilter(f)}>
              {f === 'all' ? 'All' : f === 'engineering' ? 'Eng' : 'Non-eng'}
            </button>
          ))}
        </div>
        <div className="toolbar-spacer" />
        <button className="btn btn-secondary" onClick={() => setShowBulk(true)}><Upload size={16} /> Bulk import</button>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add member</button>
      </div>

      {loading ? (
        <div className="member-grid">{[...Array(8)].map((_, i) => <div key={i} className="member-card skeleton" />)}</div>
      ) : members.length === 0 ? (
        <div className="empty-card">
          <Users size={44} />
          <h3>No members yet</h3>
          <p>Add your batch to start forming teams. The fastest way is bulk import.</p>
          <button className="btn btn-primary" onClick={() => setShowBulk(true)}><Upload size={16} /> Bulk import members</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-card"><User size={44} /><h3>No members match</h3><p>Try a different search or filter.</p></div>
      ) : (
        <div className="member-grid">
          {filtered.map((m) => (
            <div key={m.id} className="member-card" onClick={() => navigate(`/member/${m.id}`)}>
              <Avatar member={m} size={52} />
              <div className="member-info">
                <div className="member-name">{m.name}</div>
                <div className="member-tags">
                  <span className={`mini-tag ${m.gender}`}>{m.gender === 'male' ? 'M' : 'F'}</span>
                  <span className="mini-tag bg">{m.background === 'engineering' ? 'Eng' : 'Non-eng'}</span>
                  <span className="mini-tag count">{totalTeamsForMember(allTeams, m.id)} teams</span>
                </div>
              </div>
              <div className="member-actions" onClick={(e) => e.stopPropagation()}>
                <button className="icon-btn" onClick={() => setEditMember(m)}><Edit3 size={15} /></button>
                <button className="icon-btn danger" onClick={() => confirm(`Delete ${m.name}?`) && deleteMember(m.id)}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editMember) && <MemberModal member={editMember} onClose={() => { setShowAdd(false); setEditMember(null); }} />}
      {showBulk && <BulkModal existing={members} onClose={() => setShowBulk(false)} />}
    </div>
  );
}

function MemberModal({ member, onClose }) {
  const [form, setForm] = useState({
    name: member?.name || '',
    gender: member?.gender || 'male',
    background: member?.background || 'engineering',
    color: member?.color || colorForName(member?.name || ''),
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (member) await updateMember(member.id, form); else await addMember(form);
      onClose();
    } catch (e) { console.error(e); setSaving(false); }
  };

  return (
    <Modal onClose={onClose} title={member ? 'Edit member' : 'Add member'}>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="form-input" placeholder="Full name" value={form.name} autoFocus onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select className="form-input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="male">Male</option><option value="female">Female</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Background</label>
            <select className="form-input" value={form.background} onChange={(e) => set('background', e.target.value)}>
              <option value="engineering">Engineering</option><option value="non-engineering">Non-Engineering</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Avatar colour</label>
          <div className="color-row">
            {AVATAR_COLORS.map((col) => (
              <button key={col} className={`swatch${form.color === col ? ' on' : ''}`} style={{ background: col }} onClick={() => set('color', col)} />
            ))}
          </div>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving || !form.name.trim()}>{saving ? 'Saving…' : member ? 'Save' : 'Add'}</button>
      </div>
    </Modal>
  );
}

function BulkModal({ existing, onClose }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const parsed = parseMemberLines(text);
  const existingNames = new Set(existing.map((m) => m.name?.toLowerCase()));
  const fresh = parsed.filter((m) => !existingNames.has(m.name.toLowerCase()));
  const dupes = parsed.length - fresh.length;

  const save = async () => {
    if (!fresh.length) return;
    setSaving(true);
    try { await addMembers(fresh); onClose(); }
    catch (e) { console.error(e); setSaving(false); }
  };

  return (
    <Modal onClose={onClose} title="Bulk import members">
      <div className="form-grid">
        <p className="muted sm">
          One person per line. Optionally add gender and background after a comma — order doesn't matter.<br />
          <code>Priya, female, non-engineering</code> · <code>Arjun, m, eng</code> · <code>Karthik</code>
        </p>
        <textarea
          className="form-input mono"
          style={{ minHeight: 180 }}
          placeholder={'Priya, female, non-eng\nArjun, male, engineering\nKarthik\nMeena, f'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        {parsed.length > 0 && (
          <div className="bulk-preview">
            <div className="bulk-preview-head">
              {fresh.length} to add{dupes > 0 ? ` · ${dupes} duplicate${dupes !== 1 ? 's' : ''} skipped` : ''}
            </div>
            <div className="bulk-chips">
              {fresh.slice(0, 30).map((m, i) => (
                <span key={i} className="bulk-chip">
                  <span className={`dot ${m.gender}`} /> {m.name} <em>{m.background === 'engineering' ? 'E' : 'N'}</em>
                </span>
              ))}
              {fresh.length > 30 && <span className="bulk-chip">+{fresh.length - 30} more</span>}
            </div>
          </div>
        )}
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving || !fresh.length}>{saving ? 'Adding…' : `Add ${fresh.length} member${fresh.length !== 1 ? 's' : ''}`}</button>
      </div>
    </Modal>
  );
}
