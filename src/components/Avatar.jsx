import { initials, colorForName } from '../utils';

export default function Avatar({ member, size = 36 }) {
  const bg = member?.color || colorForName(member?.name);
  return (
    <span
      className="avatar"
      style={{ background: bg, width: size, height: size, fontSize: size * 0.4, borderRadius: size * 0.28 }}
      title={member?.name}
    >
      {initials(member?.name)}
    </span>
  );
}
