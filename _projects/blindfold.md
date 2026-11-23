---
layout: project
title: Blindfold (UBC Hackathon)
description: Private x402 payments for AI agents, using blind-signed ecash backed by a Solana USDC vault
importance: 2
---

## Overview

Blindfold lets AI agents pay for data per API call without publishing what
they're researching. It's a custom x402 v2 payment scheme built on
[Cashu](https://cashu.space) ecash and a USDC vault on Solana. We built it at the
UBC 2026 hackathon.

I came up with the idea and led the engineering.

With the standard x402 `exact` scheme on Solana, every paid call is a public
USDC transfer, and sellers can attach a memo that names the feed, like
`whale-flow/SOL`. Anyone watching the chain can see which wallet is buying which
data. If that wallet also trades, its research can give the trade away.

A direct Blindfold purchase creates no transaction. To test that, we also built
an observer that tries to attribute purchases from public chain data. In our
devnet demo it identified 3 of 3 standard x402 purchases and 0 of 5 Blindfold
purchases.

Blindfold is an unaudited devnet prototype.

## How It Works

**High level.** An owner deposits USDC into a shared vault, and a mint gives
them blind-signed tokens locked to registered data providers. The agent holds
those tokens instead of a wallet key and pays in an HTTP header. The provider
redeems them at the mint before serving the data, and the mint pays providers
from the vault in batches.

**Low level: the payment loop.**

1. **Deposit.** `deposit` transfers USDC to the vault and writes a
   `DepositRecord` PDA containing the quote's 32-byte reference. The mint polls
   these records to credit the quote.
2. **Issue.** The owner sends blinded outputs and the mint signs them without
   seeing the final tokens. The owner unblinds them, verifies the DLEQ proofs,
   and hands the agent a token file.
3. **Check reserves.** Before its first purchase, and every 10 after that by
   default, the agent reads the vault balance and the onchain issuance log. It
   refuses to pay if the vault holds less than the mint's outstanding claim.
4. **Pay.** The provider returns HTTP 402. The wallet checks the offer against
   its limits, selects exact change, and moves those proofs to pending on disk
   before sending them in the `PAYMENT-SIGNATURE` header.
5. **Redeem.** The provider signs the proofs' lock and redeems them. The mint
   records the spent proofs and credits the provider in one PostgreSQL
   transaction, so one double-spent proof rolls back the whole request.
6. **Settle.** `settle_batch` pays 1 to 8 registered providers per batch. Payouts
   run on fixed windows, hold back recent redemptions, and round down to 10¢, so
   their timing and amounts reveal less.

The agent reads untrusted feeds, so its spending limits are enforced in the
wallet, outside the model: a per-call cap, a session budget, and owner approval
above a threshold. Tokens can only be redeemed by registered providers, so a
prompt-injected "pay this URL" can't send funds to an unregistered address.

## Where Privacy Breaks Down

- **It needs a crowd.** Deposits and payouts are public. With a single
  depositor, the observer can link them to the provider that got paid. With `n`
  equal deposits and one payout, its best guess is about `1/n`, and an unusual
  deposit amount can still stand out.
- **The mint is custodial.** The issuance log makes its published claims
  auditable, but a dishonest mint could issue tokens without logging them.
- **Metadata remains.** Providers still see requests and IP addresses, and
  Blindfold has no network anonymity layer.
- **Redemption comes before delivery.** A lost response can spend tokens
  without returning data.

## What We Built

**Vault:** an Anchor program in Rust.

- USDC custody, a provider registry, deposit records, and payouts restricted to
  registered accounts
- Sequential batch IDs, so two transactions can't settle the same batch
- An `IssuanceLog` PDA that tracks cumulative issued and settled totals

**Mint:** TypeScript, Hono, and PostgreSQL.

- Blind signing with DLEQ proofs, following Cashu's BDHKE
- Double-spend prevention and replay-safe issuance
- Settlement that recovers from a crash between signing and confirmation

**Wallet and agents:** a shared wallet SDK with three agents on top.

- Exact-change selection using subset-sum dynamic programming, spending limits,
  and recovery of pending proofs
- A scripted CLI agent, an LLM research loop, and an MCP server for Claude Code
  and Claude Desktop that asks for approval through MCP elicitation

**Providers and observer:**

- A sample data provider that accepts both `exact` and `blindfold` on the same
  route
- A gateway that takes Blindfold tokens and buys from existing `exact` vendors
  through one shared wallet
- The observer, fed by a filtered QuickNode Stream with RPC fallback, plus a
  live demo dashboard and a public vault history page

GitHub Actions builds, typechecks, and tests the TypeScript workspace against
PostgreSQL 16 and 18.

## Stack

- **Onchain:** Solana, Anchor (Rust), SPL Token, USDC
- **Payments:** x402 v2, Cashu (`cashu-ts`)
- **Backend:** Node.js, TypeScript, Hono, PostgreSQL
- **Agents:** Model Context Protocol, Gemini or any OpenAI-compatible model
- **Chain data:** QuickNode Streams

## Team

- **Brock Benton:** idea and engineering lead
- **[gl00mt1t4n](https://github.com/gl00mt1t4n):** engineering

## Links

- [Public replay](https://brockbenton.github.io/blindfold/)
- [Vault history](https://brockbenton.github.io/blindfold/vault/) (live from devnet)

## Repo

[github.com/brockbenton/blindfold](https://github.com/brockbenton/blindfold)
