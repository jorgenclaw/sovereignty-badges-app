import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import {
  NBrowserSigner,
  NConnectSigner,
  NSecSigner,
  NRelay1,
} from '@nostrify/nostrify';
import type { NostrSigner } from '@nostrify/types';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from 'nostr-tools/utils';
import { SimplePool } from 'nostr-tools/pool';
import { nip04 } from 'nostr-tools';
import * as nip44 from 'nostr-tools/nip44';

export type SignerMethod = 'nip07' | 'nip46-connect' | 'nip46-bunker';

interface SignerState {
  pubkey: string | null;
  connected: boolean;
  connecting: boolean;
  signerMethod: SignerMethod | null;
  /** Open the connection modal */
  openModal: () => void;
  /** Close the connection modal */
  closeModal: () => void;
  modalOpen: boolean;
  /** Connect via NIP-07 browser extension */
  connectNip07: () => Promise<void>;
  /** Connect via NIP-46 nostrconnect:// (generates URI for QR/deep link) */
  connectNip46: () => Promise<string>;
  /** Connect via NIP-46 bunker:// URI */
  connectBunker: (bunkerUri: string) => Promise<void>;
  disconnect: () => void;
  signEvent: (event: any) => Promise<any>;
  /** The nostrconnect:// URI (set after connectNip46 is called) */
  connectUri: string | null;
}

// Use multiple relays for NIP-46 — Amber may respond on any of these
const NIP46_RELAYS = ['wss://relay.damus.io', 'wss://relay.nsec.app', 'wss://nos.lol'];
const NIP46_RELAY = NIP46_RELAYS[0]; // Primary for URI generation
const APP_NAME = 'Sovereignty Badges';
const APP_URL = 'https://sovereignty.jorgenclaw.ai/app';

const SignerContext = createContext<SignerState | null>(null);

// localStorage keys
const LS_METHOD = 'signer_method';
const LS_PUBKEY = 'signer_pubkey';
const LS_SESSION_SK = 'signer_session_sk';
const LS_REMOTE_PUBKEY = 'signer_remote_pubkey';
const LS_BUNKER_URI = 'signer_bunker_uri';

