import { ParticipantInfo, Role } from '../types';

interface Props {
  participants: ParticipantInfo[];
  myId: string;
  myRole: Role;
  onAssignRole: (userId: string, role: Role) => void;
  onRemove: (userId: string) => void;
}

const ROLE_BADGE: Record<Role, string> = {
  host: '👑 Host',
  moderator: '🛡 Mod',
  participant: '👤 Participant',
};

const ROLE_OPTIONS: Role[] = ['moderator', 'participant'];

export default function ParticipantList({ participants, myId, myRole, onAssignRole, onRemove }: Props) {
  const isHost = myRole === 'host';

  return (
    <div className="participant-list">
      <h3>Participants ({participants.length})</h3>
      <ul>
        {participants.map((p) => (
          <li key={p.id} className={`participant-item ${p.id === myId ? 'me' : ''}`}>
            <div className="participant-info">
              <span className="participant-name">
                {p.username}{p.id === myId ? ' (you)' : ''}
              </span>
              <span className={`role-badge role-${p.role}`}>{ROLE_BADGE[p.role]}</span>
            </div>

            {/* Host controls for other participants */}
            {isHost && p.id !== myId && (
              <div className="participant-actions">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      onAssignRole(p.id, e.target.value as Role);
                      e.target.value = '';
                    }
                  }}
                  className="role-select"
                  title="Assign role"
                >
                  <option value="" disabled>Set role…</option>
                  {ROLE_OPTIONS.filter((r) => r !== p.role).map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                  {p.role !== 'host' && <option value="host">Transfer Host</option>}
                </select>
                <button
                  className="btn-remove"
                  onClick={() => onRemove(p.id)}
                  title="Remove from room"
                >
                  ✕
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
