// Solana network config. Safe to import from client and server — only reads
// NEXT_PUBLIC_* values. The program id is filled in after the Anchor program is
// deployed to devnet (scripts write it here / via env).

export const SOLANA_CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet") as
  | "devnet"
  | "mainnet-beta"
  | "testnet";

export const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

// PitchProof on-chain program (oracle + markets). Placeholder until deploy; the
// deploy script overwrites NEXT_PUBLIC_PROGRAM_ID. `11111111111111111111111111111111`
// is the System Program id, used only as a harmless default so the UI renders.
export const PROGRAM_ID =
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? "11111111111111111111111111111111";

// Demo SPL "USDC" mint used for market stakes on devnet (created by scripts).
export const STAKE_MINT =
  process.env.NEXT_PUBLIC_STAKE_MINT ?? "11111111111111111111111111111111";

export const STAKE_DECIMALS = 6;
export const STAKE_SYMBOL = "dUSDC";

export function explorerTx(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=${SOLANA_CLUSTER}`;
}
export function explorerAddr(addr: string): string {
  return `https://explorer.solana.com/address/${addr}?cluster=${SOLANA_CLUSTER}`;
}

export function isProgramConfigured(): boolean {
  return PROGRAM_ID !== "11111111111111111111111111111111";
}