export function SignerProvider({ children }: { children: ReactNode }) {
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [signerMethod, setSignerMethod] = useState<SignerMethod | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [connectUri, setConnectUri] = useState<string | null>(null);

  const signerRef = useRef<NostrSigner | null>(null);
  const relayRef = useRef<NRelay1 | null>(null);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setConnectUri(null);
  }, []);

  // Helper: finish connection
  const finishConnect = useCallback(
    (pk: string, method: SignerMethod, signer: NostrSigner) => {
      setPubkey(pk);
      setConnected(true);
      setConnecting(false);
      setSignerMethod(method);
      signerRef.current = signer;
      setModalOpen(false);
      setConnectUri(null);
      localStorage.setItem(LS_METHOD, method);
      localStorage.setItem(LS_PUBKEY, pk);
    },
    [],
  );

  // NIP-07
  const connectNip07 = useCallback(async () => {
    setConnecting(true);
    try {
      const signer = new NBrowserSigner({ timeout: 3000 });
      const pk = await signer.getPublicKey();
      finishConnect(pk, 'nip07', signer);
    } catch (err) {
      console.error('NIP-07 connect failed:', err);
      setConnecting(false);
      throw err;
    }
  }, [finishConnect]);

  // NIP-46 nostrconnect:// flow
  const connectNip46 = useCallback(async (): Promise<string> => {
    setConnecting(true);
    try {
      // Generate ephemeral session keypair
      const sessionSk = generateSecretKey();
      const sessionPkHex = getPublicKey(sessionSk);
      const sessionSigner = new NSecSigner(sessionSk);

      // Store session key for reconnection
      localStorage.setItem(LS_SESSION_SK, bytesToHex(sessionSk));

      // Build nostrconnect:// URI
      const metadata = JSON.stringify({ name: APP_NAME, url: APP_URL });
      const uri = `nostrconnect://${sessionPkHex}?relay=${encodeURIComponent(NIP46_RELAY)}&metadata=${encodeURIComponent(metadata)}`;
      setConnectUri(uri);

      // Listen on multiple relays for Amber's NIP-46 response
      const pool = new SimplePool();
      const sessionSkHex = bytesToHex(sessionSk);

      // Add debug status to help diagnose connection issues
      console.log('[NIP-46] Listening for kind:24133 #p=' + sessionPkHex.slice(0, 12) + '... on', NIP46_RELAYS);

      return new Promise<string>((resolve, reject) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            pool.close(NIP46_RELAYS);
            setConnecting(false);
            reject(new Error('NIP-46 connection timed out'));
          }
        }, 120_000);

        // Subscribe with broad filter — no `since` (clock skew can cause misses)
        // Use array of filters as subscribeMany expects
        pool.subscribeMany(
          NIP46_RELAYS,
          { kinds: [24133], '#p': [sessionPkHex] },
          {
            onevent: async (event) => {
              if (resolved) return;
              const remotePubkey = event.pubkey;
              console.log('[NIP-46] Received kind:24133 from', remotePubkey.slice(0, 12) + '...');

              // Try NIP-44 first (Amber default), then NIP-04, then plain JSON
              let decrypted: string | null = null;

              // NIP-44 decryption
              try {
                const conversationKey = nip44.v2.utils.getConversationKey(sessionSk, remotePubkey);
                decrypted = nip44.v2.decrypt(event.content, conversationKey);
                console.log('[NIP-46] NIP-44 decrypt succeeded');
              } catch (e44) {
                console.log('[NIP-46] NIP-44 decrypt failed:', (e44 as Error).message?.slice(0, 50));
              }

              // NIP-04 fallback
              if (!decrypted) {
                try {
                  decrypted = await nip04.decrypt(sessionSkHex, remotePubkey, event.content);
                  console.log('[NIP-46] NIP-04 decrypt succeeded');
                } catch (e04) {
                  console.log('[NIP-46] NIP-04 decrypt failed:', (e04 as Error).message?.slice(0, 50));
                }
              }

              // Plain JSON fallback
              if (!decrypted) {
                try {
                  JSON.parse(event.content);
                  decrypted = event.content;
                  console.log('[NIP-46] Plain JSON parse succeeded');
                } catch {
                  console.log('[NIP-46] All decryption methods failed, skipping event');
                  return;
                }
              }

              if (!decrypted) return;

              try {
                const response = JSON.parse(decrypted);
                console.log('[NIP-46] Parsed response:', JSON.stringify(response).slice(0, 100));

                // Accept any response that looks like an ack
                if (response.result === 'ack' || response.result || response.id) {
                  resolved = true;

                  // Connection established — create NConnectSigner on the primary relay
                  const relay = new NRelay1(NIP46_RELAY);
                  relayRef.current = relay;

                  const nip46Signer = new NConnectSigner({
                    relay,
                    pubkey: remotePubkey,
                    signer: sessionSigner,
                    timeout: 60_000,
                  });

                  // Try to get pubkey — this may fail if the signer needs a different relay
                  let userPubkey: string;
                  try {
                    userPubkey = await nip46Signer.getPublicKey();
                  } catch {
                    // Fallback: use the remote pubkey as the user pubkey
                    userPubkey = remotePubkey;
                  }

                  localStorage.setItem(LS_REMOTE_PUBKEY, remotePubkey);
                  clearTimeout(timeout);
                  pool.close(NIP46_RELAYS);
                  finishConnect(userPubkey, 'nip46-connect', nip46Signer);
                  resolve(uri);
                }
              } catch {
                console.log('[NIP-46] Failed to parse decrypted content');
              }
            },
          },
        );
      });
    } catch (err) {
      console.error('NIP-46 connect failed:', err);
      setConnecting(false);
      throw err;
    }
  }, [finishConnect]);

  // NIP-46 bunker:// flow
  const connectBunker = useCallback(
    async (bunkerUri: string) => {
      setConnecting(true);
      try {
        // Parse the bunker URI: bunker://<remote-pubkey>?relay=...&secret=...
        const url = new URL(bunkerUri.replace('bunker://', 'https://'));
        const remotePubkey = url.hostname || url.pathname.replace('//', '');
        const relayUrl =
          url.searchParams.get('relay') || NIP46_RELAY;
        const secret = url.searchParams.get('secret') || undefined;

        // Generate or reuse session keypair
        let sessionSk: Uint8Array;
        const storedSk = localStorage.getItem(LS_SESSION_SK);
        if (storedSk) {
          sessionSk = hexToBytes(storedSk);
        } else {
          sessionSk = generateSecretKey();
          localStorage.setItem(LS_SESSION_SK, bytesToHex(sessionSk));
        }
        const sessionSigner = new NSecSigner(sessionSk);

        const relay = new NRelay1(relayUrl);
        relayRef.current = relay;

        const nip46Signer = new NConnectSigner({
          relay,
          pubkey: remotePubkey,
          signer: sessionSigner,
          timeout: 60_000,
        });

        // Send connect command
        await nip46Signer.connect(secret);

        const userPubkey = await nip46Signer.getPublicKey();

        localStorage.setItem(LS_REMOTE_PUBKEY, remotePubkey);
        localStorage.setItem(LS_BUNKER_URI, bunkerUri);
        finishConnect(userPubkey, 'nip46-bunker', nip46Signer);
      } catch (err) {
        console.error('Bunker connect failed:', err);
        setConnecting(false);
        throw err;
      }
    },
    [finishConnect],
  );

  // Disconnect
  const disconnect = useCallback(() => {
    setPubkey(null);
    setConnected(false);
    setSignerMethod(null);
    signerRef.current = null;
    setConnectUri(null);

    // Close relay if open
    if (relayRef.current) {
      relayRef.current.close();
      relayRef.current = null;
    }

    localStorage.removeItem(LS_METHOD);
    localStorage.removeItem(LS_PUBKEY);
    localStorage.removeItem(LS_SESSION_SK);
    localStorage.removeItem(LS_REMOTE_PUBKEY);
    localStorage.removeItem(LS_BUNKER_URI);
  }, []);

  // Sign event
  const signEvent = useCallback(async (event: any) => {
    if (!signerRef.current) throw new Error('No signer connected');
    return signerRef.current.signEvent(event);
  }, []);

  // Restore session on mount
  useEffect(() => {
    const method = localStorage.getItem(LS_METHOD) as SignerMethod | null;
    if (!method) return;

    (async () => {
      try {
        if (method === 'nip07') {
          const signer = new NBrowserSigner({ timeout: 3000 });
          const pk = await signer.getPublicKey();
          signerRef.current = signer;
          setPubkey(pk);
          setConnected(true);
          setSignerMethod('nip07');
        } else if (method === 'nip46-bunker') {
          const bunkerUri = localStorage.getItem(LS_BUNKER_URI);
          const storedSk = localStorage.getItem(LS_SESSION_SK);
          const remotePubkey = localStorage.getItem(LS_REMOTE_PUBKEY);
          if (bunkerUri && storedSk && remotePubkey) {
            const url = new URL(bunkerUri.replace('bunker://', 'https://'));
            const relayUrl = url.searchParams.get('relay') || NIP46_RELAY;
            const sessionSigner = new NSecSigner(hexToBytes(storedSk));
            const relay = new NRelay1(relayUrl);
            relayRef.current = relay;
            const nip46Signer = new NConnectSigner({
              relay,
              pubkey: remotePubkey,
              signer: sessionSigner,
              timeout: 60_000,
            });
            const pk = await nip46Signer.getPublicKey();
            signerRef.current = nip46Signer;
            setPubkey(pk);
            setConnected(true);
            setSignerMethod('nip46-bunker');
          }
        } else if (method === 'nip46-connect') {
          const storedSk = localStorage.getItem(LS_SESSION_SK);
          const remotePubkey = localStorage.getItem(LS_REMOTE_PUBKEY);
          if (storedSk && remotePubkey) {
            const sessionSigner = new NSecSigner(hexToBytes(storedSk));
            const relay = new NRelay1(NIP46_RELAY);
            relayRef.current = relay;
            const nip46Signer = new NConnectSigner({
              relay,
              pubkey: remotePubkey,
              signer: sessionSigner,
              timeout: 60_000,
            });
            const pk = await nip46Signer.getPublicKey();
            signerRef.current = nip46Signer;
            setPubkey(pk);
            setConnected(true);
            setSignerMethod('nip46-connect');
          }
        }
      } catch (err) {
        console.warn('Failed to restore signer session:', err);
        // Clear stale session data
        localStorage.removeItem(LS_METHOD);
        localStorage.removeItem(LS_PUBKEY);
        localStorage.removeItem(LS_SESSION_SK);
        localStorage.removeItem(LS_REMOTE_PUBKEY);
        localStorage.removeItem(LS_BUNKER_URI);
      }
    })();
  }, []);

  return (
    <SignerContext.Provider
      value={{
        pubkey,
        connected,
        connecting,
        signerMethod,
        openModal,
        closeModal,
        modalOpen,
        connectNip07,
        connectNip46,
        connectBunker,
        disconnect,
        signEvent,
        connectUri,
      }}
    >
      {children}
    </SignerContext.Provider>
  );
}

export function useSigner() {
  const ctx = useContext(SignerContext);
  if (!ctx) throw new Error('useSigner must be used within SignerProvider');
  return ctx;
}
