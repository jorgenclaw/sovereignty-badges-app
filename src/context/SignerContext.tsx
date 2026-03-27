import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface SignerState {
  pubkey: string | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signEvent: (event: any) => Promise<any>;
}

const SignerContext = createContext<SignerState | null>(null);

export function SignerProvider({ children }: { children: ReactNode }) {
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    // NIP-07: check for window.nostr
    const nostr = (window as any).nostr;
    if (!nostr) {
      alert('No Nostr signer found. Install a browser extension like Alby, nos2x, or Soapbox Signer.');
      return;
    }
    setConnecting(true);
    try {
      const pk = await nostr.getPublicKey();
      setPubkey(pk);
      setConnected(true);
      localStorage.setItem('signer_pubkey', pk);
    } catch (err) {
      console.error('Failed to connect signer:', err);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setPubkey(null);
    setConnected(false);
    localStorage.removeItem('signer_pubkey');
  }, []);

  const signEvent = useCallback(async (event: any) => {
    const nostr = (window as any).nostr;
    if (!nostr) throw new Error('No signer connected');
    return nostr.signEvent(event);
  }, []);

  return (
    <SignerContext.Provider value={{ pubkey, connected, connecting, connect, disconnect, signEvent }}>
      {children}
    </SignerContext.Provider>
  );
}

export function useSigner() {
  const ctx = useContext(SignerContext);
  if (!ctx) throw new Error('useSigner must be used within SignerProvider');
  return ctx;
}
