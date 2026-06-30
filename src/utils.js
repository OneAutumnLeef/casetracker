// ── Shared helpers ───────────────────────────────────

export const AVATAR_COLORS = [
  '#6c5ce7', '#00cec9', '#fd79a8', '#e17055', '#00b894',
  '#a29bfe', '#74b9ff', '#fdcb6e', '#ff7675', '#55efc4',
];

export const colorForName = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

// Composition of a set of members: gender + background counts.
export const composition = (members) => {
  const c = { total: members.length, male: 0, female: 0, eng: 0, nonEng: 0 };
  members.forEach((m) => {
    if (m.gender === 'female') c.female++; else c.male++;
    if (m.background === 'non-engineering') c.nonEng++; else c.eng++;
  });
  return c;
};

// ── Deadlines ────────────────────────────────────────
export const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target - startOfToday()) / 86400000);
};

// Returns { label, tone } where tone ∈ 'past' | 'soon' | 'ok' | 'none'
export const deadlineInfo = (dateStr) => {
  const d = daysUntil(dateStr);
  if (d === null) return { label: 'No deadline', tone: 'none', days: null };
  if (d < 0) return { label: 'Closed', tone: 'past', days: d };
  if (d === 0) return { label: 'Due today', tone: 'soon', days: 0 };
  if (d === 1) return { label: 'Due tomorrow', tone: 'soon', days: 1 };
  if (d <= 5) return { label: `${d} days left`, tone: 'soon', days: d };
  return { label: `${d} days left`, tone: 'ok', days: d };
};

export const formatDate = (dateStr, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  dateStr ? new Date(dateStr).toLocaleDateString('en-IN', opts) : 'TBA';

// ── Timeline / events ────────────────────────────────
// A competition carries a `timeline` array of milestones:
//   { label, date?: 'YYYY-MM-DD', time?: 'HH:MM', type }
export const EVENT_TYPES = {
  registration: { label: 'Registration', color: '#60a5fa' },
  workshop: { label: 'Workshop', color: '#8b7cff' },
  round: { label: 'Round', color: '#5eead4' },
  submission: { label: 'Submission', color: '#fbbf24' },
  deadline: { label: 'Deadline', color: '#f87171' },
  finale: { label: 'Finale', color: '#fb7faf' },
  result: { label: 'Result', color: '#34d399' },
  event: { label: 'Event', color: '#a78bfa' },
};
export const EVENT_TYPE_KEYS = Object.keys(EVENT_TYPES);
export const eventType = (t) => EVENT_TYPES[t] || EVENT_TYPES.event;

// Ordered timeline for display (dated entries sorted, undated kept in order at end).
export const sortedTimeline = (comp) => {
  const tl = [...(comp.timeline || [])];
  return tl.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00'));
  });
};

// All DATED milestones for one competition, used to plot the calendar.
// If the timeline doesn't already include the headline deadline, add it.
export const compEvents = (comp) => {
  const tl = (comp.timeline || []).filter((e) => e.date);
  const events = tl.map((e) => ({ ...e, compId: comp.id, comp }));
  if (comp.deadline && !tl.some((e) => e.date === comp.deadline)) {
    events.push({ label: 'Deadline', date: comp.deadline, type: 'deadline', compId: comp.id, comp });
  }
  return events;
};

// Flatten dated events across many competitions into a date→events map.
export const eventsByDate = (competitions) => {
  const map = {};
  competitions.forEach((c) => compEvents(c).forEach((e) => { (map[e.date] ||= []).push(e); }));
  return map;
};

// Monday-first 6-week grid of Date objects covering the given month.
export const monthGrid = (year, month) => {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // 0 = Monday
  const start = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
};

export const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// ── Member queries ───────────────────────────────────
export const teamsForMemberInComp = (teams, memberId, compId) =>
  teams.filter((t) => t.competitionId === compId && t.memberIds?.includes(memberId));

export const totalTeamsForMember = (teams, memberId) =>
  teams.filter((t) => t.memberIds?.includes(memberId)).length;

// ── Parse bulk member paste ──────────────────────────
// Each line: "Name" | "Name, female" | "Name, female, non-engineering"
export const parseMemberLines = (text) => {
  return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/[,\t]/).map((p) => p.trim()).filter(Boolean);
    const name = parts[0];
    let gender = 'male';
    let background = 'engineering';
    parts.slice(1).forEach((token) => {
      const t = token.toLowerCase();
      if (['f', 'female', 'woman', 'w'].includes(t)) gender = 'female';
      else if (['m', 'male', 'man'].includes(t)) gender = 'male';
      else if (t.startsWith('non') || t.startsWith('arts') || t.startsWith('commerce') || t === 'mgmt') background = 'non-engineering';
      else if (t.startsWith('eng') || t.startsWith('tech') || t.startsWith('btech') || t.startsWith('b.tech')) background = 'engineering';
    });
    return { name, gender, background, color: colorForName(name) };
  }).filter((m) => m.name);
};
