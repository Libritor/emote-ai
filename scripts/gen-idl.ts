// Generates the Anchor 0.31 IDL for the PitchProof program deterministically
// from the program's known layout (anchor idl build is flaky on this toolchain).
// Discriminators match Anchor's convention: sha256("global:<ix>")[..8] for
// instructions, sha256("account:<Struct>")[..8] for accounts.
// Run: npx tsx scripts/gen-idl.ts

import { createHash } from "crypto";
import fs from "fs";
import path from "path";

const PROGRAM_ID = "3P82MFkFfDERe5ReK6wVWPbXqjPBTFLGwyq6qexacLL6";
const SYSTEM = "11111111111111111111111111111111";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

const disc = (prefix: string, name: string): number[] =>
  Array.from(createHash("sha256").update(`${prefix}:${name}`).digest().subarray(0, 8));

const ixDisc = (name: string) => disc("global", name);
const acctDisc = (name: string) => disc("account", name);

// type helpers
const arr = (t: unknown, n: number) => ({ array: [t, n] });
const defined = (name: string) => ({ defined: { name } });

const matchArgsFields = [
  { name: "match_id", type: "u32" },
  { name: "home", type: arr("u8", 3) },
  { name: "away", type: arr("u8", 3) },
  { name: "kickoff", type: "i64" },
  { name: "status", type: "u8" },
  { name: "home_score", type: "u8" },
  { name: "away_score", type: "u8" },
  { name: "outcome", type: "u8" },
  { name: "data_hash", type: arr("u8", 32) },
];

