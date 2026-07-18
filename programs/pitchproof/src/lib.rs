// PitchProof — on-chain World Cup oracle + pari-mutuel prediction markets.
//
// Flow:
//   init_oracle          admin creates the oracle config (sets the relayer authority)
//   upsert_match         relayer writes/updates a match: teams, status, score, outcome, data_hash
//   create_market        anyone opens a 1X2 market for a match (with a demo SPL stake mint)
//   place_position       users stake the SPL token on an outcome (funds pool via a PDA vault)
//   resolve_market       once the match is settled by the oracle, lock in the winning outcome
//   claim                winners withdraw their pro-rata share of the whole pool
//   place_pick           free (no-stake) pick used by the MatchDay fan game
//
// The oracle result + sha256 data_hash written by `upsert_match` is the single
// source of truth every market settles against — verifiable by anyone.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("3P82MFkFfDERe5ReK6wVWPbXqjPBTFLGwyq6qexacLL6");

#[program]
pub mod pitchproof {
    use super::*;

    pub fn init_oracle(ctx: Context<InitOracle>, authority: Pubkey) -> Result<()> {
        let o = &mut ctx.accounts.oracle;
        o.admin = ctx.accounts.admin.key();
        o.authority = authority;
        o.match_count = 0;
        o.bump = ctx.bumps.oracle;
        Ok(())
    }

    /// Relayer-only. Idempotently writes a match's current state on-chain.
    pub fn upsert_match(ctx: Context<UpsertMatch>, args: MatchArgs) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.authority.key(),
            ctx.accounts.oracle.authority,
            PpError::Unauthorized
        );
        require!(args.match_id != 0, PpError::BadMatchId);

        let fresh = ctx.accounts.match_data.match_id == 0;
        let m = &mut ctx.accounts.match_data;
        m.match_id = args.match_id;
        m.home = args.home;
        m.away = args.away;
        m.kickoff = args.kickoff;
        m.status = args.status;
        m.home_score = args.home_score;
        m.away_score = args.away_score;
        m.outcome = args.outcome;
        m.data_hash = args.data_hash;
        m.updated_at = Clock::get()?.unix_timestamp;
        m.settled = args.status == STATUS_FINAL && args.outcome != OUTCOME_UNSET;
        m.bump = ctx.bumps.match_data;

        if fresh {
            ctx.accounts.oracle.match_count = ctx.accounts.oracle.match_count.saturating_add(1);
        }
        Ok(())
    }

    pub fn create_market(ctx: Context<CreateMarket>, match_id: u32, kind: u8) -> Result<()> {
        let mk = &mut ctx.accounts.market;
        mk.match_id = match_id;
        mk.kind = kind;
        mk.mint = ctx.accounts.mint.key();
        mk.pools = [0; 3];
        mk.total = 0;
        mk.resolved = false;
        mk.winning_index = 0;
        mk.bump = ctx.bumps.market;
        mk.vault_bump = ctx.bumps.vault;
        Ok(())
    }

    pub fn place_position(ctx: Context<PlacePosition>, outcome_index: u8, amount: u64) -> Result<()> {
        require!((outcome_index as usize) < 3, PpError::BadOutcome);
        require!(amount > 0, PpError::BadAmount);
        require!(!ctx.accounts.market.resolved, PpError::MarketResolved);
        require!(ctx.accounts.match_data.status != STATUS_FINAL, PpError::MatchClosed);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        let market_key = ctx.accounts.market.key();
        let pos = &mut ctx.accounts.position;
        if pos.amount == 0 {
            pos.market = market_key;
            pos.user = ctx.accounts.user.key();
            pos.outcome_index = outcome_index;
            pos.claimed = false;
            pos.bump = ctx.bumps.position;
        } else {
            require!(pos.outcome_index == outcome_index, PpError::OutcomeMismatch);
        }
        pos.amount = pos.amount.checked_add(amount).ok_or(PpError::Overflow)?;

        let market = &mut ctx.accounts.market;
        let i = outcome_index as usize;
        market.pools[i] = market.pools[i].checked_add(amount).ok_or(PpError::Overflow)?;
        market.total = market.total.checked_add(amount).ok_or(PpError::Overflow)?;
        Ok(())
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>) -> Result<()> {
        let m = &ctx.accounts.match_data;
        require!(m.settled && m.outcome != OUTCOME_UNSET, PpError::NotSettled);
        let market = &mut ctx.accounts.market;
        require!(!market.resolved, PpError::MarketResolved);
        require!(market.match_id == m.match_id, PpError::Mismatch);
        market.winning_index = outcome_to_index(m.outcome);
        market.resolved = true;
        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        require!(ctx.accounts.market.resolved, PpError::NotResolved);
        require!(!ctx.accounts.position.claimed, PpError::AlreadyClaimed);
        require_keys_eq!(
            ctx.accounts.position.user,
            ctx.accounts.user.key(),
            PpError::Unauthorized
        );

        let win = ctx.accounts.market.winning_index as usize;
        let win_pool = ctx.accounts.market.pools[win];
        let total = ctx.accounts.market.total;
        let match_id = ctx.accounts.market.match_id;
        let kind = ctx.accounts.market.kind;
        let mbump = ctx.accounts.market.bump;
        let pos_index = ctx.accounts.position.outcome_index as usize;
        let pos_amount = ctx.accounts.position.amount;

        let payout: u64 = if pos_index == win && win_pool > 0 {
            ((pos_amount as u128) * (total as u128) / (win_pool as u128)) as u64
        } else {
            0
        };

        ctx.accounts.position.claimed = true;

        if payout > 0 {
            let id_bytes = match_id.to_le_bytes();
            let kind_arr = [kind];
            let bump_arr = [mbump];
            let seeds: &[&[u8]] = &[b"market", id_bytes.as_ref(), &kind_arr, &bump_arr];
            let signer = &[seeds];
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to: ctx.accounts.user_token.to_account_info(),
                        authority: ctx.accounts.market.to_account_info(),
                    },
                    signer,
                ),
                payout,
            )?;
        }
        Ok(())
    }

    /// Free, no-stake pick for the MatchDay fan game — one pick per (user, match).
    pub fn place_pick(ctx: Context<PlacePick>, match_id: u32, outcome: u8) -> Result<()> {
        require!(outcome >= 1 && outcome <= 3, PpError::BadOutcome);
        let p = &mut ctx.accounts.pick;
        p.user = ctx.accounts.user.key();
        p.match_id = match_id;
        p.outcome = outcome;
        p.created_at = Clock::get()?.unix_timestamp;
        p.bump = ctx.bumps.pick;
        Ok(())
    }
}

