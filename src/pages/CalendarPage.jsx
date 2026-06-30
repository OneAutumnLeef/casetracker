import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../App';
import { Calendar, Award, Users, Layers, CalendarX, ChevronLeft, ChevronRight, List, LayoutGrid } from 'lucide-react';
import {
  deadlineInfo, daysUntil, formatDate, eventType, EVENT_TYPES, EVENT_TYPE_KEYS,
  eventsByDate, monthGrid, isoDate, sameDay, colorForName, initials,
} from '../utils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// A small mark for a competition: its logo if it has one, else initials chip.
function CompMark({ comp, size = 26 }) {
  const [broken, setBroken] = useState(false);
  if (comp.imageUrl && !broken) {
    return <img className="cal-mark-img" src={comp.imageUrl} alt={comp.name} style={{ width: size, height: size }} onError={() => setBroken(true)} />;
  }
  return (
    <span className="cal-mark-fallback" style={{ width: size, height: size, background: colorForName(comp.name), fontSize: size * 0.38 }}>
      {initials(comp.name)}
    </span>
  );
}

export default function CalendarPage() {
  const { competitions, allTeams } = useAppData();
  const navigate = useNavigate();
  const [view, setView] = useState('month'); // 'month' | 'list'
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(null); // ISO date string

  const byDate = useMemo(() => eventsByDate(competitions), [competitions]);
  const peopleIn = (id) => new Set(allTeams.filter((t) => t.competitionId === id).flatMap((t) => t.memberIds || [])).size;

  // ── Month view ─────────────────────────────────────
  const days = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor]);
  const monthEventCount = useMemo(
    () => days.filter((d) => d.getMonth() === cursor.m).reduce((n, d) => n + (byDate[isoDate(d)]?.length || 0), 0),
    [days, byDate, cursor.m],
  );
  const step = (delta) => {
    setSelected(null);
    setCursor((c) => { const d = new Date(c.y, c.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  };
  const goToday = () => { setSelected(null); setCursor({ y: now.getFullYear(), m: now.getMonth() }); };

  const selectedEvents = selected ? (byDate[selected] || []) : [];

  const MonthView = (
    <div className="cal-wrap">
      <div className="cal-toolbar">
        <div className="cal-month-nav">
          <button className="icon-btn" onClick={() => step(-1)}><ChevronLeft size={18} /></button>
          <h2 className="cal-month-title">{MONTHS[cursor.m]} <span>{cursor.y}</span></h2>
          <button className="icon-btn" onClick={() => step(1)}><ChevronRight size={18} /></button>
        </div>
        <div className="cal-month-meta">
          <span className="cal-total">{monthEventCount} event{monthEventCount !== 1 ? 's' : ''}</span>
          <button className="btn btn-secondary cal-today" onClick={goToday}>Today</button>
        </div>
      </div>

      <div className="cal-legend">
        {EVENT_TYPE_KEYS.map((k) => (
          <span key={k} className="cal-legend-item"><span className="dot" style={{ background: EVENT_TYPES[k].color }} /> {EVENT_TYPES[k].label}</span>
        ))}
      </div>

      <div className="cal-grid">
        {WEEKDAYS.map((w) => <div key={w} className="cal-weekday">{w}</div>)}
        {days.map((d) => {
          const iso = isoDate(d);
          const evs = byDate[iso] || [];
          const dim = d.getMonth() !== cursor.m;
          const isToday = sameDay(d, now);
          const types = [...new Set(evs.map((e) => e.type))];
          return (
            <button
              key={iso}
              className={`cal-cell${dim ? ' dim' : ''}${isToday ? ' today' : ''}${evs.length ? ' has' : ''}${selected === iso ? ' selected' : ''}`}
              onClick={() => setSelected(evs.length ? (selected === iso ? null : iso) : null)}
            >
              <span className="cal-cell-day">{d.getDate()}</span>
              {evs.length > 0 && (
                <span className="cal-cell-dots">
                  {types.slice(0, 4).map((t) => <span key={t} className="dot" style={{ background: eventType(t).color }} />)}
                </span>
              )}
              {evs.length > 0 && (
                <span className="cal-cell-marks">
                  {evs.slice(0, 3).map((e, i) => (
                    <span key={i} className="cal-mark" onClick={(ev) => { ev.stopPropagation(); navigate(`/competition/${e.compId}`); }} title={`${e.comp.name} — ${e.label}`}>
                      <CompMark comp={e.comp} size={evs.length > 1 ? 22 : 28} />
                    </span>
                  ))}
                  {evs.length > 3 && <span className="cal-more">+{evs.length - 3}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="cal-day-detail">
          <h3>{formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
          {selectedEvents.map((e, i) => {
            const t = eventType(e.type);
            return (
              <div key={i} className="cal-detail-row" onClick={() => navigate(`/competition/${e.compId}`)}>
                <CompMark comp={e.comp} size={34} />
                <div className="cal-detail-body">
                  <div className="cal-detail-name">{e.comp.name}</div>
                  <div className="cal-detail-label">{e.label}{e.time ? ` · ${e.time}` : ''}</div>
                </div>
                <span className="tl-type" style={{ color: t.color, borderColor: t.color + '55' }}>{t.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── List view ──────────────────────────────────────
  const { groups, undated } = useMemo(() => {
    const dated = competitions.filter((c) => c.deadline).map((c) => ({ ...c, _d: daysUntil(c.deadline) })).sort((a, b) => a._d - b._d);
    const g = { past: [], soon: [], later: [] };
    dated.forEach((c) => { g[c._d < 0 ? 'past' : c._d <= 7 ? 'soon' : 'later'].push(c); });
    return { groups: g, undated: competitions.filter((c) => !c.deadline) };
  }, [competitions]);

  const Row = (c) => {
    const dl = deadlineInfo(c.deadline);
    return (
      <div key={c.id} className="cal-row" onClick={() => navigate(`/competition/${c.id}`)}>
        <div className={`cal-date ${dl.tone}`}>
          <span className="cal-day">{c.deadline ? new Date(c.deadline).getDate() : '—'}</span>
          <span className="cal-mon">{c.deadline ? new Date(c.deadline).toLocaleDateString('en-IN', { month: 'short' }) : ''}</span>
        </div>
        <div className="cal-body"><div className="cal-name">{c.name}</div><div className="cal-meta">{c.organizer}</div></div>
        <div className="cal-side">
          <span className={`deadline-tag ${dl.tone}`}>{dl.label}</span>
          <div className="cal-badges">
            {c.prize && c.prize !== 'TBA' && <span className="badge strong"><Award size={11} /> {c.prize}</span>}
            {!c.isIndividual && <span className="badge"><Users size={11} /> {peopleIn(c.id)} in</span>}
            {c.rounds > 0 && <span className="badge"><Layers size={11} /> {c.rounds}R</span>}
          </div>
        </div>
      </div>
    );
  };
  const Section = ({ title, items, tone }) => items.length > 0 && (
    <section className="cal-section">
      <h3 className={`cal-section-title ${tone || ''}`}>{title} <span className="count-badge">{items.length}</span></h3>
      <div className="cal-list">{items.map(Row)}</div>
    </section>
  );

  const ListView = competitions.length === 0 ? null : (
    <>
      <Section title="Due this week" items={groups.soon} tone="soon" />
      <Section title="Upcoming" items={groups.later} />
      {undated.length > 0 && (
        <section className="cal-section">
          <h3 className="cal-section-title"><CalendarX size={18} style={{ verticalAlign: '-3px' }} /> Date not announced <span className="count-badge">{undated.length}</span></h3>
          <div className="cal-list">{undated.map(Row)}</div>
        </section>
      )}
      <Section title="Closed" items={groups.past} tone="past" />
    </>
  );

  return (
    <div className="animate-fade-up">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, maxWidth: 'none' }}>
        <div>
          <h1 className="hero-title">Calendar.</h1>
          <p>Every deadline and round across all competitions, so nothing slips.</p>
        </div>
        <div className="view-toggle">
          <button className={`vt-btn${view === 'month' ? ' active' : ''}`} onClick={() => setView('month')}><LayoutGrid size={15} /> Month</button>
          <button className={`vt-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}><List size={15} /> List</button>
        </div>
      </div>

      {competitions.length === 0 ? (
        <div className="empty-card"><Calendar size={44} /><h3>Nothing scheduled</h3><p>Add competitions to see deadlines here.</p></div>
      ) : view === 'month' ? MonthView : ListView}
    </div>
  );
}
