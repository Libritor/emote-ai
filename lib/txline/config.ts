// TxLINE network + credential configuration.
//
// The on-chain side (subscribe) and the off-chain API must live on the SAME
// network. We use mainnet: the World Cup free tier there offers service level
// 12 (real-time). The app's own pitchproof program stays on devnet — the two
// clusters are independent.

export interface TxlineNetworkConfig {
  /** Off-chain API origin, e.g. https://txline.txodds.com */
  apiOrigin: string;
  /** txoracle program id (base58). */
  programId: string;
  /** TxL utility token mint (Token-2022, base58). */
  txlMint: string;
  /** Solana RPC for the subscribe transaction. */
  rpcUrl: string;
  /** Free World Cup service level (12 = real-time on mainnet). */
  freeServiceLevel: number;
}

export const TXLINE_MAINNET: TxlineNetworkConfig = {
  apiOrigin: "https://txline.txodds.com",
  programId: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
  txlMint: "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL",
  // api.mainnet-beta.solana.com 403s browser traffic; publicnode is keyless
  // with permissive CORS. Override with NEXT_PUBLIC_TXLINE_RPC if it degrades.
  rpcUrl: process.env.NEXT_PUBLIC_TXLINE_RPC ?? "https://solana-rpc.publicnode.com",
  freeServiceLevel: 12,
};

/** Subscription length; TxLINE requires a multiple of 4 weeks. */
export const TXLINE_DURATION_WEEKS: number = 4;

export interface TxlineServerConfig {
  apiOrigin: string;
  jwt: string;
  apiToken: string;
}

/**
 * Server-side credentials (never shipped to the browser).
 * - TXLINE_JWT: guest JWT from POST /auth/guest/start (30-day expiry)
 * - TXLINE_API_TOKEN: long-lived token from POST /api/token/activate
 */
export function getTxlineServerConfig(): TxlineServerConfig {
  const apiOrigin = process.env.TXLINE_API_ORIGIN ?? TXLINE_MAINNET.apiOrigin;
  const jwt = process.env.TXLINE_JWT;
  const apiToken = process.env.TXLINE_API_TOKEN;
  if (!jwt || !apiToken) {
    throw new Error(
      "TXODDS_MODE=live but TXLINE_JWT / TXLINE_API_TOKEN are not set. " +
        "Run the one-time Phantom flow at /setup/txline to obtain them.",
    );
  }
  return { apiOrigin, jwt, apiToken };
}
