import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  subscribeMembers, subscribeCompetitions, subscribeAllTeams, reconcileSeedCompetitions, isOffline,
} from './firebase/services';
import { Menu, X, WifiOff } from 'lucide-react';
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

export default function App() {
  const [members, setMembers] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location]);

  useEffect(() => {
    const unsubs = [
      subscribeMembers(setMembers),
      subscribeCompetitions((d) => {
        setCompetitions(d);
        setLoading(false);
        if (!seeded) { setSeeded(true); reconcileSeedCompetitions(d); }
      }),
      subscribeAllTeams(setAllTeams),
    ];
    return () => unsubs.forEach((u) => u && u());
  }, [seeded]);

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
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="nav-right">
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>New competition</button>
            <button className="btn-icon mobile-only" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>

        {mobileOpen && (
          <nav className="mobile-nav">
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
