---
layout: project
title: OAP
description: An onchain attendance protocol on Base with QR check-in and gasless, soulbound ERC-1155 tokens
importance: 1
---

## Overview

OAP (Onchain Attendance Protocol) replaces sign-in sheets at CU Blockchain
meetings. Members scan a QR code at the meeting and receive a non-transferable
ERC-1155 token for that session. Minting is gasless, so members don't need ETH
or any crypto experience to check in.

Attendance stats, semester rollups, member tiers, and the admin dashboard are
all computed from these tokens. Since the tokens can't be transferred, a member
can't give their attendance to someone else.

OAP is a work in progress and is currently deployed to Base Sepolia.

## How It Works

**High level.** An admin creates a session, which is written onchain. At the
meeting, the admin displays a QR code that the backend has signed and that
expires after a few minutes. A member signs in with email, Google, or a
passkey, scans the code, and signs a check-in message. The backend verifies
both signatures and queues a mint. A relay wallet pays the gas and mints the
token to the member.

**Low level: the check-in loop.**

1. **Create session.** `createSession` on the `AttendanceRegistry` contract is
   restricted to `ADMIN_ROLE` and stores the session's date, name, and
   semester. The backend only accepts check-ins once that transaction confirms.
2. **Sign the QR.** The backend builds a payload of `sessionId`, `issuedAt`,
   `expiresAt` (10 minutes by default), and a random nonce, then signs it with
   the admin key. The QR code holds the payload and its signature.
3. **Check in.** The member's client signs
   `I am checking into session {id} as {address} at {timestamp}`. The server
   rejects signatures older than 60 seconds, verifies the QR's admin signature
   and expiry, and recovers the signer's address to confirm it matches the
   member's logged-in wallet. A forwarded screenshot of an expired QR or a
   reused signature gets rejected.
4. **Record.** A unique `(member, session)` constraint in PostgreSQL rejects
   duplicate check-ins before anything is sent onchain.
5. **Mint.** A BullMQ job calls `mint` from the relay wallet, which holds
   `RELAY_ROLE`. Jobs retry three times with exponential backoff, and the
   worker processes one job at a time to avoid nonce collisions.
6. **Reconcile.** Before minting, and again after a final failure, the job
   checks the member's onchain balance. If an earlier attempt already minted
   the token, the check-in is marked confirmed instead of minting again or
   being marked failed.

The contract only enforces the rules that have to hold regardless of the
backend: only the relay can mint, only into an active session, at most one
token per member per session, and no transfers. QR signing, identity checks,
and stats are handled offchain, so they can change without redeploying the
contract.

## What I Built

**Contract:** `AttendanceRegistry.sol`, written in Solidity and tested with
Foundry.

- ERC-1155 with OpenZeppelin `AccessControl` (`ADMIN_ROLE`, `RELAY_ROLE`) and
  `ReentrancyGuard`
- Soulbound tokens: `_update` reverts on anything other than a mint, and
  `setApprovalForAll` always reverts
- Session lifecycle (`createSession`, `closeSession`) with explicit errors
  (`SessionDoesNotExist`, `SessionNotActive`, `AlreadyCheckedIn`, `Soulbound`)
- Token metadata served from IPFS through `uri()`
- 45 Foundry tests

**Backend:** Node, Express, and TypeScript.

- QR signing and verification, member signature checks, and rate-limited
  check-in endpoints
- The BullMQ mint relay, with jobs that are safe to retry and that check
  onchain state before minting
- PostgreSQL and Prisma schema for sessions, members, and check-ins
- Stats: all-time and per-semester attendance, streaks, and tiers (75% or
  higher attendance makes you an Official Member)

**Frontend:** Next.js with Privy login, a camera QR scanner, member stats and a
token vault, a leaderboard, and an admin dashboard for running sessions.

GitHub Actions runs the contract tests, backend build and tests, and frontend
build on every PR.

## Stack

- **Onchain:** Solidity and Foundry on Base, OpenZeppelin
- **Backend:** Node.js, Express, TypeScript, PostgreSQL and Prisma, Redis and BullMQ, viem
- **Frontend:** Next.js 14, Privy, wagmi and viem, Tailwind
- **Storage:** IPFS for token metadata

## Repo

[github.com/brockbenton/oap](https://github.com/brockbenton/oap)
