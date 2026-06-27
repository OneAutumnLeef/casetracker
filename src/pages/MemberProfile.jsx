import { useParams, Link } from 'react-router-dom';
import { useAppData } from '../App';
import { ArrowLeft, Trophy } from 'lucide-react';

export default function MemberProfile() {
  const { id } = useParams();
  const { members, competitions, allTeams } = useAppData();
  const member = members.find(m => m.id === id);

  if (!member) return <div className="animate-in"><p style={{ color: 'var(--text-muted)' }}>Member not found</p></div>;

  const memberTeams = allTeams.filter(t => t.memberIds?.includes(id));
  const compMap = {};
  competitions.forEach(c => { compMap[c.id] = c; });

  return (
    <div className="animate-in">
      <Link to="/members" className="back-link"><ArrowLeft /> Back to Members</Link>

      <div className="profile-header">
        <div className="profile-avatar" style={{ background: member.color || '#6c5ce7' }}>
          {member.name?.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h2>{member.name}</h2>
          <div className="tags">
            <span className={`badge badge-${member.gender === 'male' ? 'male' : 'female'}`}>
              {member.gender === 'male' ? '♂ Male' : '♀ Female'}
            </span>
            <span className={`badge badge-${member.background === 'engineering' ? 'eng' : 'noneng'}`}>
              {member.background === 'engineering' ? 'Engineering' : 'Non-Engineering'}
            </span>
            <span className="badge badge-accent">{memberTeams.length} team{memberTeams.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: '1rem', marginBottom: 14 }}>Competition Assignments</h3>

      {competitions.length === 0 ? (
        <div className="glass empty-state">
          <Trophy size={40} />
          <h3>No competitions</h3>
          <p>Add competitions from the dashboard</p>
        </div>
      ) : (
        <div className="profile-comps">
          {competitions.map(c => {
            const team = allTeams.find(t => t.competitionId === c.id && t.memberIds?.includes(id));
            return (
              <Link key={c.id} to={`/competition/${c.id}`} className="glass profile-comp-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className={`status-dot ${c.status || 'upcoming'}`} />
                  <h4>{c.name}</h4>
                </div>
                {team ? (
                  <p className="team-name">✓ {team.name}</p>
                ) : (
                  <p className="not-assigned">Not assigned to any team</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
