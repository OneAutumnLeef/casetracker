import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../App';
import { ArrowLeft, Trophy, Users, AlertTriangle } from 'lucide-react';
import Avatar from '../components/Avatar';
import { deadlineInfo, formatDate } from '../utils';

export default function MemberProfile() {
  const { id } = useParams();
  const { members, competitions, allTeams } = useAppData();
  const navigate = useNavigate();
  const member = members.find((m) => m.id === id);

  if (!member) return <div className="animate-fade-up"><Link to="/members" className="back-link"><ArrowLeft size={16} /> Back</Link><p className="muted">Member not found.</p></div>;

  const memberTeams = allTeams.filter((t) => t.memberIds?.includes(id));
  // Competitions sorted: ones they're on first, then by deadline.
  const rows = competitions.map((c) => {
    const teamsHere = allTeams.filter((t) => t.competitionId === c.id && t.memberIds?.includes(id));
    return { comp: c, team: teamsHere[0] || null, conflict: teamsHere.length > 1 };
  }).sort((a, b) => (b.team ? 1 : 0) - (a.team ? 1 : 0));

  return (
    <div className="animate-fade-up">
      <Link to="/members" className="back-link"><ArrowLeft size={16} /> Back to community</Link>

      <div className="profile-header">
        <Avatar member={member} size={88} />
        <div className="profile-info">
          <h2>{member.name}</h2>
          <div className="tags">
            <span className={`mini-tag ${member.gender}`}>{member.gender === 'male' ? '♂ Male' : '♀ Female'}</span>
            <span className="mini-tag bg">{member.background === 'engineering' ? 'Engineering' : 'Non-Engineering'}</span>
            <span className="mini-tag count">{memberTeams.length} team{memberTeams.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      <h3 className="section-title sm" style={{ marginBottom: 20 }}>Across every competition</h3>

      {competitions.length === 0 ? (
        <div className="empty-card"><Trophy size={44} /><h3>No competitions</h3><p>Add competitions from the overview.</p></div>
      ) : (
        <div className="assignment-grid">
          {rows.map(({ comp, team, conflict }) => {
            const dl = deadlineInfo(comp.deadline);
            return (
              <div key={comp.id} className={`assignment-card${team ? ' assigned' : ''}`} onClick={() => navigate(`/competition/${comp.id}`)}>
                <div className="assignment-top">
                  <span className={`status-pill ${comp.status || 'upcoming'}`}>{comp.status || 'upcoming'}</span>
                  {comp.deadline && <span className={`deadline-tag ${dl.tone}`}>{formatDate(comp.deadline, { day: 'numeric', month: 'short' })}</span>}
                </div>
                <h4>{comp.name}</h4>
                {conflict && <p className="conflict"><AlertTriangle size={13} /> In more than one team here</p>}
                {team ? (
                  <p className="assigned-team"><Users size={13} /> {team.name}{team.leadId === id ? ' · lead' : ''}</p>
                ) : (
                  <p className="not-assigned">{comp.isIndividual ? 'Individual competition' : 'Not on a team yet'}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
