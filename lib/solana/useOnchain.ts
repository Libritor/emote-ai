"use client";

// React hook exposing the on-chain actions used across the app. Wallet-signed;
// all PDAs derived from lib/solana/pda.ts. Amounts are UI units of the demo mint.

import { useCallback, useMemo } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getProgram, type SignerWallet } from "./program";
import { PROGRAM_ID, STAKE_MINT, STAKE_DECIMALS } from "./config";
import { marketPda, matchPda, vaultPda, positionPda, pickPda, outcomeToIndex } from "./pda";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function useOnchain() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const programId = useMemo(() => new PublicKey(PROGRAM_ID), []);
  const mint = useMemo(() => {
    try { return new PublicKey(STAKE_MINT); } catch { return null; }
  }, []);

  const program = useMemo(
    () => (wallet ? getProgram(connection, wallet as unknown as SignerWallet) : null),
    [connection, wallet],
  );

  /** Request test dUSDC from the server faucet (mints to the user's ATA). */
  const getTestTokens = useCallback(async () => {
    if (!wallet) throw new Error("connect a wallet");
    const res = await fetch("/api/faucet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pubkey: wallet.publicKey.toBase58() }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "faucet failed");
    return res.json();
  }, [wallet]);

  const placePosition = useCallback(
    async (matchId: number, outcome: "1" | "X" | "2", amountUi: number) => {
      if (!program || !wallet || !mint) throw new Error("wallet or mint not ready");
      const user = wallet.publicKey;
      const [market] = marketPda(programId, matchId);
      const [matchData] = matchPda(programId, matchId);
      const [vault] = vaultPda(programId, market);
      const [position] = positionPda(programId, market, user);
      const userToken = getAssociatedTokenAddressSync(mint, user);

      // Create the market on first use.
      const marketInfo = await connection.getAccountInfo(market);
      if (!marketInfo) {
        await program.methods
          .createMarket(matchId, 0)
          .accountsPartial({
            matchData, market, mint, vault, creator: user,
            tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
          })
          .rpc();
      }

      const amount = new BN(Math.round(amountUi * 10 ** STAKE_DECIMALS));
      return program.methods
        .placePosition(outcomeToIndex(outcome), amount)
        .accountsPartial({
          market, matchData, position, vault, userToken, user,
          tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
        })
        .rpc();
    },
    [program, wallet, mint, programId, connection],
  );

  const claim = useCallback(
    async (matchId: number) => {
      if (!program || !wallet || !mint) throw new Error("wallet not ready");
      const user = wallet.publicKey;
      const [market] = marketPda(programId, matchId);
      const [matchData] = matchPda(programId, matchId);
      const [vault] = vaultPda(programId, market);
      const [position] = positionPda(programId, market, user);
      const userToken = getAssociatedTokenAddressSync(mint, user);

      // Resolve the market first if the oracle has settled the match.
      const mk: any = await program.account.market.fetch(market).catch(() => null);
      if (mk && !mk.resolved) {
        await program.methods.resolveMarket().accountsPartial({ market, matchData }).rpc();
      }
      return program.methods
        .claim()
        .accountsPartial({ market, position, vault, userToken, user, tokenProgram: TOKEN_PROGRAM_ID })
        .rpc();
    },
    [program, wallet, mint, programId],
  );

  const placePick = useCallback(
    async (matchId: number, outcome: "1" | "X" | "2") => {
      if (!program || !wallet) throw new Error("connect a wallet");
      const user = wallet.publicKey;
      const [pick] = pickPda(programId, user, matchId);
      const code = outcome === "1" ? 1 : outcome === "X" ? 2 : 3;
      return program.methods
        .placePick(matchId, code)
        .accountsPartial({ pick, user, systemProgram: SystemProgram.programId })
        .rpc();
    },
    [program, wallet, programId],
  );

  return { program, wallet, connected: !!wallet, getTestTokens, placePosition, claim, placePick };
}
