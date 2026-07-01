import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import { useAppData } from '../App';
import {
  getCompetition, subscribeTeams, addTeam, updateTeam, deleteTeam, moveMemberToTeam, deleteCompetition, setInterest,
} from '../firebase/services';
import {
  ArrowLeft, Plus, Trash2, ExternalLink, Users, Layers, Calendar, Award, Edit3, AlertCircle,
  Lock, Unlock, Shuffle, Wand2, Copy, Download, GripVertical, Check, Crown, ChevronDown, Star, Heart,
} from 'lucide-react';
import Avatar from '../components/Avatar';
import CompositionBar from '../components/CompositionBar';
import Timeline from '../components/Timeline';
import CompetitionFormModal from '../components/CompetitionFormModal';
import { composition, deadlineInfo, formatDate, domainColor, domainAbbr, domainCounts } from '../utils';

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

const RESULTS = ['', 'qualified', 'finalist', 'winner', 'runner-up', 'eliminated'];

export default function CompetitionPage() {
  const { id } = useParams();
  const { members, competitions, viewMember } = useAppData();
  const navigate = useNavigate();
  const [comp, setComp] = useState(null);
  const [teams, setTeams] = useState([]);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [activeMember, setActiveMember] = useState(null);
  const [flash, setFlash] = useState('');
  const [poolSearch, setPoolSearch] = useState('');
  const [poolInterestedOnly, setPoolInterestedOnly] = useState(false);

  const competition = competitions.find((c) => c.id === id) || comp;

  useEffect(() => {
    getCompetition(id).then(setComp);
    return subscribeTeams(id, setTeams);
  }, [id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const showToast = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 2200); };

  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const getMember = (mid) => memberById[mid];
  const maxSize = competition?.teamSize || 0;

  const interestedIds = useMemo(() => new Set(competition?.interestedIds || []), [competition]);
  const assignedIds = useMemo(() => new Set(teams.flatMap((t) => t.memberIds || [])), [teams]);
  const unassigned = members.filter((m) => !assignedIds.has(m.id));
  const interestedFreeCount = unassigned.filter((m) => interestedIds.has(m.id)).length;
  const filteredPool = unassigned
    .filter((m) => m.name?.toLowerCase().includes(poolSearch.toLowerCase()))
    .filter((m) => !poolInterestedOnly || interestedIds.has(m.id))
    .sort((a, b) => (interestedIds.has(b.id) ? 1 : 0) - (interestedIds.has(a.id) ? 1 : 0) || a.name.localeCompare(b.name));
  const myInterest = viewMember ? interestedIds.has(viewMember.id) : false;

  const toggleMyInterest = async () => {
    if (!viewMember) return;
    await setInterest(id, viewMember.id, !myInterest);
    showToast(!myInterest ? `${viewMember.name} marked interested.` : 'Interest removed.');
  };

  if (!competition) return <div className="animate-fade-up"><p className="muted">Loading…</p></div>;

  // ── Drag handling ──────────────────────────────────
  const onDragStart = ({ active }) => setActiveMember(getMember(active.data.current.memberId));
  const onDragEnd = async ({ active, over }) => {
    setActiveMember(null);
    if (!over) return;
    const memberId = active.data.current.memberId;
    if (over.id === 'pool') { await moveMemberToTeam(memberId, null, teams); return; }
    if (String(over.id).startsWith('team:')) {
      const teamId = String(over.id).slice(5);
      const team = teams.find((t) => t.id === teamId);
      if (!team || team.locked || team.memberIds?.includes(memberId)) return;
      if (maxSize > 0 && (team.memberIds?.length || 0) >= maxSize) { showToast(`${team.name} is full (max ${maxSize}).`); return; }
      await moveMemberToTeam(memberId, teamId, teams);
    }
  };

  // ── Team ops ───────────────────────────────────────
  const handleAddTeam = async () => {
    const name = teamName.trim() || `Team ${teams.length + 1}`;
    await addTeam({ name, competitionId: id, memberIds: [], registered: false, round: 0, result: '', locked: false, leadId: '', notes: '' });
    setTeamName('');
    setShowAddTeam(false);
  };

  const removeFromTeam = async (team, memberId) => {
    await updateTeam(team.id, {
      memberIds: team.memberIds.filter((m) => m !== memberId),
      leadId: team.leadId === memberId ? '' : team.leadId,
    });
  };

  // Fill unassigned members into existing teams, balancing gender + background.
  const autoBalance = async () => {
    const openTeams = teams.filter((t) => !t.locked && (maxSize <= 0 || (t.memberIds?.length || 0) < maxSize));
    if (!openTeams.length) return showToast('No open teams to fill. Create a team first.');
    if (!unassigned.length) return showToast('Everyone is already on a team.');
    const assign = Object.fromEntries(teams.map((t) => [t.id, [...(t.memberIds || [])]]));
    for (const m of interleaveByCategory(unassigned)) {
      const cand = openTeams.filter((t) => maxSize <= 0 || assign[t.id].length < maxSize)
        .sort((a, b) => assign[a.id].length - assign[b.id].length);
      if (!cand.length) break;
      assign[cand[0].id].push(m.id);
    }
    await Promise.all(teams.filter((t) => assign[t.id].length !== (t.memberIds?.length || 0))
      .map((t) => updateTeam(t.id, { memberIds: assign[t.id] })));
    showToast('Filled open teams with a balanced mix.');
  };

  // Pull everyone out and redistribute across balanced teams (creates teams as needed).
  const shuffleEveryone = async () => {
    if (!members.length) return;
    if (!confirm('Reshuffle EVERYONE into fresh balanced teams? Locked teams are left untouched.')) return;
    const lockedTeams = teams.filter((t) => t.locked);
    const lockedIds = new Set(lockedTeams.flatMap((t) => t.memberIds || []));
    const pool = members.filter((m) => !lockedIds.has(m.id));
    const openTeams = teams.filter((t) => !t.locked);
    const per = maxSize > 0 ? maxSize : Math.max(2, Math.ceil(pool.length / Math.max(1, openTeams.length || 1)));
    const needed = Math.max(openTeams.length, Math.ceil(pool.length / per));

    let targets = [...openTeams];
    for (let i = openTeams.length; i < needed; i++) {
      const created = await addTeam({ name: `Team ${teams.length + (i - openTeams.length) + 1}`, competitionId: id, memberIds: [], registered: false, round: 0, result: '', locked: false, leadId: '', notes: '' });
      if (created) targets.push(created);
    }
    const assign = Object.fromEntries(targets.map((t) => [t.id, []]));
    for (const m of interleaveByCategory(pool)) {
      const cand = targets.filter((t) => assign[t.id].length < per).sort((a, b) => assign[a.id].length - assign[b.id].length);
      (cand[0] ? assign[cand[0].id] : assign[targets[0].id]).push(m.id);
    }
    await Promise.all(targets.map((t) => updateTeam(t.id, { memberIds: assign[t.id], leadId: '' })));
    showToast('Reshuffled everyone into balanced teams.');
  };

  // ── Share / export ─────────────────────────────────
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); showToast('Copied to clipboard.'); }
    catch { showToast('Could not copy.'); }
  };
  const rosterText = (t) => `*${t.name}* — ${competition.name}\n` +
    (t.memberIds?.length ? t.memberIds.map((mid) => `• ${getMember(mid)?.name || '—'}${t.leadId === mid ? ' (lead)' : ''}`).join('\n') : '(no members yet)');
  const copyAll = () => copy(`${competition.name}\n\n${teams.map(rosterText).join('\n\n')}`);
  const exportCsv = () => {
    const rows = [['Team', 'Member', 'Gender', 'Background', 'Domain', 'Lead', 'Registered', 'Round', 'Result']];
    teams.forEach((t) => (t.memberIds?.length ? t.memberIds : ['']).forEach((mid) => {
      const m = getMember(mid);
      rows.push([t.name, m?.name || '', m?.gender || '', m?.background || '', m?.domain || '', t.leadId === mid ? 'yes' : '', t.registered ? 'yes' : 'no', t.round || 0, t.result || '']);
    }));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${competition.name.replace(/[^\w]+/g, '-')}-teams.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteComp = async () => {
    if (confirm('Delete this competition and all its teams?')) { await deleteCompetition(id); navigate('/'); }
  };

  const dl = deadlineInfo(competition.deadline);
  const fullTeams = teams.filter((t) => maxSize > 0 && (t.memberIds?.length || 0) >= maxSize).length;

  return (
    <div className="animate-fade-up">
      <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to overview</Link>

      <div className="detail-hero">
        {competition.imageUrl
          ? <img className="detail-img" src={competition.imageUrl} alt={competition.name} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          : <h1 className="detail-watermark">{competition.name?.substring(0, 3).toUpperCase()}</h1>}
        <span className={`status-pill ${competition.status || 'upcoming'} hero-pill`}>{competition.status || 'upcoming'}</span>
      </div>

      <div className="detail-content">
        <div className="detail-main">
          <h1 className="detail-title">{competition.name}</h1>
          {competition.organizer && <p className="detail-org">{competition.organizer}</p>}
          {(competition.tags?.length > 0) && (
            <div className="tag-row" style={{ marginBottom: 20 }}>
              {competition.tags.map((t) => <span key={t} className="theme-tag">{t}</span>)}
            </div>
          )}
          {competition.description && <p className="detail-desc">{competition.description}</p>}
          {competition.problemStatement && (
            <div className="callout">
              <span className="callout-label">Problem statement</span>
              <p>{competition.problemStatement}</p>
            </div>
          )}

          {(competition.timeline?.length > 0) && (
            <section className="timeline-section">
              <h2 className="section-title sm">Timeline</h2>
              <Timeline comp={competition} />
            </section>
          )}

          <div className="interest-bar">
            <span className="interest-info">
              <Heart size={15} /> <strong>{interestedIds.size}</strong> interested{interestedFreeCount > 0 ? ` · ${interestedFreeCount} still free` : ''}
            </span>
            {viewMember ? (
              <button className={`btn ${myInterest ? 'btn-secondary' : 'btn-primary'} interest-toggle`} onClick={toggleMyInterest}>
                <Star size={15} className={myInterest ? 'filled' : ''} /> {myInterest ? "You're in" : "I'm interested"}
              </button>
            ) : (
              <span className="muted sm">Pick yourself in the top bar to flag interest.</span>
            )}
          </div>

          {/* ── Team builder ── */}
          <div className="builder-head">
            <h2 className="section-title sm">Teams ({teams.length})</h2>
            <div className="builder-actions">
              <button className="btn btn-secondary" onClick={autoBalance} title="Fill open teams with a balanced mix"><Wand2 size={15} /> Auto-balance</button>
              <button className="btn btn-secondary" onClick={shuffleEveryone} title="Reshuffle everyone into fresh teams"><Shuffle size={15} /> Shuffle</button>
              <button className="btn btn-primary" onClick={() => setShowAddTeam(true)}><Plus size={15} /> New team</button>
            </div>
          </div>

          {(unassigned.length > 0 || fullTeams > 0) && (
            <div className="builder-hints">
              {unassigned.length > 0 && <span className="hint"><AlertCircle size={13} /> {unassigned.length} member{unassigned.length !== 1 ? 's' : ''} without a team</span>}
              {fullTeams > 0 && <span className="hint ok"><Check size={13} /> {fullTeams} team{fullTeams !== 1 ? 's' : ''} at full size</span>}
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="team-builder">
              <PoolZone
                count={unassigned.length}
                interestedCount={interestedFreeCount}
                search={poolSearch}
                setSearch={setPoolSearch}
                members={filteredPool}
                interestedIds={interestedIds}
                interestedOnly={poolInterestedOnly}
                setInterestedOnly={setPoolInterestedOnly}
              />

              <div className="teams-area">
                {teams.length === 0 ? (
                  <div className="empty-card slim">
                    <Users size={40} />
                    <h3>No teams yet</h3>
                    <p>Create a team and drag members in — or hit Shuffle to auto-form balanced teams.</p>
                    <button className="btn btn-primary" onClick={() => setShowAddTeam(true)}><Plus size={16} /> New team</button>
                  </div>
                ) : (
                  teams.map((t) => (
                    <TeamCard
                      key={t.id} team={t} comp={competition} getMember={getMember}
                      onRemove={removeFromTeam} onCopy={() => copy(rosterText(t))} showToast={showToast}
                    />
                  ))
                )}
              </div>
            </div>

            <DragOverlay>
              {activeMember && (
                <div className="member-chip dragging-overlay">
                  <GripVertical size={14} className="grip" />
                  <Avatar member={activeMember} size={26} />
                  <span>{activeMember.name}</span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>

        {/* ── Sidebar ── */}
        <aside className="sticky-sidebar">
          <div className="panel">
            <h3 className="panel-title">Details</h3>
            <Detail label="Status" value={<span className={`status-pill ${competition.status || 'upcoming'}`}>{competition.status || 'upcoming'}</span>} />
            <Detail label="Deadline" value={<span className={`deadline-tag ${dl.tone}`}>{competition.deadline ? `${formatDate(competition.deadline)} · ${dl.label}` : 'TBA'}</span>} />
            <Detail label="Team size" value={competition.isIndividual ? 'Individual' : (competition.teamSizeLabel || competition.teamSize || 'Varies')} />
            <Detail label="Rounds" value={competition.rounds || '—'} />
            <Detail label="Prize" value={competition.prize || 'TBA'} icon={<Award size={14} />} />
            <Detail label="Reg. fee" value={competition.regFee || '—'} />
            {competition.format && <DetailBlock label="Format" value={competition.format} />}
            {competition.eligibility && <DetailBlock label="Eligibility" value={competition.eligibility} />}

            <div className="panel-actions">
              {competition.externalLink && (
                <a href={competition.externalLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary full">
                  Official page <ExternalLink size={15} />
                </a>
              )}
              <button className="btn btn-secondary full" onClick={copyAll}><Copy size={15} /> Copy all teams</button>
              <button className="btn btn-secondary full" onClick={exportCsv}><Download size={15} /> Export CSV</button>
              <button className="btn btn-secondary full" onClick={() => setShowEdit(true)}><Edit3 size={15} /> Edit competition</button>
              <button className="btn btn-danger full" onClick={handleDeleteComp}><Trash2 size={15} /> Delete</button>
            </div>
          </div>

          <div className="panel">
            <h3 className="panel-title">Community mix</h3>
            <CompositionBar members={members} />
            <p className="muted sm" style={{ marginTop: 12 }}>{members.length} people · {unassigned.length} free for this competition</p>
          </div>
        </aside>
      </div>

      {flash && <div className="toast">{flash}</div>}

      {showAddTeam && (
        <Modalish onClose={() => setShowAddTeam(false)} title="New team">
          <div className="form-group">
            <label className="form-label">Team name</label>
            <input className="form-input" placeholder={`Team ${teams.length + 1}`} value={teamName} autoFocus
              onChange={(e) => setTeamName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()} />
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setShowAddTeam(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddTeam}>Create</button>
          </div>
        </Modalish>
      )}
      {showEdit && <CompetitionFormModal competition={competition} onClose={() => setShowEdit(false)} onSaved={() => getCompetition(id).then(setComp)} />}
    </div>
  );
}

// ── Pool (droppable list of free members) ────────────
function PoolZone({ count, interestedCount, search, setSearch, members, interestedIds, interestedOnly, setInterestedOnly }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' });
  return (
    <div className="pool">
      <div className="pool-head">
        <h3>Free members <span className="count-badge">{count}</span></h3>
        <p className="muted sm">Drag people into a team. <Star size={11} className="inline-star" /> = interested.</p>
      </div>
      <div className="pool-controls">
        <input className="form-input pool-search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {interestedCount > 0 && (
          <button className={`filter-chip subtle${interestedOnly ? ' active' : ''}`} onClick={() => setInterestedOnly(!interestedOnly)} title="Show only interested people">
            <Star size={12} /> {interestedCount}
          </button>
        )}
      </div>
      <div ref={setNodeRef} className={`pool-list${isOver ? ' over' : ''}`}>
        {members.length === 0 ? (
          <div className="pool-empty">{count === 0 ? 'Everyone is on a team 🎉' : (interestedOnly ? 'No interested people free' : 'No matches')}</div>
        ) : (
          members.map((m) => <DraggableMember key={m.id} member={m} interested={interestedIds.has(m.id)} />)
        )}
      </div>
    </div>
  );
}

// ── Draggable member chip ────────────────────────────
function DraggableMember({ member, isLead, onRemove, locked, interested }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `member:${member.id}`, data: { memberId: member.id }, disabled: locked,
  });
  return (
    <div ref={setNodeRef} className={`member-chip${isDragging ? ' dragging' : ''}${locked ? ' locked' : ''}${interested ? ' interested' : ''}`}>
      <span className="drag-handle" {...listeners} {...attributes}><GripVertical size={14} /></span>
      <Avatar member={member} size={26} />
      <Link to={`/member/${member.id}`} className="chip-name" onClick={(e) => e.stopPropagation()}>{member.name}</Link>
      <span className="chip-tags">
        {interested && <Star size={12} className="chip-star" title="Interested" />}
        <span className={`dot ${member.gender}`} title={member.gender} />
        <span className="chip-bg">{member.background === 'engineering' ? 'E' : 'N'}</span>
        <span className="chip-domain" style={{ color: domainColor(member.domain) }} title={member.domain || 'General'}>{domainAbbr(member.domain)}</span>
      </span>
      {isLead && <Crown size={13} className="lead-icon" title="Team lead" />}
      {onRemove && !locked && <button className="chip-remove" onClick={onRemove} title="Remove"><Trash2 size={13} /></button>}
    </div>
  );
}

// ── Team card (droppable) ────────────────────────────
function TeamCard({ team, comp, getMember, onRemove, onCopy, showToast }) {
  const { setNodeRef, isOver } = useDroppable({ id: `team:${team.id}`, disabled: team.locked });
  const [expanded, setExpanded] = useState(false);
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(team.name);
  const teamMembers = (team.memberIds || []).map(getMember).filter(Boolean);
  const max = comp.teamSize || 0;
  const count = teamMembers.length;
  const full = max > 0 && count >= max;
  const under = comp.teamSizeMin > 0 && count > 0 && count < comp.teamSizeMin;
  const c = composition(teamMembers);
  const skew = c.total >= 2 && (c.eng === 0 || c.nonEng === 0); // single-background team

  const saveName = async () => {
    setEditName(false);
    if (name.trim() && name !== team.name) await updateTeam(team.id, { name: name.trim() });
    else setName(team.name);
  };
  const setLead = async (mid) => updateTeam(team.id, { leadId: team.leadId === mid ? '' : mid });

  return (
    <div className={`team-card${team.locked ? ' locked' : ''}${isOver ? ' over' : ''}`}>
      <div className="team-card-head">
        {editName ? (
          <input className="form-input inline" value={name} autoFocus onChange={(e) => setName(e.target.value)}
            onBlur={saveName} onKeyDown={(e) => e.key === 'Enter' && saveName()} />
        ) : (
          <h3 className="team-name" onClick={() => !team.locked && setEditName(true)}>{team.name}</h3>
        )}
        <div className="team-head-actions">
          <span className={`size-badge${full ? ' full' : ''}${under ? ' under' : ''}`}>
            {count}{max > 0 ? `/${max}` : ''}
          </span>
          <button className="icon-btn" title={team.locked ? 'Unlock' : 'Lock team'} onClick={() => updateTeam(team.id, { locked: !team.locked })}>
            {team.locked ? <Lock size={15} /> : <Unlock size={15} />}
          </button>
          <button className="icon-btn" title="Copy roster" onClick={onCopy}><Copy size={15} /></button>
          <button className="icon-btn danger" title="Delete team" onClick={() => confirm(`Delete ${team.name}?`) && deleteTeam(team.id)}><Trash2 size={15} /></button>
        </div>
      </div>

      {(under || skew) && (
        <div className="team-warn">
          {under && <span><AlertCircle size={12} /> Below minimum ({comp.teamSizeMin})</span>}
          {skew && <span><AlertCircle size={12} /> All {c.eng > 0 ? 'engineering' : 'non-engineering'} — consider mixing</span>}
        </div>
      )}

      <div ref={setNodeRef} className={`team-drop${isOver ? ' active' : ''}`}>
        {teamMembers.length === 0 ? (
          <p className="drop-hint">{team.locked ? 'Locked — unlock to edit' : 'Drop members here'}</p>
        ) : (
          teamMembers.map((m) => (
            <div key={m.id} className="team-member-row">
              <DraggableMember member={m} locked={team.locked} isLead={team.leadId === m.id}
                onRemove={() => onRemove(team, m.id)} />
              {!team.locked && (
                <button className={`lead-btn${team.leadId === m.id ? ' on' : ''}`} title="Set as lead" onClick={() => setLead(m.id)}>
                  <Crown size={13} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {teamMembers.length > 0 && <CompositionBar members={teamMembers} />}
      {teamMembers.length > 0 && (
        <div className="team-domains">
          {Object.entries(domainCounts(teamMembers)).map(([d, n]) => (
            <span key={d} className="domain-chip" style={{ color: domainColor(d), background: domainColor(d) + '1f' }}>{domainAbbr(d)} {n}</span>
          ))}
        </div>
      )}

      <button className="status-toggle" onClick={() => setExpanded((e) => !e)}>
        <span>{team.registered ? '● Registered' : '○ Not registered'}{comp.rounds > 0 ? ` · Round ${team.round || 0}/${comp.rounds}` : ''}{team.result ? ` · ${team.result}` : ''}</span>
        <ChevronDown size={15} className={expanded ? 'flip' : ''} />
      </button>

      {expanded && (
        <div className="status-panel">
          <button className={`pill-toggle${team.registered ? ' on' : ''}`} onClick={() => updateTeam(team.id, { registered: !team.registered })}>
            {team.registered ? <Check size={13} /> : null} Registered
          </button>
          {comp.rounds > 0 && (
            <div className="round-stepper">
              <span>Round</span>
              <button onClick={() => updateTeam(team.id, { round: Math.max(0, (team.round || 0) - 1) })}>−</button>
              <strong>{team.round || 0}/{comp.rounds}</strong>
              <button onClick={() => updateTeam(team.id, { round: Math.min(comp.rounds, (team.round || 0) + 1) })}>+</button>
            </div>
          )}
          <select className="form-input slim" value={team.result || ''} onChange={(e) => updateTeam(team.id, { result: e.target.value })}>
            {RESULTS.map((r) => <option key={r} value={r}>{r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Result —'}</option>)}
          </select>
          <textarea className="form-input slim" placeholder="Notes (mentor, submission link…)" defaultValue={team.notes || ''}
            onBlur={(e) => e.target.value !== (team.notes || '') && updateTeam(team.id, { notes: e.target.value })} />
        </div>
      )}
    </div>
  );
}

// ── Small presentational helpers ─────────────────────
function Detail({ label, value, icon }) {
  return (
    <div className="detail-row">
      <span className="detail-key">{icon}{label}</span>
      <span className="detail-val">{value}</span>
    </div>
  );
}
function DetailBlock({ label, value }) {
  return (
    <div className="detail-block">
      <span className="detail-key">{label}</span>
      <p>{value}</p>
    </div>
  );
}
function Modalish({ onClose, title, children }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header"><h2>{title}</h2></div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// Interleave members across category buckets so round-robin assignment spreads
// gender + background + domain as evenly as possible. Buckets shuffled for randomness.
function interleaveByCategory(members) {
  const groups = {};
  shuffle(members).forEach((m) => { const k = `${m.background}|${m.gender}|${m.domain || 'General'}`; (groups[k] ||= []).push(m); });
  const keys = Object.keys(groups);
  const out = [];
  let more = true;
  while (more) { more = false; keys.forEach((k) => { if (groups[k].length) { out.push(groups[k].shift()); more = true; } }); }
  return out;
}
