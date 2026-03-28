import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BADGES } from '../constants/badges';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { nsecEncode, npubEncode } from 'nostr-tools/nip19';
import { nip19 } from 'nostr-tools';
import { QRCodeSVG } from 'qrcode.react';
import { useSigner } from '../context/SignerContext';

export default function HomePage() {
  const [input, setInput] = useState('');
  const navigate = useNavigate();
  const { pubkey, connected } = useSigner();

  // Keypair generator state
  const [nsec, setNsec] = useState('');
  const [npub, setNpub] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [npubCopied, setNpubCopied] = useState(false);
  const [nsecCopied, setNsecCopied] = useState(false);
  const [pkHex, setPkHex] = useState('');
  const [skHex, setSkHex] = useState('');
  const [pkHexCopied, setPkHexCopied] = useState(false);
  const [skHexCopied, setSkHexCopied] = useState(false);
  const [showNsecQr, setShowNsecQr] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) {
      navigate(`/p/${encodeURIComponent(trimmed)}`);
    }
  };

  function generateKeypair() {
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    setNsec(nsecEncode(sk));
    setNpub(npubEncode(pk));
    setPkHex(pk);
    setSkHex(Array.from(sk).map(b => b.toString(16).padStart(2, '0')).join(''));
    setGenerated(true);
    setRevealed(false);
    setShowNsecQr(false);
  }

  function copyToClipboard(text: string, type: 'npub' | 'nsec' | 'pkHex' | 'skHex') {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'npub') {
        setNpubCopied(true);
        setTimeout(() => setNpubCopied(false), 1500);
      } else if (type === 'nsec') {
        setNsecCopied(true);
        setTimeout(() => setNsecCopied(false), 1500);
      } else if (type === 'pkHex') {
        setPkHexCopied(true);
        setTimeout(() => setPkHexCopied(false), 1500);
      } else {
        setSkHexCopied(true);
        setTimeout(() => setSkHexCopied(false), 1500);
      }
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-text-primary mb-3">
          Sovereignty Badges — Nostr App
        </h1>
        <p className="text-lg text-text-secondary max-w-xl mx-auto">
          Track your journey toward digital sovereignty. {BADGES.length} badges
          across Human, Agent, and Shared tracks.
        </p>
        <p className="text-sm text-text-secondary/80 mt-3 max-w-xl mx-auto">
          Open to all Nostr users — any npub can earn and display badges. No registration required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your npub or Nostr handle"
            className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:border-track-agent transition-colors text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-6 py-3 rounded-xl bg-track-agent text-white font-medium text-sm hover:bg-track-agent/80 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            View shelf
          </button>
        </div>
      </form>

      <div className="text-center mb-16">
        <Link
          to="/p/jorgenclaw"
          className="text-track-agent hover:text-track-agent/80 text-sm font-medium transition-colors"
        >
          See an example shelf &darr;
        </Link>

        {connected && pubkey && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <span className="text-text-secondary/60 text-xs">&mdash; or since you're logged in &mdash;</span>
            <Link
              to={`/p/${nip19.npubEncode(pubkey)}`}
              className="text-track-agent hover:text-track-agent/80 text-sm font-medium transition-colors"
            >
              See my badge shelf &rarr;
            </Link>
            <Link
              to="/manage-badges"
              className="text-track-agent hover:text-track-agent/80 text-sm font-medium transition-colors"
            >
              Manage my badge shelf &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* New to Nostr? Start here. */}
      <div className="border-t border-border pt-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-text-primary mb-3">
            New to Nostr? Start here.
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            No Nostr profile yet? Generate your keypair below — then come back
            up and enter your npub to see your badge shelf.
          </p>
        </div>

        {/* Section A: Keypair Generator */}
        <section className="mb-12">
          <h3 className="text-xl font-semibold text-text-primary mb-3">
            Get Your Nostr Identity
          </h3>
          <p className="text-text-secondary mb-4">
            Your keypair is generated in your browser. We never see it. Nothing
            is sent to any server.
          </p>

          {!generated && (
            <button
              onClick={generateKeypair}
              className="generate-btn"
            >
              Generate My Keypair
            </button>
          )}

          {generated && (
            <div>
              <div className="warning-box">
                &#9888;&#65039; <strong>Save your secret key (nsec) RIGHT NOW.</strong>{' '}
                This is shown once. If you lose it, your identity is gone
                forever. We cannot recover it. Write it down, store it in your
                password manager, do whatever you need to do — but do it now.
              </div>

              <div className="key-row">
                <label>Your public identity (npub) — share this freely:</label>
                <code>{npub}</code>
                <div className="btn-row">
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(npub, 'npub')}
                  >
                    {npubCopied ? 'Copied!' : 'Copy npub'}
                  </button>
                </div>
                <div className="inline-block p-3 bg-white rounded-lg mt-2">
                  <QRCodeSVG value={npub} size={180} />
                </div>
                <p className="text-text-secondary text-sm mt-1">Scan to share your public identity</p>
              </div>

              <div className="key-row">
                <label>
                  Your secret key (nsec) — NEVER share this with anyone:
                </label>
                <code className={revealed ? '' : 'secret'}>{nsec}</code>
                <div className="btn-row">
                  <button
                    className="reveal-btn"
                    onClick={() => setRevealed(!revealed)}
                  >
                    {revealed ? 'Hide nsec' : 'Reveal nsec'}
                  </button>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(nsec, 'nsec')}
                  >
                    {nsecCopied ? 'Copied!' : 'Copy nsec'}
                  </button>
                </div>
                <div className="btn-row" style={{ marginTop: '0.5rem' }}>
                  <button
                    className="reveal-btn"
                    onClick={() => setShowNsecQr(!showNsecQr)}
                  >
                    {showNsecQr ? 'Hide nsec QR' : 'Show nsec QR'}
                  </button>
                </div>
                {showNsecQr && (
                  <>
                    <div className="inline-block p-3 bg-white rounded-lg mt-2">
                      <QRCodeSVG value={nsec} size={180} />
                    </div>
                    <p className="text-text-secondary text-sm mt-1">&#9888;&#65039; Keep this private — scan to import into Amber or your key manager</p>
                  </>
                )}
              </div>

              <div className="key-row" style={{ marginTop: '1.5rem', borderTop: '1px solid #333', paddingTop: '1.5rem' }}>
                <p className="text-text-secondary text-sm" style={{ marginBottom: '1rem' }}>
                  These are the same keys in computer-readable (hex) format. Save them too — you may need them as you build Nostr tools and integrations.
                </p>

                <label>Public key (hex):</label>
                <code>{pkHex}</code>
                <div className="btn-row">
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(pkHex, 'pkHex')}
                  >
                    {pkHexCopied ? 'Copied!' : 'Copy hex'}
                  </button>
                </div>
              </div>

              <div className="key-row">
                <label>Private key (hex) — NEVER share:</label>
                <code className={revealed ? '' : 'secret'}>{skHex}</code>
                <div className="btn-row">
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(skHex, 'skHex')}
                  >
                    {skHexCopied ? 'Copied!' : 'Copy hex'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section B: Client Setup */}
        <section className="mb-12">
          <h3 className="text-xl font-semibold text-text-primary mb-3">
            Set Up Your First Client
          </h3>
          <p className="text-text-secondary mb-4">
            While your keypair is on screen, get a Nostr client running so you
            can import your keys right away.
          </p>

          <div className="amber-callout">
            <strong>&#x1F50F; On Android? Download Amber first, then Primal.</strong>
            <br />
            <a
              href="https://github.com/greenart7c3/Amber/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="text-track-human hover:underline"
            >
              Amber
            </a>{' '}
            is a key manager — it holds your nsec and signs events without
            sharing it with other apps. Your key stays in Amber. Primal (and any
            other app) asks Amber to sign. You never paste your nsec again.
            <br />
            <a
              href="https://github.com/greenart7c3/Amber/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="text-track-human hover:underline"
            >
              Download Amber &rarr;
            </a>
            <br />
            Then import your nsec into Amber, and connect Primal to Amber.
          </div>

          <div className="client-callout">
            <strong>&#x1F4F1; Download Primal now and import your nsec.</strong>
            <br />
            Primal works on iOS and Android. It's the fastest way to go from
            zero to posting.
            <br />
            <a
              href="https://primal.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-track-human hover:underline"
            >
              Download Primal &rarr;
            </a>
          </div>

          <h4 className="text-lg font-medium text-text-primary mt-6 mb-3">
            After Primal
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-text-secondary font-medium">
                    Client
                  </th>
                  <th className="py-2 pr-4 text-text-secondary font-medium">
                    Platform
                  </th>
                  <th className="py-2 text-text-secondary font-medium">
                    When to use
                  </th>
                </tr>
              </thead>
              <tbody className="text-text-primary">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-semibold">Primal</td>
                  <td className="py-2 pr-4 text-text-secondary">
                    iOS, Android, Web
                  </td>
                  <td className="py-2 text-text-secondary">
                    Start here — smoothest onboarding
                  </td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-semibold">Amethyst + Amber</td>
                  <td className="py-2 pr-4 text-text-secondary">Android</td>
                  <td className="py-2 text-text-secondary">
                    Power users — more features, Amber for key safety
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-semibold">Ditto</td>
                  <td className="py-2 pr-4 text-text-secondary">
                    Web / Android
                  </td>
                  <td className="py-2 text-text-secondary">
                    Community-scale, self-hostable — future recommendation
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section C: Register Identity */}
        <section className="mb-12">
          <h3 className="text-xl font-semibold text-text-primary mb-3">
            Register Your Identity
          </h3>
          <p className="text-text-secondary mb-4">
            Give your identity a name that people can find you with on any Nostr
            client.
          </p>

          <div className="register-box">
            <p className="nip05-highlight">you@jorgenclaw.ai</p>
            <p className="text-text-secondary text-sm mt-2">
              5,000 sats, one time. Resolves on every Nostr client.
              <br />
              Includes a Lightning address and 200 free MCP calls/month.
            </p>
            <a
              href="https://nostrservices.jorgenclaw.ai#how-to-dm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-track-human hover:underline text-sm mt-2 inline-block"
            >
              How to register &rarr;
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