// --- Constants ---------------------------------------------------------------

pub const STATUS_SCHEDULED: u8 = 0;
pub const STATUS_LIVE: u8 = 1;
pub const STATUS_FINAL: u8 = 2;

pub const OUTCOME_UNSET: u8 = 0;
pub const OUTCOME_HOME: u8 = 1;
pub const OUTCOME_DRAW: u8 = 2;
pub const OUTCOME_AWAY: u8 = 3;

/// Map the 1/X/2 outcome code to a pool index (home=0, draw=1, away=2).
fn outcome_to_index(outcome: u8) -> u8 {
    match outcome {
        OUTCOME_HOME => 0,
        OUTCOME_DRAW => 1,
        _ => 2,
    }
}

// --- Accounts ----------------------------------------------------------------

#[account]
#[derive(InitSpace)]
pub struct Oracle {
    pub admin: Pubkey,
    pub authority: Pubkey,
    pub match_count: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct MatchData {
    pub match_id: u32,
    pub home: [u8; 3],
    pub away: [u8; 3],
    pub kickoff: i64,
    pub status: u8,
    pub home_score: u8,
    pub away_score: u8,
    pub outcome: u8,
    pub data_hash: [u8; 32],
    pub updated_at: i64,
    pub settled: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub match_id: u32,
    pub kind: u8,
    pub mint: Pubkey,
    pub pools: [u64; 3],
    pub total: u64,
    pub resolved: bool,
    pub winning_index: u8,
    pub bump: u8,
    pub vault_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Position {
    pub market: Pubkey,
    pub user: Pubkey,
    pub outcome_index: u8,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Pick {
    pub user: Pubkey,
    pub match_id: u32,
    pub outcome: u8,
    pub created_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MatchArgs {
    pub match_id: u32,
    pub home: [u8; 3],
    pub away: [u8; 3],
    pub kickoff: i64,
    pub status: u8,
    pub home_score: u8,
    pub away_score: u8,
    pub outcome: u8,
    pub data_hash: [u8; 32],
}

// --- Contexts ----------------------------------------------------------------

#[derive(Accounts)]
pub struct InitOracle<'info> {
    #[account(init, payer = admin, space = 8 + Oracle::INIT_SPACE, seeds = [b"oracle"], bump)]
    pub oracle: Account<'info, Oracle>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: MatchArgs)]
pub struct UpsertMatch<'info> {
    #[account(mut, seeds = [b"oracle"], bump = oracle.bump)]
    pub oracle: Account<'info, Oracle>,
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + MatchData::INIT_SPACE,
        seeds = [b"match", args.match_id.to_le_bytes().as_ref()],
        bump
    )]
    pub match_data: Account<'info, MatchData>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(match_id: u32, kind: u8)]
pub struct CreateMarket<'info> {
    #[account(seeds = [b"match", match_id.to_le_bytes().as_ref()], bump = match_data.bump)]
    pub match_data: Account<'info, MatchData>,
    #[account(
        init,
        payer = creator,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", match_id.to_le_bytes().as_ref(), &[kind]],
        bump
    )]
    pub market: Account<'info, Market>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = creator,
        seeds = [b"vault", market.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = market
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(outcome_index: u8, amount: u64)]
pub struct PlacePosition<'info> {
    #[account(
        mut,
        seeds = [b"market", market.match_id.to_le_bytes().as_ref(), &[market.kind]],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,
    #[account(
        seeds = [b"match", market.match_id.to_le_bytes().as_ref()],
        bump = match_data.bump
    )]
    pub match_data: Account<'info, MatchData>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Position::INIT_SPACE,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,
    #[account(mut, seeds = [b"vault", market.key().as_ref()], bump = market.vault_bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = user_token.mint == market.mint @ PpError::WrongMint)]
    pub user_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        seeds = [b"market", market.match_id.to_le_bytes().as_ref(), &[market.kind]],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,
    #[account(
        seeds = [b"match", market.match_id.to_le_bytes().as_ref()],
        bump = match_data.bump
    )]
    pub match_data: Account<'info, MatchData>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(
        seeds = [b"market", market.match_id.to_le_bytes().as_ref(), &[market.kind]],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,
    #[account(
        mut,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, Position>,
    #[account(mut, seeds = [b"vault", market.key().as_ref()], bump = market.vault_bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = user_token.mint == market.mint @ PpError::WrongMint)]
    pub user_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct PlacePick<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Pick::INIT_SPACE,
        seeds = [b"pick", user.key().as_ref(), match_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pick: Account<'info, Pick>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// --- Errors ------------------------------------------------------------------

#[error_code]
pub enum PpError {
    #[msg("Signer is not the oracle authority")]
    Unauthorized,
    #[msg("Match id must be non-zero")]
    BadMatchId,
    #[msg("Outcome index out of range")]
    BadOutcome,
    #[msg("Amount must be greater than zero")]
    BadAmount,
    #[msg("Market already resolved")]
    MarketResolved,
    #[msg("Match is closed to new positions")]
    MatchClosed,
    #[msg("Position already has a different outcome")]
    OutcomeMismatch,
    #[msg("Match is not settled yet")]
    NotSettled,
    #[msg("Market is not resolved yet")]
    NotResolved,
    #[msg("Winnings already claimed")]
    AlreadyClaimed,
    #[msg("Market/match mismatch")]
    Mismatch,
    #[msg("Token account mint does not match market")]
    WrongMint,
    #[msg("Arithmetic overflow")]
    Overflow,
}
