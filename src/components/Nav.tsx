import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/badges', label: 'Badges' },
  { to: '/claim', label: 'Claim' },
  { to: '/feed', label: 'Feed' },
];

export default function Nav() {
  return (
    <nav className="border-b border-border bg-surface sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <NavLink to="/" className="text-lg font-semibold text-text-primary tracking-tight hover:text-track-agent transition-colors">
          Sovereignty Badges
        </NavLink>
        <div className="flex gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-light text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-light/50'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