const idl = {
  address: PROGRAM_ID,
  metadata: {
    name: "pitchproof",
    version: "0.1.0",
    spec: "0.1.0",
    description: "On-chain World Cup oracle + pari-mutuel prediction markets",
  },
  instructions: [
    {
      name: "init_oracle",
      discriminator: ixDisc("init_oracle"),
      accounts: [
        { name: "oracle", writable: true },
        { name: "admin", writable: true, signer: true },
        { name: "system_program", address: SYSTEM },
      ],
      args: [{ name: "authority", type: "pubkey" }],
    },
    {
      name: "upsert_match",
      discriminator: ixDisc("upsert_match"),
      accounts: [
        { name: "oracle", writable: true },
        { name: "match_data", writable: true },
        { name: "authority", writable: true, signer: true },
        { name: "system_program", address: SYSTEM },
      ],
      args: [{ name: "args", type: defined("MatchArgs") }],
    },
    {
      name: "create_market",
      discriminator: ixDisc("create_market"),
      accounts: [
        { name: "match_data" },
        { name: "market", writable: true },
        { name: "mint" },
        { name: "vault", writable: true },
        { name: "creator", writable: true, signer: true },
        { name: "token_program", address: TOKEN },
        { name: "system_program", address: SYSTEM },
      ],
      args: [
        { name: "match_id", type: "u32" },
        { name: "kind", type: "u8" },
      ],
    },
    {
      name: "place_position",
      discriminator: ixDisc("place_position"),
      accounts: [
        { name: "market", writable: true },
        { name: "match_data" },
        { name: "position", writable: true },
        { name: "vault", writable: true },
        { name: "user_token", writable: true },
        { name: "user", writable: true, signer: true },
        { name: "token_program", address: TOKEN },
        { name: "system_program", address: SYSTEM },
      ],
      args: [
        { name: "outcome_index", type: "u8" },
        { name: "amount", type: "u64" },
      ],
    },
    {
      name: "resolve_market",
      discriminator: ixDisc("resolve_market"),
      accounts: [
        { name: "market", writable: true },
        { name: "match_data" },
      ],
      args: [],
    },
    {
      name: "claim",
      discriminator: ixDisc("claim"),
      accounts: [
        { name: "market" },
        { name: "position", writable: true },
        { name: "vault", writable: true },
        { name: "user_token", writable: true },
        { name: "user", writable: true, signer: true },
        { name: "token_program", address: TOKEN },
      ],
      args: [],
    },
    {
      name: "place_pick",
      discriminator: ixDisc("place_pick"),
      accounts: [
        { name: "pick", writable: true },
        { name: "user", writable: true, signer: true },
        { name: "system_program", address: SYSTEM },
      ],
      args: [
        { name: "match_id", type: "u32" },
        { name: "outcome", type: "u8" },
      ],
    },
  ],
  accounts: [
    { name: "Oracle", discriminator: acctDisc("Oracle") },
    { name: "MatchData", discriminator: acctDisc("MatchData") },
    { name: "Market", discriminator: acctDisc("Market") },
    { name: "Position", discriminator: acctDisc("Position") },
    { name: "Pick", discriminator: acctDisc("Pick") },
  ],
  types: [
    {
      name: "MatchArgs",
      type: { kind: "struct", fields: matchArgsFields },
    },
    {
      name: "Oracle",
      type: {
        kind: "struct",
        fields: [
          { name: "admin", type: "pubkey" },
          { name: "authority", type: "pubkey" },
          { name: "match_count", type: "u32" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "MatchData",
      type: {
        kind: "struct",
        fields: [
          { name: "match_id", type: "u32" },
          { name: "home", type: arr("u8", 3) },
          { name: "away", type: arr("u8", 3) },
          { name: "kickoff", type: "i64" },
          { name: "status", type: "u8" },
          { name: "home_score", type: "u8" },
          { name: "away_score", type: "u8" },
          { name: "outcome", type: "u8" },
          { name: "data_hash", type: arr("u8", 32) },
          { name: "updated_at", type: "i64" },
          { name: "settled", type: "bool" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "Market",
      type: {
        kind: "struct",
        fields: [
          { name: "match_id", type: "u32" },
          { name: "kind", type: "u8" },
          { name: "mint", type: "pubkey" },
          { name: "pools", type: arr("u64", 3) },
          { name: "total", type: "u64" },
          { name: "resolved", type: "bool" },
          { name: "winning_index", type: "u8" },
          { name: "bump", type: "u8" },
          { name: "vault_bump", type: "u8" },
        ],
      },
    },
    {
      name: "Position",
      type: {
        kind: "struct",
        fields: [
          { name: "market", type: "pubkey" },
          { name: "user", type: "pubkey" },
          { name: "outcome_index", type: "u8" },
          { name: "amount", type: "u64" },
          { name: "claimed", type: "bool" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "Pick",
      type: {
        kind: "struct",
        fields: [
          { name: "user", type: "pubkey" },
          { name: "match_id", type: "u32" },
          { name: "outcome", type: "u8" },
          { name: "created_at", type: "i64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
  errors: [
    { code: 6000, name: "Unauthorized", msg: "Signer is not the oracle authority" },
    { code: 6001, name: "BadMatchId", msg: "Match id must be non-zero" },
    { code: 6002, name: "BadOutcome", msg: "Outcome index out of range" },
    { code: 6003, name: "BadAmount", msg: "Amount must be greater than zero" },
    { code: 6004, name: "MarketResolved", msg: "Market already resolved" },
    { code: 6005, name: "MatchClosed", msg: "Match is closed to new positions" },
    { code: 6006, name: "OutcomeMismatch", msg: "Position already has a different outcome" },
    { code: 6007, name: "NotSettled", msg: "Match is not settled yet" },
    { code: 6008, name: "NotResolved", msg: "Market is not resolved yet" },
    { code: 6009, name: "AlreadyClaimed", msg: "Winnings already claimed" },
    { code: 6010, name: "Mismatch", msg: "Market/match mismatch" },
    { code: 6011, name: "WrongMint", msg: "Token account mint does not match market" },
    { code: 6012, name: "Overflow", msg: "Arithmetic overflow" },
  ],
};

const outDir = path.join(process.cwd(), "lib", "solana", "idl");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "pitchproof.json"), JSON.stringify(idl, null, 2));
console.log("wrote lib/solana/idl/pitchproof.json");
console.log("instructions:", idl.instructions.map((i) => i.name).join(", "));
