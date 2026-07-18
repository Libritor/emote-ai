// Headless TxLINE free-tier activation (no browser/wallet-extension needed).
//
//   node scripts/txline/activate.mjs [--network devnet|mainnet] [--service-level N]
//
// Flow: keypair (generated under .keys/) -> guest JWT -> on-chain subscribe ->
// sign `${txSig}::${jwt}` -> POST /api/token/activate -> print env block.
// Devnet funds itself via airdrop; mainnet needs the printed address funded
// with ~0.003 SOL first (the tier itself is free).

import fs from "node:fs";
import path from "node:path";
import anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { ed25519 } from "@noble/curves/ed25519";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const idl = require("../../lib/txline/idl/txoracle.json");

const NETWORKS = {
  mainnet: {
    rpcUrl: process.env.TXLINE_RPC ?? "https://solana-rpc.publicnode.com",
    apiOrigin: "https://txline.txodds.com",
    programId: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
    txlMint: "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL",
    defaultServiceLevel: 12,
  },
  devnet: {
    rpcUrl: process.env.TXLINE_RPC ?? "https://api.devnet.solana.com",
    apiOrigin: "https://txline-dev.txodds.com",
    programId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
    txlMint: "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG",
    defaultServiceLevel: 1,
  },
};

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const networkName = arg("network", "devnet");
const net = NETWORKS[networkName];
if (!net) throw new Error(`unknown network ${networkName}`);
const serviceLevel = Number(arg("service-level", net.defaultServiceLevel));
const weeks = 4;

const keyPath = path.resolve(`.keys/txline-${networkName}.json`);
fs.mkdirSync(path.dirname(keyPath), { recursive: true });
let keypair;
if (fs.existsSync(keyPath)) {
  keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keyPath, "utf8"))));
  console.log(`wallet (existing): ${keypair.publicKey.toBase58()}`);
} else {
  keypair = Keypair.generate();
  fs.writeFileSync(keyPath, JSON.stringify([...keypair.secretKey]));
  console.log(`wallet (new, saved to ${keyPath}): ${keypair.publicKey.toBase58()}`);
}

const connection = new Connection(net.rpcUrl, "confirmed");
const programId = new PublicKey(net.programId);
const txlMint = new PublicKey(net.txlMint);

let balance = await connection.getBalance(keypair.publicKey);
console.log(`balance on ${networkName}: ${(balance / 1e9).toFixed(5)} SOL`);
if (balance < 3_000_000) {
  if (networkName === "devnet") {
    console.log("requesting devnet airdrop…");
    const sig = await connection.requestAirdrop(keypair.publicKey, 1_000_000_000);
    await connection.confirmTransaction(sig, "confirmed");
    balance = await connection.getBalance(keypair.publicKey);
    console.log(`balance after airdrop: ${(balance / 1e9).toFixed(5)} SOL`);
  } else {
    console.log(`\nFund this address with ~0.003 SOL (mainnet) and re-run:\n  ${keypair.publicKey.toBase58()}\n`);
    process.exit(2);
  }
}

// 1. Guest JWT
const authRes = await fetch(`${net.apiOrigin}/auth/guest/start`, { method: "POST" });
if (!authRes.ok) throw new Error(`guest auth ${authRes.status}: ${await authRes.text()}`);
const { token: jwt } = await authRes.json();
console.log(`guest JWT issued (${jwt.slice(0, 24)}…)`);

// 2. On-chain subscribe
const wallet = new anchor.Wallet(keypair);
const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
const programIdl = { ...idl, address: net.programId };
const program = new anchor.Program(programIdl, provider);

const [pricingMatrix] = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], programId);
const [tokenTreasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], programId);
const tokenTreasuryVault = getAssociatedTokenAddressSync(
  txlMint, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
);
const userTokenAccount = getAssociatedTokenAddressSync(
  txlMint, keypair.publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
);
const ensureAta = createAssociatedTokenAccountIdempotentInstruction(
  keypair.publicKey, userTokenAccount, keypair.publicKey, txlMint,
  TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
);

console.log(`subscribing: serviceLevel=${serviceLevel} weeks=${weeks} on ${networkName}…`);
const txSig = await program.methods
  .subscribe(serviceLevel, weeks)
  .preInstructions([ensureAta])
  .accountsPartial({
    user: keypair.publicKey,
    pricingMatrix,
    tokenMint: txlMint,
    userTokenAccount,
    tokenTreasuryVault,
    tokenTreasuryPda,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
console.log(`subscribed: ${txSig}`);

// 3. Detached signature over `${txSig}::${jwt}` (empty leagues bundle)
const message = new TextEncoder().encode(`${txSig}::${jwt}`);
const signature = ed25519.sign(message, keypair.secretKey.slice(0, 32));
const walletSignature = Buffer.from(signature).toString("base64");

// 4. Activate
const actRes = await fetch(`${net.apiOrigin}/api/token/activate`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
  body: JSON.stringify({ txSig, walletSignature, leagues: [] }),
});
const actText = await actRes.text();
if (!actRes.ok) throw new Error(`activation ${actRes.status}: ${actText}`);
let apiToken = actText.trim();
try {
  const parsed = JSON.parse(actText);
  if (parsed.token) apiToken = parsed.token;
} catch { /* plain-text token */ }

console.log("\n--- add to .env.local (and Vercel) ---");
console.log(`TXODDS_MODE=live`);
console.log(`TXLINE_API_ORIGIN=${net.apiOrigin}`);
console.log(`TXLINE_JWT=${jwt}`);
console.log(`TXLINE_API_TOKEN=${apiToken}`);
