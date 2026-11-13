import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

const links = [
  { to: '/cases', label: 'Open cases' },
  { to: '/found', label: 'Found persons' },
  { to: '/map', label: 'Live map' },
  { to: '/scan', label: 'Wristband scan' },
  { to: '/broadcast', label: 'Broadcast alert' },
  { to: '/handover', label: 'Handover log' },
];

export function Shell() {
  const { uid, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="sidebar">
        <img
          src="/logo.png"
          alt="Pushkaralu Reunite"
          style={{ width: '100%', maxWidth: 140, height: 'auto', marginBottom: 16, background: 'transparent' }}
        />
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            {l.label}
          </NavLink>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          <p className="muted" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Booth 07 · {uid}
          </p>
          <p className="muted" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            Synced just now
          </p>
          <button className="btn btn-outline" type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <Outlet />
    </div>
  );
}
