import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BADGES } from '../constants/badges';

export default function HomePage() {
  const [input, setInput] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) {
      navigate(`/p/${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-text-primary mb-3">
          Sovereignty Badges
        </h1>
        <p className="text-lg text-text-secondary max-w-xl mx-auto">
          Track your journey toward digital sovereignty. {BADGES.length} badges
          across Human, Agent, and Shared tracks.
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

      <div className="text-center">
        <Link
          to="/p/jorgenclaw"
          className="text-track-agent hover:text-track-agent/80 text-sm font-medium transition-colors"
        >
          See an example shelf &darr;
        </Link>
      </div>
    </div>
  );
}
