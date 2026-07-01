import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../App';
import {
  Calendar, Award, Users, Layers, CalendarX, ChevronLeft, ChevronRight, List, LayoutGrid, Check, Clock, CircleDashed, CalendarPlus,
} from 'lucide-react';
import {
  deadlineInfo, daysUntil, formatDate, eventType, EVENT_TYPES, EVENT_TYPE_KEYS,
  eventsByDate, monthGrid, isoDate, sameDay, colorForName, initials, buildICS,
} from '../utils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
  const { competitions, allTeams, viewMember } = useAppData();
  const navigate = useNavigate();
  const [view, setView] = useState('month');
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(null);

  // The member's status for a competition (drives the personalized view).
  const memberStatus = (comp) => {
    if (!viewMember) return null;
    const team = allTeams.find((t) => t.competitionId === comp.id && t.memberIds?.includes(viewMember.id));
    if (!team) return { state: 'none', label: 'Not joined', team: null };
    if (team.registered) return { state: 'registered', label: 'Registered', team };
    return { state: 'pending', label: 'Team formed', team };
  };

  // When viewing as a person, the calendar shows only their competitions.
  const viewComps = useMemo(() => {
    if (!viewMember) return competitions;
    return competitions.filter((c) => allTeams.some((t) => t.competitionId === c.id && t.memberIds?.includes(viewMember.id)));
  }, [competitions, allTeams, viewMember]);

  const byDate = useMemo(() => eventsByDate(viewComps), [viewComps]);
  const peopleIn = (id) => new Set(allTeams.filter((t) => t.competitionId === id).flatMap((t) => t.memberIds || [])).size;

  // ── Month view ─────────────────────────────────────
  const days = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor]);
  const monthEventCount = useMemo(
    () => days.filter((d) => d.getMonth() === cursor.m).reduce((n, d) => n + (byDate[isoDate(d)]?.length || 0), 0),
    [days, byDate, cursor.m],
  );
  const step = (delta) => { setSelected(null); setCursor((c) => { const d = new Date(c.y, c.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; }); };
  const goToday = () => { setSelected(null); setCursor({ y: now.getFullYear(), m: now.getMonth() }); };
  const selectedEvents = selected ? (byDate[selected] || []) : [];

  const exportIcs = () => {
    const ics = buildICS(viewComps, viewMember ? `${viewMember.name} — Case Comps` : 'Case Competitions');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url; a.download = viewMember ? `${viewMember.name.replace(/[^\w]+/g, '-')}-casecomps.ics` : 'casetracker-deadlines.ics'; a.click();
    URL.revokeObjectURL(url);
  };

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
          return (
            <div
              key={iso}
              className={`cal-cell${dim ? ' dim' : ''}${isToday ? ' today' : ''}${evs.length ? ' has' : ''}${selected === iso ? ' selected' : ''}`}
              onClick={() => setSelected(evs.length ? (selected === iso ? null : iso) : null)}
            >
              <span className="cal-cell-day">{d.getDate()}{isToday && <em> Today</em>}</span>
              <div className="cal-cell-events">
                {evs.slice(0, 3).map((e, i) => (
                  <span
                    key={i}
                    className="cal-evt"
                    style={{ borderLeftColor: eventType(e.type).color }}
                    onClick={(ev) => { ev.stopPropagation(); navigate(`/competition/${e.compId}`); }}
                    title={`${e.comp.name} — ${e.label}`}
                  >
                    {e.comp.name}
                  </span>
                ))}
                {evs.length > 3 && <span className="cal-more">+{evs.length - 3} more</span>}
              </div>
            </div>
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
    const dated = viewComps.filter((c) => c.deadline).map((c) => ({ ...c, _d: daysUntil(c.deadline) })).sort((a, b) => a._d - b._d);
    const g = { past: [], soon: [], later: [] };
    dated.forEach((c) => { g[c._d < 0 ? 'past' : c._d <= 7 ? 'soon' : 'later'].push(c); });
    return { groups: g, undated: viewComps.filter((c) => !c.deadline) };
  }, [viewComps]);

  const Row = (c) => {
    const dl = deadlineInfo(c.deadline);
    const st = memberStatus(c);
    return (
      <div key={c.id} className="cal-row" onClick={() => navigate(`/competition/${c.id}`)}>
        <div className={`cal-date ${dl.tone}`}>
          <span className="cal-day">{c.deadline ? new Date(c.deadline).getDate() : '—'}</span>
          <span className="cal-mon">{c.deadline ? new Date(c.deadline).toLocaleDateString('en-IN', { month: 'short' }) : ''}</span>
        </div>
        <div className="cal-body"><div className="cal-name">{c.name}</div><div className="cal-meta">{c.organizer}</div></div>
        <div className="cal-side">
          {st ? <StatusChip st={st} /> : <span className={`deadline-tag ${dl.tone}`}>{dl.label}</span>}
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
  const ListView = (
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

  // ── Personalized status board (when viewing as a member) ──
  const board = viewMember ? competitions.map((c) => ({ comp: c, st: memberStatus(c) }))
    .sort((a, b) => (b.st.state !== 'none' ? 1 : 0) - (a.st.state !== 'none' ? 1 : 0)) : [];
  const counts = board.reduce((acc, { st }) => { acc[st.state]++; return acc; }, { registered: 0, pending: 0, none: 0 });

  const empty = competitions.length === 0;
  const noneForMember = viewMember && viewComps.length === 0;

  return (
    <div className="animate-fade-up">
      <div className="page-header cal-header">
        <div>
          <h1 className="hero-title">{viewMember ? `${viewMember.name.split(' ')[0]}'s calendar.` : 'Calendar.'}</h1>
          <p>{viewMember ? `Showing ${viewMember.name}'s competitions and registration status. Switch person from the top bar.` : 'Every deadline and round across all competitions, so nothing slips.'}</p>
        </div>
        <div className="cal-header-actions">
          <button className="btn btn-secondary" onClick={exportIcs} title="Download .ics for Google / Apple Calendar"><CalendarPlus size={15} /> Export</button>
          <div className="view-toggle">
            <button className={`vt-btn${view === 'month' ? ' active' : ''}`} onClick={() => setView('month')}><LayoutGrid size={15} /> Month</button>
            <button className={`vt-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}><List size={15} /> List</button>
          </div>
        </div>
      </div>

      {viewMember && (
        <div className="board">
          <div className="board-summary">
            <span className="board-pill registered"><Check size={13} /> {counts.registered} registered</span>
            <span className="board-pill pending"><Clock size={13} /> {counts.pending} team formed</span>
            <span className="board-pill none"><CircleDashed size={13} /> {counts.none} not joined</span>
          </div>
          <div className="board-grid">
            {board.map(({ comp, st }) => {
              const dl = deadlineInfo(comp.deadline);
              return (
                <div key={comp.id} className={`board-card ${st.state}`} onClick={() => navigate(`/competition/${comp.id}`)}>
                  <div className="board-card-top">
                    <span className="board-card-name">{comp.name}</span>
                    <StatusChip st={st} />
                  </div>
                  <div className="board-card-meta">
                    {st.team && <span><Users size={12} /> {st.team.name}{comp.rounds > 0 ? ` · R${st.team.round || 0}/${comp.rounds}` : ''}</span>}
                    {comp.deadline && <span className={`deadline-tag ${dl.tone}`}><Calendar size={11} /> {formatDate(comp.deadline, { day: 'numeric', month: 'short' })} · {dl.label}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {empty ? (
        <div className="empty-card"><Calendar size={44} /><h3>Nothing scheduled</h3><p>Add competitions to see deadlines here.</p></div>
      ) : noneForMember ? (
        <div className="empty-card"><Calendar size={44} /><h3>{viewMember.name} isn't on any team yet</h3><p>Add them to a team on a competition page, then their schedule shows up here.</p></div>
      ) : view === 'month' ? MonthView : ListView}
    </div>
  );
}

function StatusChip({ st }) {
  const map = {
    registered: { cls: 'registered', icon: <Check size={12} /> },
    pending: { cls: 'pending', icon: <Clock size={12} /> },
    none: { cls: 'none', icon: <CircleDashed size={12} /> },
  };
  const s = map[st.state];
  return <span className={`status-chip ${s.cls}`}>{s.icon} {st.label}</span>;
}
