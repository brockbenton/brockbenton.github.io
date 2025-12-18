---
layout: page
title: Base Bets (MBC Hackathon)
description: A prediction-powered USDC escrow system that automatically releases funds based on real-world outcomes verified through Polymarket, built on Base L2 with gasless transactions.
img: 
importance: 1
category:
related_publications: false
---

*Building trustless conditional payments using prediction markets as decentralized oracles*

---

## Introduction

What if you could make a bet with a friend—"I'll pay you \$ 50 if Bitcoin hits '$'100k by year-end"—and have it settle automatically, with no trust required?

That's what my team built at the Midwest Blockchain Conference hackathon. Base Bets is a prediction-powered escrow system where USDC funds are locked in a smart contract and automatically released based on real-world outcomes verified through Polymarket.

In this write-up, I'll explain the architecture, walk through the smart contract design, and share what I learned about building financial infrastructure on blockchain.

**[View the project on GitHub](https://github.com/brockbenton/base-bets)**

---

## What We Built

A complete escrow platform featuring:
- ✅ Solidity smart contracts deployed on Base L2
- ✅ Automatic settlement via Polymarket prediction markets
- ✅ Gasless transactions through ERC-4337 account abstraction
- ✅ USDC stablecoin integration (real dollar-value escrows)
- ✅ Emergency refund mechanism for unresolved markets

---

## Part 1: The Problem

### Traditional Escrow is Broken

When two parties want to make a conditional agreement—"I'll pay you X if Y happens"—they have three bad options:

1. **Trust each other** → One party can refuse to pay
2. **Use a lawyer** → Expensive, slow, overkill for small amounts
3. **Use an escrow service** → Still requires trusting a third party

The fundamental issue: someone has to decide when the condition is met and authorize the release of funds.

### The Oracle Problem

Smart contracts can hold and transfer funds automatically, but they can't observe the real world. How does the contract know if Bitcoin hit $100k? If the Lakers won? If a bill passed Congress?

This is the "oracle problem:" bringing real-world data on-chain in a trustworthy way.

### Our Solution: Prediction Markets as Oracles

Polymarket is a prediction market where traders buy and sell shares on real-world outcomes. If you think Bitcoin will hit $100k, you buy YES shares. The market price reflects the crowd's probability estimate.

When the event happens, the market resolves: YES shares become worth \$1, NO shares become worth \$0. This resolution is verified by Polymarket's Gamma API.

We use this resolution as our oracle. Instead of trusting a single arbiter, we trust the economic incentives of a prediction market with millions of dollars at stake.

---

## Part 2: Smart Contract Architecture

### The Escrow Data Structure

Each escrow agreement stores everything needed for automatic settlement:

```solidity
struct Escrow {
    address depositor;          // Who created the escrow
    address beneficiary;        // Who receives USDC if depositor is wrong
    uint256 amountA;            // Amount staked by depositor (6 decimals)
    uint256 amountB;            // Amount staked by beneficiary (6 decimals)
    string marketId;            // Polymarket condition ID
    bool expectedOutcomeYes;    // If true, depositor wins when YES wins
    Status status;              // Active, Resolved, or Refunded
    uint256 createdAt;          // Block timestamp when created
    bool beneficiaryAccepted;   // Whether beneficiary has locked their funds
}
```

This is a **two-sided escrow** where both parties stake funds, and the winner takes all. The `marketId` links to a specific Polymarket question, and `expectedOutcomeYes` specifies which outcome the depositor is betting on.

### Creating an Escrow

When a depositor creates an escrow, they stake their USDC and specify how much the beneficiary must stake to accept:

```solidity
function createEscrow(
    address beneficiary,
    uint256 amountA,
    uint256 amountB,
    string calldata marketId,
    bool expectedOutcomeYes
) external nonReentrant returns (uint256 escrowId) {
    // Validation
    if (beneficiary == address(0)) revert InvalidAddress();
    if (beneficiary == msg.sender) revert CannotEscrowToSelf();
    if (amountA == 0 || amountB == 0) revert InvalidAmount();
    if (bytes(marketId).length == 0) revert InvalidMarketId();

    // Transfer USDC from depositor to this contract
    usdc.safeTransferFrom(msg.sender, address(this), amountA);

    // Create escrow
    escrowId = escrowCount++;

    escrows[escrowId] = Escrow({
        depositor: msg.sender,
        beneficiary: beneficiary,
        amountA: amountA,
        amountB: amountB,
        marketId: marketId,
        expectedOutcomeYes: expectedOutcomeYes,
        status: Status.Active,
        createdAt: block.timestamp,
        beneficiaryAccepted: false
    });

    // Update stats
    userStats[msg.sender].escrowsCreated++;

    emit EscrowCreated(escrowId, msg.sender, beneficiary, amountA, marketId, expectedOutcomeYes);
}
```

At this point, the escrow is **pending** and the beneficiary must accept before it's active.

### Accepting an Escrow

The beneficiary reviews the terms and stakes their side:

```solidity
function acceptEscrow(uint256 escrowId) external nonReentrant {
    Escrow storage escrow = escrows[escrowId];

    if (escrow.amountA == 0) revert EscrowDoesNotExist();
    if (escrow.status != Status.Active) revert EscrowNotActive();
    if (msg.sender != escrow.beneficiary) revert NotAuthorized();
    if (escrow.beneficiaryAccepted) revert("Escrow already accepted");

    // Transfer USDC from beneficiary to this contract
    usdc.safeTransferFrom(msg.sender, address(this), escrow.amountB);

    // Mark as accepted
    escrow.beneficiaryAccepted = true;
}
```

Now both parties have skin in the game. The contract holds `amountA + amountB`, and the winner takes all.

Key security patterns:
- **`nonReentrant`**: Prevents reentrancy attacks during token transfers
- **`safeTransferFrom`**: OpenZeppelin's safe ERC-20 transfer that reverts on failure
- **Custom errors**: Gas-efficient reverts with descriptive messages

### Resolution: Winner Takes All

When the Polymarket market resolves, our off-chain resolver service detects it and calls the contract:

```solidity
function resolveEscrow(
    uint256 escrowId,
    bool marketResolvedYes
) external nonReentrant {
    if (msg.sender != resolver) revert OnlyResolver();

    Escrow storage escrow = escrows[escrowId];

    if (escrow.amountA == 0) revert EscrowDoesNotExist();
    if (escrow.status != Status.Active) revert EscrowNotActive();
    if (!escrow.beneficiaryAccepted) revert("Escrow not yet accepted");

    // Update status
    escrow.status = Status.Resolved;

    // Total payout to winner
    uint256 totalAmount = escrow.amountA + escrow.amountB;

    // Determine recipient and update stats
    address recipient;
    if (marketResolvedYes == escrow.expectedOutcomeYes) {
        // Depositor wins (they predicted correctly)
        recipient = escrow.depositor;
        userStats[escrow.depositor].totalWon += totalAmount;
        userStats[escrow.depositor].escrowsWon++;
        userStats[escrow.beneficiary].totalLost += totalAmount;
        userStats[escrow.beneficiary].escrowsLost++;
    } else {
        // Beneficiary wins (depositor's prediction was wrong)
        recipient = escrow.beneficiary;
        userStats[escrow.beneficiary].totalWon += totalAmount;
        userStats[escrow.beneficiary].escrowsWon++;
        userStats[escrow.depositor].totalLost += totalAmount;
        userStats[escrow.depositor].escrowsLost++;
    }

    // Transfer all funds to winner
    usdc.safeTransfer(recipient, totalAmount);

    emit EscrowResolved(escrowId, recipient, totalAmount, marketResolvedYes);
}
```

The logic:
- Depositor bets that `expectedOutcomeYes` will match the market result
- If the market resolves the way depositor predicted → depositor wins both stakes
- If the market resolves the opposite way → beneficiary wins both stakes

We also track statistics (`totalWon`, `escrowsWon`, etc.) for leaderboards and user profiles.

### Batch Resolution

For gas efficiency when multiple markets resolve simultaneously:

```solidity
function resolveEscrowBatch(
    uint256[] calldata escrowIds,
    bool[] calldata outcomes
) external nonReentrant {
    if (msg.sender != resolver) revert OnlyResolver();
    require(escrowIds.length == outcomes.length, "Array length mismatch");

    for (uint256 i = 0; i < escrowIds.length; i++) {
        // Skip invalid/inactive escrows instead of reverting
        Escrow storage escrow = escrows[escrowIds[i]];
        if (escrow.amountA == 0 || escrow.status != Status.Active || !escrow.beneficiaryAccepted) {
            continue;
        }
        // ... resolution logic for each escrow
    }
}
```

This saves gas by amortizing the base transaction cost across multiple resolutions.

### Emergency Refund: The Safety Valve

What if a Polymarket market never resolves? We can't let funds be locked forever:

```solidity
function emergencyRefund(uint256 escrowId) external nonReentrant {
    Escrow storage escrow = escrows[escrowId];

    if (escrow.amountA == 0) revert EscrowDoesNotExist();
    if (escrow.status != Status.Active) revert EscrowNotActive();
    if (block.timestamp < escrow.createdAt + ESCROW_TIMEOUT) revert TimeoutNotReached();
    if (msg.sender != escrow.depositor && msg.sender != owner()) revert NotAuthorized();

    escrow.status = Status.Refunded;

    // Refund depositor's amount
    usdc.safeTransfer(escrow.depositor, escrow.amountA);

    // If beneficiary accepted and deposited, refund their amount too
    if (escrow.beneficiaryAccepted) {
        usdc.safeTransfer(escrow.beneficiary, escrow.amountB);
    }

    emit EscrowRefunded(escrowId, escrow.depositor, escrow.amountA, "timeout");
}
```

After 7 days (`ESCROW_TIMEOUT`), either party can reclaim their funds if the market hasn't resolved. Both sides get their original stakes back — it's a no-contest refund, not a winner declaration.

---

## Part 3: The Resolver Service

The smart contract can't query Polymarket directly, it needs an off-chain service to bridge the data.

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Polymarket    │     │    Resolver     │     │  Smart Contract │
│   Gamma API     │────▶│    Service      │────▶│  (Base L2)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
   Market data            Polls every             Calls resolve()
   & resolution           few minutes             when market ends
```

### How It Works

1. **Polling**: The resolver queries Polymarket's Gamma API for market status
2. **Detection**: When a market changes to "resolved", extract the outcome
3. **Matching**: Find all escrows linked to that marketId
4. **Settlement**: Call `resolveEscrow()` for each affected escrow

```javascript
async function checkAndResolve() {
    // Get all pending escrows from contract events
    const pendingEscrows = await getPendingEscrows();
    
    for (const escrow of pendingEscrows) {
        // Check if market resolved
        const market = await polymarket.getMarket(escrow.marketId);
        
        if (market.resolved) {
            // Call contract to settle
            await contract.resolveEscrow(
                escrow.id,
                market.outcome === "YES"
            );
        }
    }
}
```

### Trust Assumptions

The resolver is a centralized component so it can call `resolveEscrow()` with any outcome. We mitigate this through:

1. **Separation of concerns**: Resolver can only trigger resolution, not steal funds
2. **Verifiability**: All resolutions are on-chain and can be audited against Polymarket
3. **Emergency refund**: Users can recover funds if resolver misbehaves

For production, you'd decentralize this using Chainlink Functions or directly integrating with another oracle.

---

## Part 4: Gasless Transactions

### The UX Problem

Traditional blockchain apps require users to:
1. Buy ETH somewhere
2. Transfer ETH to their wallet
3. Pay gas fees for every transaction

This is terrible UX. A user wanting to escrow $20 shouldn't need to understand gas.

### ERC-4337: Account Abstraction

ERC-4337 introduces "smart accounts"—wallet contracts with programmable logic. Instead of externally-owned accounts (EOAs) that require ETH for every transaction, smart accounts can have gas paid by someone else.

### Our Implementation: Coinbase Smart Wallet + CDP Paymaster

We integrated Coinbase Smart Wallet, which provides ERC-4337 smart accounts with:
- **Passkey authentication**: Sign transactions with Face ID, no seed phrases
- **Gas sponsorship**: CDP Paymaster pays transaction fees
- **Batching**: Multiple operations in one transaction

```
Traditional Flow:
User EOA → Signs tx → Pays gas in ETH → Contract

Our Flow:
User → Smart Wallet → UserOperation → CDP Paymaster sponsors gas → Contract
```

### The Result

Users can:
1. Sign up with just an email
2. Deposit USDC (no ETH needed)
3. Create escrows (gas sponsored)
4. Receive winnings (gas sponsored)

Zero crypto knowledge required. It feels like a normal web app.

---

## Part 5: Why Base L2?

### Layer 2 Economics

Ethereum mainnet transactions cost \$5-50+ depending on congestion. For a \$20 escrow, that's unacceptable.

Base is an L2 (Layer 2) built on the OP Stack. It batches transactions and posts compressed data to Ethereum, inheriting mainnet security at a fraction of the cost.

| Metric | Ethereum L1 | Base L2 |
|--------|-------------|---------|
| Transaction cost | $5-50 | $0.01-0.10 |
| Block time | 12 seconds | 2 seconds |
| Security | Native | Inherited via rollup |

### Why This Matters

At \$0.05 per transaction, users can create \$10 escrows economically. At \$20 per transaction, nothing under \$500 makes sense.

The 100-1000x cost reduction unlocks an entire category of micro-agreements that were previously impractical.

---

## Part 6: Security Considerations

### What We Protected Against

**Reentrancy**: Using OpenZeppelin's `ReentrancyGuard` on all fund-moving functions.

```solidity
function createEscrow(...) external nonReentrant {
    // Safe from reentrancy
}
```

**Integer overflow**: Solidity 0.8+ has built-in overflow checks.

**Front-running**: Not a major concern—escrow creation order doesn't affect outcomes.

**Flash loan attacks**: Not applicable—no price oracles or liquidity pools to manipulate.

### What We'd Add for Production

1. **Multi-sig resolver**: Require multiple parties to agree on resolution
2. **Dispute period**: Allow challenges before finalization  
3. **Rate limiting**: Prevent spam escrow creation
4. **Formal verification**: Mathematically prove contract correctness

---

## Part 7: Use Cases

#### Peer-to-Peer Bets
"I bet you $50 the Lakers win the Finals."

Alice creates escrow staking $50, Bob accepts by staking $50. Market resolves. Winner takes $100.

#### Asymmetric Odds
"I'll bet \$100 against your \$20 that Bitcoin hits \$150k."

The depositor can set different stake amounts. If you're confident, put more skin in the game.

#### Conditional Business Agreements
"Bonus paid if we hit Q4 revenue targets."

Link payment to verifiable financial metrics tracked by prediction markets.

---

## Conclusion

Building Base Bets taught me how financial infrastructure actually works on blockchain.

**Key takeaways:**
- Prediction markets can serve as decentralized oracles for real-world events
- Account abstraction (ERC-4337) enables real consumer UX
- L2s make micro-transactions economically viable

The full source code is available on GitHub.

**[→ View on GitHub](https://github.com/brockbenton/base-bets)**

---

## Team

Built at the Midwest Blockchain Conference Hackathon with:
- **Brock Benton** — Smart Contract Development
- **Tyler Martin** — Frontend Development  
- **Sri Vamsi Andavarapu** — Backend/Resolver Integration
