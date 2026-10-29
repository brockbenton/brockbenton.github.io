---
layout: project
title: Distributed Blockchain Network
description: A proof-of-work blockchain built from scratch in C++ with SHA-256 mining, transaction validation, and peer-to-peer consensus
importance: 4
---

## Overview

A proof-of-work blockchain built from scratch in C++17, with SHA-256 mining,
transaction validation, and a TCP peer-to-peer network. Nodes connect to each
other, exchange chains, and agree on a single history without a central server.

I built it to understand how a blockchain works at every layer, from hashing
blocks to sending them over sockets.

## How It Works

**High level.** Each node keeps its own copy of the chain. To mine a block, a
node searches for a nonce that makes the block's hash start with a set number
of zeros. Finding one takes a lot of hashing, but checking one is fast. Nodes
broadcast new blocks to their peers, and when two chains disagree, the longest
valid chain wins.

**Low level: a node's lifecycle.**

1. **Mine.** `mineBlock` increments a nonce until the SHA-256 hash meets the
   difficulty target (about 65,000 hashes on average at difficulty 4). Each
   block includes a coinbase transaction from `SYSTEM` that rewards the miner.
2. **Broadcast.** `mineAndBroadcast` locks the chain, appends the block,
   unlocks, and then sends a `NEW_BLOCK` message. The lock is released before
   the network call so other threads aren't blocked on I/O.
3. **Listen.** A background thread accepts incoming TCP connections and starts
   a separate handler thread for each peer.
4. **Sync.** Peers exchange `GET_LENGTH` and `LENGTH` messages. If a peer has a
   longer chain, the node requests it with `GET_CHAIN`.
5. **Validate and adopt.** The node checks every hash and every link in the
   incoming chain. If the chain is valid and longer, the node replaces its own
   (Nakamoto consensus through longest-chain fork resolution).
6. **Persist.** Chains are saved as JSON and fully re-validated when loaded, so
   a tampered file is detected.

Balances aren't stored. `getBalance` calculates them by replaying every
transaction in the chain, which is slower but means balances can never drift
from the chain.

## What I Built

I wrote every part of the project:

- `Block`, `Transaction`, and `Blockchain` classes with SHA-256 hashing and
  adjustable difficulty
- Merkle roots for tamper detection
- A TCP networking layer using raw sockets (`socket`, `bind`, `listen`,
  `accept`, `connect`)
- One thread per peer, with a mutex protecting the shared chain
- A JSON message protocol (`GET_CHAIN`, `CHAIN`, `NEW_BLOCK`, `GET_LENGTH`,
  `LENGTH`) with a hand-written parser that counts braces to handle nested
  objects
- Fork resolution, full-chain validation, and JSON persistence

## Stack

- **Language:** C++17
- **Networking:** POSIX TCP sockets
- **Concurrency:** `std::thread`, `std::mutex`

## Repo

[github.com/brockbenton/cpp-blockchain](https://github.com/brockbenton/cpp-blockchain)
