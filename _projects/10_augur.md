---
layout: page
title: Augur
description: A Solana lending protocol that lets you borrow USDC against prediction-market positions
importance: 1
category: work
---

## Overview

Augur is a DeFi lending protocol built at University of Pennsylvania's 2026 Blockchain Conference. The product
treats tokenized prediction-market positions (YES/NO outcome tokens from venues
like Polymarket) as productive collateral: instead of locking capital in a bet
until resolution, holders can deposit their positions into a Solana vault and
borrow USDC against them.

The thesis is narrow on purpose. Augur is not a prediction market; it is a capital-efficiency layer sitting
*on top of* existing prediction-market assets. The core claim is that an
outcome token with a 70% implied probability and a near-term resolution date is
economically useful collateral, and Solana is a good place to make it
borrowable.

I originated the idea and led the protocol design before the hackathon.

## How It Works

**High level.** A user deposits prediction-market positions into a
per-user vault on Solana. An off-chain risk engine reads the position's implied
probability, time to resolution, and market liquidity, and computes a borrow
cap and maximum loan-to-value ratio. The user can then borrow USDC up to that
cap, repay at any time, and withdraw their collateral. If the position's
risk profile degrades past the LTV threshold, the position is liquidated.

**Low level — the borrow loop.**

1. **Deposit.** `deposit_collateral` CPIs an SPL token transfer from the
   user's token account into a PDA-owned vault token account, keyed on
   `["vault", owner]`. The vault's `collateral_amount` is incremented.
2. **Risk computation (off-chain).** A backend service ingests market data,
   computes `approved_borrow_cap_usdc` and `max_ltv_bps`, and signs the
   parameters.
3. **Borrow.** `borrow` opens a `LoanPosition` PDA keyed on `["loan", owner]`.
   The program enforces `requested_usdc ≤ approved_borrow_cap_usdc`, caps
   `max_ltv_bps` at 5000 (50%), and records the loan state on-chain.
4. **Repay.** `repay` requires full repayment of `borrowed_usdc` and flips
   the loan status to `Repaid`.
5. **Withdraw.** `withdraw_collateral` only succeeds after repayment; the
   vault PDA signs a token transfer back to the owner using its derived
   seeds.
6. **Liquidation.** `force_liquidate` is admin-gated and flips loan status
   to `Liquidated` when LTV is breached.

The contract deliberately keeps risk math *off-chain*. The on-chain program
trusts a signed borrow cap rather than recomputing LTV from oracle feeds — this
keeps the Anchor program small and auditable, and pushes the hard part
(probability modeling, liquidity adjustment, time-decay) to a service that can
be iterated without a redeploy.

## What I Built

I wrote the Anchor program — `programs/predifi-vault/src/lib.rs` — which is
the on-chain core of the protocol. About 330 lines of Rust covering:

- `VaultAccount` and `LoanPosition` PDAs with deterministic seed derivation
- Five instructions: `deposit_collateral`, `borrow`, `repay`,
  `withdraw_collateral`, `force_liquidate`
- SPL token CPIs with PDA-signed transfers on withdrawal
- Ten explicit error variants (`ExceedsApprovedBorrowCap`, `LtvTooHigh`,
  `LoanStillActive`, etc.) rather than generic panics
- Event emissions (`CollateralDeposited`, `LoanOpened`, `LoanRepaid`,
  `PositionLiquidated`) so the frontend and indexer can react to state
  changes without polling

The program compiles cleanly and the PDA + instruction logic holds up in
local tests. The final demo path ended up routing through a mocked backend
rather than hitting the deployed program directly due to hackathon time constraints.

## Stack

- **On-chain:** Solana + Anchor (Rust)
- **Off-chain risk engine:** Node.js / TypeScript
- **Frontend:** React + Vite + Tailwind
- **Agent:** OpenClaw + Swig smart accounts (for human-guardrailed autonomy)

## Repo

[github.com/grigoryshatalin/PennSubmission2026](https://github.com/grigoryshatalin/PennSubmission2026)
