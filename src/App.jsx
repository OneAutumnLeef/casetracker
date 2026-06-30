import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  subscribeMembers, subscribeCompetitions, subscribeAllTeams, reconcileSeedCompetitions, isOffline,
} from './firebase/services';
import { Menu, X, WifiOff, UserCircle2 } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import MembersPage from './pages/MembersPage';
import CompetitionPage from './pages/CompetitionPage';
import MemberProfile from './pages/MemberProfile';
import CalendarPage from './pages/CalendarPage';
import Instructions from './pages/Instructions';
import CompetitionFormModal from './components/CompetitionFormModal';

export const AppContext = createContext();
export const useAppData = () => useContext(AppContext);

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/calendar', label: 'Calendar' },
  { to: '/members', label: 'Community' },
  { to: '/help', label: 'Help' },
];

const VIEW_KEY = 'ct_viewMember';

export default function App() {
  const [members, setMembers] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [viewMemberId, setViewMemberId] = useState(() => localStorage.getItem(VIEW_KEY) || '');
  const [, setTick] = useState(0); // heartbeat → keeps relative dates fresh
  const seededRef = useRef(false);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location]);

  useEffect(() => {
    const unsubs = [
      subscribeMembers(setMembers),
      subscribeCompetitions((d) => {
        setCompetitions(d);
        setLoading(false);
        if (!seededRef.current) { seededRef.current = true; reconcileSeedCompetitions(d); }
      }),
      subscribeAllTeams(setAllTeams),
    ];
    return () => unsubs.forEach((u) => u && u());
  }, []);

  // Re-render periodically (and on refocus) so "X days left" / past styling stays
  // accurate as real time passes without a manual reload.
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const id = setInterval(bump, 60000);
    document.addEventListener('visibilitychange', bump);
    window.addEventListener('focus', bump);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', bump); window.removeEventListener('focus', bump); };
  }, []);

  const setViewMember = (id) => {
    setViewMemberId(id);
    if (id) localStorage.setItem(VIEW_KEY, id); else localStorage.removeItem(VIEW_KEY);
  };
  // If the stored member was deleted, fall back to Everyone.
  const viewMember = members.find((m) => m.id === viewMemberId) || null;
  useEffect(() => {
    if (viewMemberId && members.length && !viewMember) setViewMember('');
  }, [members, viewMemberId, viewMember]);

  return (
    <AppContext.Provider value={{ members, competitions, allTeams, loading, viewMember, viewMemberId, setViewMember }}>
      <div className="app-layout">
        <header className="top-nav">
          <div className="nav-left">
            <NavLink to="/" className="logo">
              <div className="logo-icon">CT</div>
              <span>CaseTracker</span>
            </NavLink>
            <nav className="nav-links">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="nav-right">
            <MemberChooser members={members} value={viewMemberId} onChange={setViewMember} />
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>New competition</button>
            <button className="btn-icon mobile-only" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>

        {mobileOpen && (
          <nav className="mobile-nav">
            <MemberChooser members={members} value={viewMemberId} onChange={setViewMember} block />
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}

        {isOffline() && (
          <div className="offline-banner">
            <WifiOff size={14} /> Offline mode — changes are saved only on this device and won't be shared.
          </div>
        )}

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard onAdd={() => setShowAdd(true)} />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/competition/:id" element={<CompetitionPage />} />
            <Route path="/member/:id" element={<MemberProfile />} />
            <Route path="/help" element={<Instructions />} />
          </Routes>
        </main>
      </div>

      {showAdd && <CompetitionFormModal onClose={() => setShowAdd(false)} />}
    </AppContext.Provider>
  );
}

// Global "viewing as" selector — pick a person to see their personalized
// registered/not-registered view and a calendar filtered to their competitions.
function MemberChooser({ members, value, onChange, block }) {
  return (
    <label className={`member-chooser${block ? ' block' : ''}${value ? ' on' : ''}`}>
      <UserCircle2 size={16} />
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Everyone</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </label>
  );
}
