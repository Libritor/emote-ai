"use client";

import { useMemo } from "react";
import { Buffer } from "buffer";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { SOLANA_RPC } from "@/lib/solana/config";
import "@solana/wallet-adapter-react-ui/styles.css";

// web3.js / wallet-adapter expect a global Buffer in the browser.
if (typeof window !== "undefined") {
  const w = window as unknown as { Buffer?: typeof Buffer };
  w.Buffer = w.Buffer ?? Buffer;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  return (
    <ConnectionProvider endpoint={SOLANA_RPC}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="flex min-h-dvh flex-col">{children}</div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
