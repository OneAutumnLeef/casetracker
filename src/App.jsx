import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { subscribeMembers, subscribeCompetitions, subscribeAllTeams } from './firebase/services';
import { LayoutDashboard, Users, Trophy, HelpCircle, Menu, X } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import MembersPage from './pages/MembersPage';
import CompetitionPage from './pages/CompetitionPage';
import MemberProfile from './pages/MemberProfile';
import Instructions from './pages/Instructions';

export const AppContext = createContext();
export const useAppData = () => useContext(AppContext);

export default function App() {
  const [members, setMembers] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location]);

  useEffect(() => {
    const unsubs = [
      subscribeMembers(d => { setMembers(d); setLoading(false); }),
      subscribeCompetitions(async (d) => {
        setCompetitions(d);
        const { seedCompetitions } = await import('./data/seedData');
        const { addCompetition, updateCompetition } = await import('./firebase/services');
        
        if (d.length === 0) {
          for (const c of seedCompetitions) {
            try {
              await addCompetition(c);
            } catch (error) {
              console.warn('Seed competition add skipped:', c.id, error);
            }
          }
        } else {
          for (const c of d) {
            const matchedSeed = seedCompetitions.find(s => s.name === c.name);
            if (matchedSeed && c.imageUrl !== matchedSeed.imageUrl) {
              try {
                await updateCompetition(c.id, { imageUrl: matchedSeed.imageUrl });
              } catch (error) {
                console.warn('Seed competition update skipped:', c.id, error);
              }
            }
          }
        }
      }),
      subscribeAllTeams(setAllTeams),
    ];
    return () => unsubs.forEach(u => u());
  }, [loading]);

  const nav = [
    { to: '/', label: 'Overview' },
    { to: '/members', label: 'Community' },
    { to: '/instructions', label: 'Help' },
  ];

  const [showAddModal, setShowAddModal] = useState(false);
  useEffect(() => {
    const handleOpenAdd = () => setShowAddModal(true);
    window.addEventListener('openAddModal', handleOpenAdd);
    return () => window.removeEventListener('openAddModal', handleOpenAdd);
  }, []);

  return (
    <AppContext.Provider value={{ members, competitions, allTeams, loading }}>
      <div className="app-layout">
        <header className="top-nav">
          <div className="nav-left">
            <NavLink to="/" className="logo">
              <div className="logo-icon">CT</div>
              <span>CaseTracker</span>
            </NavLink>
            <nav className="nav-links">
              {nav.map(n => (
                <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="nav-right">
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              New Competition
            </button>
          </div>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/competition/:id" element={<CompetitionPage />} />
            <Route path="/member/:id" element={<MemberProfile />} />
            <Route path="/instructions" element={<Instructions />} />
          </Routes>
        </main>
      </div>
      {showAddModal && <AddCompetitionModal onClose={() => setShowAddModal(false)} />}
    </AppContext.Provider>
  );
}

function AddCompetitionModal({ onClose }) {
  const [form, setForm] = useState({
    name: '', organizer: '', description: '', format: '', imageUrl: '', externalLink: '',
    teamSize: '', teamSizeLabel: '', rounds: '', deadline: '', prize: '', regFee: 'Free',
    eligibility: '', status: 'upcoming', isIndividual: false, unconfirmed: false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { addCompetition } = await import('./firebase/services');
      await addCompetition({
        ...form,
        teamSize: Number(form.teamSize) || 0,
        rounds: Number(form.rounds) || 0,
        teamSizeLabel: form.teamSizeLabel || (form.teamSize ? String(form.teamSize) : ''),
      });
      onClose();
    } catch (e) { console.error(e); setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass modal" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
        <div className="modal-header" style={{ padding: 24, borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-white)' }}>New Competition</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: 24 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Competition Name *</label>
            <input className="form-input" placeholder="e.g. Trilytics '26" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Organizer</label>
            <input className="form-input" placeholder="e.g. IIM Calcutta" value={form.organizer} onChange={e => set('organizer', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Description</label>
            <textarea className="form-input" placeholder="Brief about the competition..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Image URL</label>
            <input className="form-input" placeholder="https://..." value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Team Size</label>
              <input className="form-input" type="number" min="1" placeholder="e.g. 3" value={form.teamSize} onChange={e => set('teamSize', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Team Size Label</label>
              <input className="form-input" placeholder="e.g. 1–3" value={form.teamSizeLabel} onChange={e => set('teamSizeLabel', e.target.value)} />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Deadline</label>
              <input className="form-input" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Prize</label>
              <input className="form-input" placeholder="e.g. ₹2,50,000" value={form.prize} onChange={e => set('prize', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-actions" style={{ padding: 24, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Add Competition'}</button>
        </div>
      </div>
    </div>
  );
}
