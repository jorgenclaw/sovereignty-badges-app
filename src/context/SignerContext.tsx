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

const NIP46_RELAY = 'wss://relay.damus.io';
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

      // Open relay and listen for the signer's connect response
      const relay = new NRelay1(NIP46_RELAY);
      relayRef.current = relay;

      // Listen for kind:24133 events addressed to our ephemeral pubkey
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
        setConnecting(false);
      }, 120_000); // 2 minute timeout

      for await (const msg of relay.req(
        [{ kinds: [24133], '#p': [sessionPkHex] }],
        { signal: controller.signal },
      )) {
        if (msg[0] === 'EVENT') {
          const event = msg[2];
          // The remote signer's pubkey is the event author
          const remotePubkey = event.pubkey;

          // Decrypt the content to check it's an ack/connect response
          try {
            const decrypted = await sessionSigner.nip04.decrypt(
              remotePubkey,
              event.content,
            );
            const response = JSON.parse(decrypted);

            if (response.result === 'ack' || response.result) {
              // Connection established - create the NConnectSigner
              const nip46Signer = new NConnectSigner({
                relay,
                pubkey: remotePubkey,
                signer: sessionSigner,
                timeout: 60_000,
              });

              // Get the actual user pubkey
              const userPubkey = await nip46Signer.getPublicKey();

              localStorage.setItem(LS_REMOTE_PUBKEY, remotePubkey);
              clearTimeout(timeout);
              finishConnect(userPubkey, 'nip46-connect', nip46Signer);
              return uri;
            }
          } catch {
            // Not our message or decryption failed, continue listening
          }
        }
      }

      clearTimeout(timeout);
      return uri;
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
