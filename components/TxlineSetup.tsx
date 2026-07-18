"use client";

// One-time TxLINE onboarding: Phantom signs the free-tier `subscribe`
// transaction on MAINNET (service level 12 = real-time World Cup), then signs
// the activation message; TxLINE answers with a long-lived API token. The
// JWT + token become server env vars — the browser never uses them for data.

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Buffer } from "buffer";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import txoracleIdl from "@/lib/txline/idl/txoracle.json";
import { TXLINE_MAINNET, TXLINE_DURATION_WEEKS } from "@/lib/txline/config";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false, loading: () => <div className="h-10 w-[132px] rounded-[11px] card-2" /> },
);

type StepState = "idle" | "busy" | "done" | "error";

interface FlowState {
  jwt: string | null;
  txSig: string | null;
  apiToken: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function TxlineSetup() {
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const [serviceLevel, setServiceLevel] = useState<number>(TXLINE_MAINNET.freeServiceLevel);
  const [flow, setFlow] = useState<FlowState>({ jwt: null, txSig: null, apiToken: null });
  const [step, setStep] = useState<Record<"jwt" | "subscribe" | "activate", StepState>>({
    jwt: "idle",
    subscribe: "idle",
    activate: "idle",
  });
  const [log, setLog] = useState<string[]>([]);

  const say = useCallback((line: string) => setLog((l) => [...l, line]), []);

  const programId = useMemo(() => new PublicKey(TXLINE_MAINNET.programId), []);
  const txlMint = useMemo(() => new PublicKey(TXLINE_MAINNET.txlMint), []);

  const getJwt = useCallback(async () => {
    setStep((s) => ({ ...s, jwt: "busy" }));
    try {
      const res = await fetch("/api/txline/guest", { method: "POST" });
      const data: { token?: string; error?: string } = await res.json();
      if (!res.ok || !data.token) throw new Error(data.error ?? "guest auth failed");
      setFlow((f) => ({ ...f, jwt: data.token ?? null }));
      setStep((s) => ({ ...s, jwt: "done" }));
      say(`Guest JWT issued (${data.token.slice(0, 24)}…, valid 30 days)`);
    } catch (e) {
      setStep((s) => ({ ...s, jwt: "error" }));
      say(`JWT error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [say]);

  const subscribe = useCallback(async () => {
    if (!anchorWallet) return say("Connect a wallet first.");
    setStep((s) => ({ ...s, subscribe: "busy" }));
    try {
      const connection = new Connection(TXLINE_MAINNET.rpcUrl, "confirmed");
      const balance = await connection.getBalance(anchorWallet.publicKey);
      say(`Mainnet balance: ${(balance / 1e9).toFixed(5)} SOL`);
      if (balance === 0) {
        throw new Error("wallet has 0 mainnet SOL — the free tier still needs ~0.001 SOL for the tx fee");
      }
      const provider = new AnchorProvider(connection, anchorWallet as never, {
        commitment: "confirmed",
      });
      const program: any = new Program(txoracleIdl as Idl, provider);
      if (!program.programId.equals(programId)) {
        throw new Error(`IDL program ${program.programId.toBase58()} != mainnet ${programId.toBase58()}`);
      }

      const [pricingMatrix] = PublicKey.findProgramAddressSync(
        [Buffer.from("pricing_matrix")],
        programId,
      );
      const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("token_treasury_v2")],
        programId,
      );
      const tokenTreasuryVault = getAssociatedTokenAddressSync(
        txlMint,
        tokenTreasuryPda,
        true,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );
      const userTokenAccount = getAssociatedTokenAddressSync(
        txlMint,
        anchorWallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

      say(`Sending subscribe(serviceLevel=${serviceLevel}, weeks=${TXLINE_DURATION_WEEKS}) on mainnet…`);
      // The program references the user's TxL ATA even on the free tier —
      // create it idempotently in the same transaction.
      const ensureAta = createAssociatedTokenAccountIdempotentInstruction(
        anchorWallet.publicKey,
        userTokenAccount,
        anchorWallet.publicKey,
        txlMint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );
      const txSig: string = await program.methods
        .subscribe(serviceLevel, TXLINE_DURATION_WEEKS)
        .preInstructions([ensureAta])
        .accountsPartial({
          user: anchorWallet.publicKey,
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
      setFlow((f) => ({ ...f, txSig }));
      setStep((s) => ({ ...s, subscribe: "done" }));
      say(`Subscribed on-chain: ${txSig}`);
    } catch (e) {
      setStep((s) => ({ ...s, subscribe: "error" }));
      say(`Subscribe error: ${describeError(e)}`);
    }
  }, [anchorWallet, programId, txlMint, serviceLevel, say]);

  const activate = useCallback(async () => {
    if (!flow.jwt || !flow.txSig) return say("Need the JWT and the subscribe txSig first.");
    if (!wallet.signMessage) return say("This wallet does not support signMessage.");
    setStep((s) => ({ ...s, activate: "busy" }));
    try {
      // Standard free bundle => empty leagues => `${txSig}::${jwt}`.
      const message = `${flow.txSig}::${flow.jwt}`;
      const sig = await wallet.signMessage(new TextEncoder().encode(message));
      const walletSignature = Buffer.from(sig).toString("base64");
      const res = await fetch("/api/txline/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jwt: flow.jwt, txSig: flow.txSig, walletSignature, leagues: [] }),
      });
      const data: { apiToken?: string; error?: string } = await res.json();
      if (!res.ok || !data.apiToken) throw new Error(data.error ?? "activation failed");
      setFlow((f) => ({ ...f, apiToken: data.apiToken ?? null }));
      setStep((s) => ({ ...s, activate: "done" }));
      say("API token issued — copy the env block below.");
    } catch (e) {
      setStep((s) => ({ ...s, activate: "error" }));
      say(`Activate error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [flow.jwt, flow.txSig, wallet, say]);

  const envBlock = flow.jwt && flow.apiToken
    ? `TXODDS_MODE=live\nTXLINE_JWT=${flow.jwt}\nTXLINE_API_TOKEN=${flow.apiToken}`
    : null;

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <WalletMultiButton />
        <label className="ml-auto flex items-center gap-2 text-sm text-muted">
          Service level
          <select
            value={serviceLevel}
            onChange={(e) => setServiceLevel(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-ink"
          >
            <option value={12}>12 — World Cup real-time (free)</option>
            <option value={1}>1 — World Cup 60s delay (free)</option>
          </select>
        </label>
      </div>

      <StepCard
        n={1}
        title="Guest JWT"
        desc="Anonymous 30-day session token from TxLINE."
        state={step.jwt}
        action={getJwt}
        actionLabel="Request JWT"
        value={flow.jwt}
      />
      <StepCard
        n={2}
        title="Subscribe on-chain (mainnet)"
        desc={`Phantom signs subscribe(${serviceLevel}, ${TXLINE_DURATION_WEEKS}) — free tier, only the network fee is paid.`}
        state={step.subscribe}
        action={subscribe}
        actionLabel="Subscribe with wallet"
        value={flow.txSig}
        disabled={!wallet.connected}
      />
      <StepCard
        n={3}
        title="Sign & activate"
        desc="Phantom signs `txSig::jwt`; TxLINE returns the long-lived API token."
        state={step.activate}
        action={activate}
        actionLabel="Activate API token"
        value={flow.apiToken}
        disabled={step.jwt !== "done" || step.subscribe !== "done"}
      />

      {envBlock && (
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Server credentials — add to .env.local and Vercel</h3>
            <button
              className="chip cursor-pointer"
              onClick={() => navigator.clipboard.writeText(envBlock)}
            >
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs">{envBlock}</pre>
          <p className="text-xs text-muted">
            Restart the dev server after saving. The JWT expires in 30 days; the API token lasts for
            the {TXLINE_DURATION_WEEKS}-week subscription.
          </p>
        </div>
      )}

      {log.length > 0 && (
        <pre className="card overflow-x-auto p-3 text-xs text-muted whitespace-pre-wrap">
          {log.join("\n")}
        </pre>
      )}
    </div>
  );
}

/** Wallet/Anchor errors often carry the real cause outside `message`. */
function describeError(e: unknown): string {
  if (!(e instanceof Error)) return JSON.stringify(e);
  const anyErr = e as Error & { error?: { message?: string }; logs?: string[] };
  const parts = [e.name, e.message, anyErr.error?.message].filter(Boolean);
  const logs = anyErr.logs?.slice(-6).join(" | ");
  if (logs) parts.push(`logs: ${logs}`);
  if (parts.join("").trim() === e.name) parts.push(JSON.stringify(e, Object.getOwnPropertyNames(e)).slice(0, 400));
  return parts.join(" — ");
}

function StepCard(props: {
  n: number;
  title: string;
  desc: string;
  state: StepState;
  action: () => void;
  actionLabel: string;
  value: string | null;
  disabled?: boolean;
}) {
  const { n, title, desc, state, action, actionLabel, value, disabled } = props;
  const badge =
    state === "done" ? "✓" : state === "busy" ? "…" : state === "error" ? "✗" : String(n);
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
            state === "done" ? "bg-accent text-base" : state === "error" ? "bg-red-500 text-white" : "bg-surface-2"
          }`}
        >
          {badge}
        </span>
        <div className="min-w-0">
          <h3 className="font-bold">{title}</h3>
          <p className="text-sm text-muted">{desc}</p>
        </div>
        <button
          onClick={action}
          disabled={disabled || state === "busy"}
          className="ml-auto shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-[#1a0f02] disabled:opacity-40"
        >
          {actionLabel}
        </button>
      </div>
      {value && (
        <p className="mt-2 truncate rounded bg-surface-2 px-2 py-1 font-mono text-xs" title={value}>
          {value}
        </p>
      )}
    </div>
  );
}
