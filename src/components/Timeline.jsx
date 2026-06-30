import { sortedTimeline, eventType, formatDate, daysUntil } from '../utils';

// Vertical start-to-finish timeline for a competition.
export default function Timeline({ comp }) {
  const items = sortedTimeline(comp);
  if (!items.length) return null;
  return (
    <div className="timeline">
      {items.map((e, i) => {
        const t = eventType(e.type);
        const d = e.date ? daysUntil(e.date) : null;
        const past = d !== null && d < 0;
        const today = d === 0;
        return (
          <div key={i} className={`tl-item${past ? ' past' : ''}${today ? ' today' : ''}`}>
            <span className="tl-node" style={{ background: t.color }} />
            <div className="tl-body">
              <div className="tl-top">
                <span className="tl-label">{e.label}</span>
                <span className="tl-type" style={{ color: t.color, borderColor: t.color + '55' }}>{t.label}</span>
              </div>
              <div className="tl-date">
                {e.date ? `${formatDate(e.date, { weekday: 'short', day: 'numeric', month: 'short' })}${e.time ? ` · ${e.time}` : ''}` : 'Date TBA'}
                {today && <span className="tl-now"> • today</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
