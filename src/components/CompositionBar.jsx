import { composition } from '../utils';

// Compact live readout of a team's diversity: gender split + eng/non-eng split.
export default function CompositionBar({ members, showLabels = true }) {
  const c = composition(members);
  if (c.total === 0) return null;
  return (
    <div className="comp-bar">
      <div className="comp-bar-track" title={`${c.male} male · ${c.female} female`}>
        {c.male > 0 && <span className="seg seg-male" style={{ flex: c.male }} />}
        {c.female > 0 && <span className="seg seg-female" style={{ flex: c.female }} />}
      </div>
      <div className="comp-bar-track" title={`${c.eng} engineering · ${c.nonEng} non-engineering`}>
        {c.eng > 0 && <span className="seg seg-eng" style={{ flex: c.eng }} />}
        {c.nonEng > 0 && <span className="seg seg-noneng" style={{ flex: c.nonEng }} />}
      </div>
      {showLabels && (
        <div className="comp-bar-legend">
          <span>{c.male}M · {c.female}F</span>
          <span>{c.eng} Eng · {c.nonEng} Non-eng</span>
        </div>
      )}
    </div>
  );
}
