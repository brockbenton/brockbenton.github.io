---
layout: project
title: Base Bets (MBC Hackathon)
description: A peer-to-peer USDC escrow on Base that settles automatically on Polymarket outcomes, with gasless transactions
importance: 3
---

## Overview

Base Bets is a peer-to-peer USDC escrow on Base that settles based on
Polymarket outcomes. We built it at the 2025 Midwest Blockchain Conference
hackathon. Two people make a conditional bet, like "I'll pay you &#36;50 if
Bitcoin hits &#36;100k by year-end." Both stakes are locked in a contract, and
the winner is paid automatically when the market resolves.

Prediction markets already decide real-world outcomes and have money riding on
getting them right, so Base Bets uses a Polymarket market as the oracle instead
of a single trusted arbiter.

I led smart contract development.

## How It Works

**High level.** A depositor creates an escrow that links to a Polymarket market
and picks which outcome they're betting on. The beneficiary accepts by staking
their side. An offchain resolver watches Polymarket, and when the market
resolves it sends the outcome to the contract. The contract then pays the full
pot to the winner. If the market never resolves, the stakes can be refunded
after a timeout.

**Low level: the escrow lifecycle.**

1. **Create.** `createEscrow` validates the inputs (no zero address, no
   self-escrow, no zero amounts, no empty market ID), pulls `amountA` USDC from
   the depositor with `safeTransferFrom`, and stores an `Escrow` struct with the
   market ID and the depositor's expected outcome.
2. **Accept.** `acceptEscrow` can only be called by the named beneficiary. It
   pulls `amountB` and marks the escrow accepted, so the contract now holds both
   stakes.
3. **Resolve.** `resolveEscrow` can only be called by the resolver. It compares
   the market result with `expectedOutcomeYes`, sends `amountA + amountB` to the
   winner, and updates each user's win/loss stats onchain.
4. **Batch resolve.** `resolveEscrowBatch` settles many escrows in one
   transaction when several markets resolve together, which saves gas.
   Escrows that aren't eligible are skipped instead of reverting.
5. **Refund.** If the market hasn't resolved after `ESCROW_TIMEOUT` (7 days),
   the depositor or the contract owner can call `emergencyRefund`, which returns
   each side's original stake. Nobody wins in this case.

The resolver is the only centralized part. It can trigger settlement, but the
contract only ever pays the depositor or the beneficiary, so the resolver can't
send funds anywhere else. Every resolution is onchain and can be checked
against Polymarket.

## What I Built

I wrote the escrow contract in Solidity:

- A two-sided escrow struct with separate stake amounts, so the odds can be
  uneven (&#36;100 against &#36;20)
- The five-step lifecycle above: create, accept, resolve, batch resolve,
  timeout refund
- `ReentrancyGuard` on every function that moves funds, plus `SafeERC20`
  transfers
- Custom errors (`CannotEscrowToSelf`, `OnlyResolver`, `TimeoutNotReached`,
  etc.) instead of string reverts
- Per-user win/loss stats stored onchain for a live leaderboard
- Deployment to Base Sepolia

## Stack

- **Onchain:** Solidity on Base, OpenZeppelin
- **Wallet and gas:** Coinbase Smart Wallet (ERC-4337) and CDP Paymaster
  through OnchainKit, so users only need USDC and never pay gas
- **Oracle:** an offchain resolver that polls Polymarket's Gamma API

## Team

- **Brock Benton:** smart contracts
- **Tyler Martin:** frontend
- **Sri Vamsi Andavarapu:** backend and resolver

## Repo

[github.com/brockbenton/base-bets](https://github.com/brockbenton/base-bets)
