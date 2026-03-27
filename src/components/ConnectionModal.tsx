import { useState, useMemo } from 'react';
import { useSigner } from '../context/SignerContext';

export default function ConnectionModal() {
  const {
    modalOpen,
    closeModal,
    connecting,
    connectNip07,
    connectNip46,
    connectBunker,
    connectUri,
  } = useSigner();

  const [bunkerInput, setBunkerInput] = useState('');
  const [showBunkerInput, setShowBunkerInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitingForSigner, setWaitingForSigner] = useState(false);

  const platform = useMemo(() => {
    const ua = navigator.userAgent;
    return {
      isAndroid: /android/i.test(ua),
      isIOS: /iphone|ipad|ipod/i.test(ua),
      hasNip07: typeof (window as any).nostr !== 'undefined',
    };
  }, []);

  if (!modalOpen) return null;

  const handleNip07 = async () => {
    setError(null);
    try {
      await connectNip07();
    } catch {
      setError('Browser extension not found or connection rejected.');
    }
  };

  const handleAmber = async () => {
    setError(null);
    setWaitingForSigner(true);
    try {
      const uri = await connectNip46();
      // On Android, try to open Amber directly
      if (platform.isAndroid && uri) {
        window.location.href = `nostrsigner:${uri}`;
      }
    } catch {
      setError('Failed to generate connection URI.');
      setWaitingForSigner(false);
    }
  };

  const handleNsecApp = async () => {
    setError(null);
    setWaitingForSigner(true);
    try {
      await connectNip46();
      // Open nsec.app in a new tab
      window.open('https://nsec.app', '_blank');
    } catch {
      setError('Failed to generate connection URI.');
      setWaitingForSigner(false);
    }
  };

  const handleBunkerSubmit = async () => {
    setError(null);
    const uri = bunkerInput.trim();
    if (!uri.startsWith('bunker://')) {
      setError('URI must start with bunker://');
      return;
    }
    try {
      await connectBunker(uri);
    } catch {
      setError('Failed to connect via bunker URI. Check the URI and try again.');
    }
  };

  const amberDeepLink = connectUri
    ? `nostrsigner:${connectUri}`
    : null;

  const qrUrl = connectUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(connectUri)}`
    : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 relative">
        {/* Close button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors text-xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>

        <h2 className="text-xl font-bold text-text-primary mb-1">
          Connect Signer
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          Choose how to sign events with your Nostr identity.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Show QR + waiting state when nostrconnect URI is generated */}
        {waitingForSigner && connectUri ? (
          <div className="text-center">
            <p className="text-sm text-text-secondary mb-4">
              Scan this QR code with your signer app, or use the buttons below.
            </p>
            {qrUrl && (
              <img
                src={qrUrl}
                alt="Scan with your Nostr signer"
                className="mx-auto mb-4 rounded-lg"
                width={200}
                height={200}
              />
            )}
            <div className="flex flex-col gap-2 mb-4">
              {platform.isAndroid && amberDeepLink && (
                <a
                  href={amberDeepLink}
                  className="block w-full px-4 py-3 rounded-xl bg-track-human/20 border border-track-human/30 text-track-human font-medium text-sm text-center hover:bg-track-human/30 transition-colors"
                >
                  Open in Amber
                </a>
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(connectUri);
                }}
                className="px-4 py-2 rounded-lg bg-surface-light border border-border text-text-secondary text-xs hover:text-text-primary transition-colors"
              >
                Copy nostrconnect:// URI
              </button>
            </div>
            <div className="flex items-center gap-2 justify-center text-text-secondary text-sm">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Waiting for signer response...
            </div>
            <button
              onClick={() => {
                setWaitingForSigner(false);
                setError(null);
              }}
              className="mt-4 text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* NIP-07 Browser Extension */}
            {platform.hasNip07 && (
              <button
                onClick={handleNip07}
                disabled={connecting}
                className="w-full px-4 py-3 rounded-xl bg-track-agent/20 border border-track-agent/30 text-track-agent font-medium text-sm text-left hover:bg-track-agent/30 transition-colors disabled:opacity-50 flex items-center gap-3"
              >
                <span className="text-lg">&#129418;</span>
                <div>
                  <div>Browser Extension</div>
                  <div className="text-xs opacity-70 font-normal">
                    nos2x, Alby, Soapbox Signer
                  </div>
                </div>
              </button>
            )}

            {/* Amber (Android) */}
            <button
              onClick={handleAmber}
              disabled={connecting}
              className="w-full px-4 py-3 rounded-xl bg-track-human/20 border border-track-human/30 text-track-human font-medium text-sm text-left hover:bg-track-human/30 transition-colors disabled:opacity-50 flex items-center gap-3"
            >
              <span className="text-lg">&#128241;</span>
              <div>
                <div>Amber (Android)</div>
                <div className="text-xs opacity-70 font-normal">
                  NIP-46 remote signer via QR code
                </div>
              </div>
            </button>

            {/* nsec.app (iOS/Safari) */}
            <button
              onClick={handleNsecApp}
              disabled={connecting}
              className="w-full px-4 py-3 rounded-xl bg-green-800/20 border border-green-700/30 text-green-400 font-medium text-sm text-left hover:bg-green-800/30 transition-colors disabled:opacity-50 flex items-center gap-3"
            >
              <span className="text-lg">&#127822;</span>
              <div>
                <div>nsec.app (iOS / Safari)</div>
                <div className="text-xs opacity-70 font-normal">
                  Web-based signer, no app install needed
                </div>
              </div>
            </button>

            {/* Paste bunker URI */}
            {!showBunkerInput ? (
              <button
                onClick={() => setShowBunkerInput(true)}
                className="w-full px-4 py-3 rounded-xl bg-surface-light border border-border text-text-secondary font-medium text-sm text-left hover:text-text-primary hover:bg-surface-light/80 transition-colors flex items-center gap-3"
              >
                <span className="text-lg">&#128279;</span>
                <div>
                  <div>Paste bunker URI</div>
                  <div className="text-xs opacity-70 font-normal">
                    bunker://... from nsecBunker or Amber
                  </div>
                </div>
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-surface-light border border-border">
                <label className="text-xs text-text-secondary mb-2 block">
                  Paste your bunker:// URI
                </label>
                <input
                  type="text"
                  value={bunkerInput}
                  onChange={(e) => setBunkerInput(e.target.value)}
                  placeholder="bunker://..."
                  className="w-full px-3 py-2 rounded-lg bg-bg-dark border border-border text-text-primary placeholder-text-secondary text-sm focus:outline-none focus:border-track-agent transition-colors mb-3"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleBunkerSubmit}
                    disabled={connecting || !bunkerInput.trim()}
                    className="flex-1 px-3 py-2 rounded-lg bg-track-agent text-white text-sm font-medium hover:bg-track-agent/80 disabled:opacity-50 transition-colors"
                  >
                    {connecting ? 'Connecting...' : 'Connect'}
                  </button>
                  <button
                    onClick={() => {
                      setShowBunkerInput(false);
                      setBunkerInput('');
                    }}
                    className="px-3 py-2 rounded-lg bg-surface border border-border text-text-secondary text-sm hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Help text */}
            <div className="mt-2 text-xs text-text-secondary leading-relaxed">
              {platform.isAndroid && (
                <p>
                  On Android?{' '}
                  <a
                    href="https://github.com/greenart7c3/Amber/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-track-human hover:underline"
                  >
                    Get Amber
                  </a>{' '}
                  — the best key manager for Android.
                </p>
              )}
              {platform.isIOS && (
                <p>
                  On iOS, nsec.app is the easiest option — your keys stay in your
                  browser, nothing is sent to a server.
                </p>
              )}
              {!platform.isAndroid && !platform.isIOS && !platform.hasNip07 && (
                <p>
                  No browser extension detected. Install{' '}
                  <a
                    href="https://chromewebstore.google.com/detail/nos2x/kpgefcfmnafjgpblomihpgcdaco4de37"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-track-agent hover:underline"
                  >
                    nos2x
                  </a>{' '}
                  or{' '}
                  <a
                    href="https://getalby.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-track-agent hover:underline"
                  >
                    Alby
                  </a>{' '}
                  for one-click signing.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
