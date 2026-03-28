export const ISSUER_PUBKEY = 'd0514175a31de1942812597ee4e3f478b183f7f35fb73ee66d8c9f57485544e4';
export const BADGE_IMAGE_BASE = 'https://sovereignty.jorgenclaw.ai/badges/images/';

export type Track = 'human' | 'agent' | 'both';
export type VerificationMethod = 'auto' | 'prove' | 'pay' | 'honor';

export interface BadgeDef {
  id: string;
  name: string;
  emoji: string;
  track: Track;
  tier: 0 | 1 | 2 | 3;
  description: string;
  verification: VerificationMethod;
  verificationHint?: string;
}

export const BADGES: BadgeDef[] = [
  // Human track
  { id: 'seed-planted-human', name: 'Seed Planted', emoji: '\u{1F331}\u{1F9D1}', track: 'human', tier: 0, description: 'Attended a Sovereignty by Design workshop', verification: 'honor', verificationHint: 'Post a Nostr note tagging @jorgenclaw' },
  { id: 'encrypted-comms-human', name: 'Encrypted Comms', emoji: '\u{1F512}\u{1F9D1}', track: 'human', tier: 1, description: 'Using ProtonMail or E2E encrypted email', verification: 'honor' },
  { id: 'password-sovereign-human', name: 'Password Sovereign', emoji: '\u{1F5DD}\uFE0F\u{1F9D1}', track: 'human', tier: 1, description: 'Using Proton Pass or a self-hosted password vault', verification: 'honor' },
  { id: 'walled-garden-aware-human', name: 'Walled Garden Aware', emoji: '\u{1F9F1}\u{1F9D1}', track: 'human', tier: 1, description: 'On Mac/iPhone and understands the tradeoffs', verification: 'honor' },
  { id: 'linux-unlocked-human', name: 'Linux Unlocked', emoji: '\u{1F4BB}\u{1F9D1}', track: 'human', tier: 2, description: 'Linux running on any machine', verification: 'prove', verificationHint: 'Paste the output of `uname -a` in your terminal' },
  { id: 'grapheneos-guardian-human', name: 'GrapheneOS Guardian', emoji: '\u{1F4F1}\u{1F9D1}', track: 'human', tier: 2, description: 'GrapheneOS running on a Pixel phone', verification: 'prove', verificationHint: 'Share a screenshot of Settings > Security' },
  { id: 'sovereignty-mentor-human', name: 'Sovereignty Mentor', emoji: '\u{1F91D}\u{1F9D1}', track: 'human', tier: 3, description: 'Helped someone else level up their sovereignty', verification: 'prove', verificationHint: 'Share the npub of someone you mentored' },
  { id: 'sovereign-human', name: 'Sovereign Human', emoji: '\u{1F451}\u{1F9D1}', track: 'human', tier: 3, description: 'Full human sovereignty stack complete', verification: 'auto' },

  // Agent track
  { id: 'identity-claimed-agent', name: 'Identity Claimed', emoji: '\u{1F194}\u{1F916}', track: 'agent', tier: 0, description: 'NIP-05 identifier on any provider', verification: 'auto' },
  { id: 'agent-has-sats', name: 'Agent Has Sats', emoji: '\u26A1\u{1F916}', track: 'agent', tier: 1, description: 'Own Lightning wallet with a balance', verification: 'pay' },
  { id: 'persistent-memory-agent', name: 'Persistent Memory', emoji: '\u{1F9E0}\u{1F916}', track: 'agent', tier: 2, description: 'Memory persists across sessions', verification: 'prove', verificationHint: 'Paste a snippet showing your agent recalled something from a prior session' },
  { id: 'nostr-native-agent', name: 'Nostr Native', emoji: '\u{1F310}\u{1F916}', track: 'agent', tier: 2, description: 'Posting on Nostr with own keypair', verification: 'auto' },
  { id: 'agent-has-email', name: 'Agent Has Email', emoji: '\u{1F4E7}\u{1F916}', track: 'agent', tier: 2, description: 'Own email address — not the human\'s', verification: 'auto' },
  { id: 'key-sovereign-agent', name: 'Key Sovereign', emoji: '\u{1F511}\u{1F916}', track: 'agent', tier: 3, description: 'nsec lives outside the container — signing daemon pattern', verification: 'honor', verificationHint: 'Post a signed attestation note from your agent' },
  { id: 'tool-sovereign-agent', name: 'Tool Sovereign', emoji: '\u{1F6E0}\uFE0F\u{1F916}', track: 'agent', tier: 3, description: 'MCP tools access live and working', verification: 'prove', verificationHint: 'Paste the event ID of a Nostr note your agent signed from bash' },
  { id: 'nsp-registered-agent', name: 'NSP Registered', emoji: '\u{1F4E1}\u{1F916}', track: 'agent', tier: 3, description: 'Registered as a service via Shakespeare NSP', verification: 'auto' },
  { id: 'full-agent-sovereignty', name: 'Full Agent Sovereignty', emoji: '\u{1F451}\u{1F916}', track: 'agent', tier: 3, description: 'Complete agent sovereignty stack', verification: 'auto' },

  // Shared
  { id: 'first-agent', name: 'First Agent', emoji: '\u{1F91D}', track: 'both', tier: 0, description: 'Any AI agent is running', verification: 'honor' },
  { id: 'lightning-strikes', name: 'Lightning Strikes', emoji: '\u26A1', track: 'both', tier: 1, description: 'First sats sent or received', verification: 'auto' },
  { id: 'self-hosted', name: 'Self-Hosted', emoji: '\u{1F3E0}', track: 'both', tier: 2, description: 'Running on own hardware', verification: 'prove', verificationHint: 'Share a URL to your instance or a signed note from your self-hosted agent' },
  { id: 'openclaw-operator', name: 'OpenClaw Operator', emoji: '\u{1F99E}', track: 'both', tier: 1, description: 'Running OpenClaw', verification: 'prove', verificationHint: 'Share your OpenClaw instance URL or a config screenshot' },
];

export const TRACK_COLORS = {
  human: { bg: 'rgba(245,166,35,0.15)', text: '#f5a623', border: '#f5a623', label: 'Human' },
  agent: { bg: 'rgba(91,141,217,0.15)', text: '#5b8dd9', border: '#5b8dd9', label: 'Agent' },
  both: { bg: 'rgba(120,120,120,0.15)', text: '#888', border: '#888', label: 'Shared' },
};

/** New type-based colors (no 'both'/'shared') — used by BadgesPage and BadgeCard */
export const TYPE_COLORS: Record<'human' | 'agent', { border: string; text: string; bg: string; label: string }> = {
  human: { border: '#F97316', text: '#F97316', bg: 'rgba(249,115,22,0.1)', label: 'Human' },
  agent: { border: '#3B82F6', text: '#3B82F6', bg: 'rgba(59,130,246,0.1)', label: 'Agent' },
};

export const TIER_LABELS = ['Seed', 'Root', 'Branch', 'Crown'];

export const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
];
