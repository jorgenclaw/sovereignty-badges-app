import { NavLink } from 'react-router-dom';
import { useSigner } from '../context/SignerContext';

const links = [
  { to: '/', label: 'Home' },
  { to: '/badges', label: 'Badges' },
  { to: '/claim', label: 'Claim' },
  { to: '/feed', label: 'Feed' },
];

const methodLabels: Record<string, string> = {
  nip07: 'Extension',
  'nip46-connect': 'NIP-46',
  'nip46-bunker': 'Bunker',
};

export default function Nav() {
  const { pubkey, connected, connecting, signerMethod, openModal, disconnect } =
    useSigner();

  return (
    <nav className="border-b border-border bg-surface sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <NavLink
          to="/"
          className="text-lg font-semibold text-text-primary tracking-tight hover:text-track-agent transition-colors"
        >
          Sovereignty Badges
        </NavLink>
        <div className="flex items-center gap-1">
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
          <div className="ml-2 pl-2 border-l border-border">
            {connected && pubkey ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-text-secondary">
                  {pubkey.slice(0, 8)}...
                </span>
                {signerMethod && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-light text-text-secondary border border-border">
                    {methodLabels[signerMethod] || signerMethod}
                  </span>
                )}
                <button
                  onClick={disconnect}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-light/50 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={openModal}
                disabled={connecting}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-track-agent/20 border border-track-agent/30 text-track-agent hover:bg-track-agent/30 transition-colors disabled:opacity-50"
              >
                {connecting ? 'Connecting...' : 'Connect Signer'}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
