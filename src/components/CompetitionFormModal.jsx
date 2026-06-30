import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from './Modal';
import { addCompetition, updateCompetition } from '../firebase/services';
import { EVENT_TYPE_KEYS, eventType } from '../utils';

const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'open', label: 'Registration open' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
];

// One form, used for both creating and editing a competition.
export default function CompetitionFormModal({ competition, onClose, onSaved }) {
  const editing = Boolean(competition);
  const [form, setForm] = useState({
    name: competition?.name || '',
    organizer: competition?.organizer || '',
    description: competition?.description || '',
    problemStatement: competition?.problemStatement || '',
    format: competition?.format || '',
    imageUrl: competition?.imageUrl || '',
    externalLink: competition?.externalLink || '',
    teamSizeMin: competition?.teamSizeMin ?? '',
    teamSize: competition?.teamSize ?? '',
    teamSizeLabel: competition?.teamSizeLabel || '',
    rounds: competition?.rounds ?? '',
    deadline: competition?.deadline || '',
    prize: competition?.prize || '',
    regFee: competition?.regFee || 'Free',
    eligibility: competition?.eligibility || '',
    tags: (competition?.tags || []).join(', '),
    status: competition?.status || 'upcoming',
    isIndividual: competition?.isIndividual || false,
  });
  const [timeline, setTimeline] = useState(() => (competition?.timeline || []).map((e) => ({ ...e })));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const setRow = (i, k, v) => setTimeline((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setTimeline((rows) => [...rows, { label: '', date: '', time: '', type: 'round' }]);
  const removeRow = (i) => setTimeline((rows) => rows.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const min = Number(form.teamSizeMin) || 0;
    const max = Number(form.teamSize) || 0;
    const label = form.teamSizeLabel.trim() || (min && max && min !== max ? `${min}–${max}` : String(max || min || '')) || '';
    const payload = {
      ...form,
      teamSizeMin: min,
      teamSize: max,
      rounds: Number(form.rounds) || 0,
      teamSizeLabel: label,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      isIndividual: max === 1 ? true : form.isIndividual,
      timeline: timeline
        .filter((r) => r.label.trim())
        .map((r) => ({ label: r.label.trim(), date: r.date || '', time: r.time || '', type: r.type || 'event' })),
    };
    try {
      const result = editing ? await updateCompetition(competition.id, payload) : await addCompetition(payload);
      onSaved?.(result);
      onClose();
    } catch (e) { console.error(e); setSaving(false); }
  };

  return (
    <Modal onClose={onClose} title={editing ? 'Edit competition' : 'New competition'}>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Competition name *</label>
          <input className="form-input" placeholder="e.g. Trilytics '26" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Organizer</label>
          <input className="form-input" placeholder="e.g. IIM Calcutta" value={form.organizer} onChange={(e) => set('organizer', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-input" placeholder="Short summary of the competition…" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Problem statement / what it asks for</label>
          <textarea className="form-input" placeholder="The actual task teams must solve…" value={form.problemStatement} onChange={(e) => set('problemStatement', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Format / rounds breakdown</label>
          <textarea className="form-input" placeholder="e.g. R1 Quiz → R2 Deck → R3 Finale" value={form.format} onChange={(e) => set('format', e.target.value)} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Image URL</label>
            <input className="form-input" placeholder="https://… (logo / banner)" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Official link</label>
            <input className="form-input" placeholder="https://unstop.com/…" value={form.externalLink} onChange={(e) => set('externalLink', e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Min team size</label>
            <input className="form-input" type="number" min="0" placeholder="1" value={form.teamSizeMin} onChange={(e) => set('teamSizeMin', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Max team size</label>
            <input className="form-input" type="number" min="0" placeholder="4" value={form.teamSize} onChange={(e) => set('teamSize', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Size label (optional)</label>
            <input className="form-input" placeholder="auto: 1–4" value={form.teamSizeLabel} onChange={(e) => set('teamSizeLabel', e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Rounds</label>
            <input className="form-input" type="number" min="0" value={form.rounds} onChange={(e) => set('rounds', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Deadline</label>
            <input className="form-input" type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Prize</label>
            <input className="form-input" placeholder="₹2,50,000" value={form.prize} onChange={(e) => set('prize', e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Registration fee</label>
            <input className="form-input" placeholder="Free" value={form.regFee} onChange={(e) => set('regFee', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Eligibility</label>
          <input className="form-input" placeholder="Who can apply" value={form.eligibility} onChange={(e) => set('eligibility', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Tags / themes (comma separated)</label>
          <input className="form-input" placeholder="Analytics, Strategy, Finance" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={form.isIndividual} onChange={(e) => set('isIndividual', e.target.checked)} />
          <span>Individual participation (no teams)</span>
        </label>

        <div className="form-group">
          <label className="form-label">Timeline (start → finish)</label>
          <p className="muted sm" style={{ marginBottom: 4 }}>Add each milestone. Dated ones appear on the Calendar; leave date blank for "TBA".</p>
          <div className="tl-editor">
            {timeline.map((r, i) => (
              <div key={i} className="tl-edit-row">
                <span className="tl-edit-dot" style={{ background: eventType(r.type).color }} />
                <input className="form-input slim" placeholder="Milestone (e.g. Round 1 — Quiz)" value={r.label} onChange={(e) => setRow(i, 'label', e.target.value)} />
                <input className="form-input slim tl-edit-date" type="date" value={r.date} onChange={(e) => setRow(i, 'date', e.target.value)} />
                <select className="form-input slim tl-edit-type" value={r.type} onChange={(e) => setRow(i, 'type', e.target.value)}>
                  {EVENT_TYPE_KEYS.map((k) => <option key={k} value={k}>{eventType(k).label}</option>)}
                </select>
                <button type="button" className="icon-btn danger" onClick={() => removeRow(i)}><Trash2 size={14} /></button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary tl-add" onClick={addRow}><Plus size={14} /> Add milestone</button>
          </div>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add competition'}
        </button>
      </div>
    </Modal>
  );
}
