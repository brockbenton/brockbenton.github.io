---
layout: page
title: Distributed Blockchain Network (C++)
description: A proof-of-work blockchain in C++ featuring SHA-256 mining, transaction validation, and peer-to-peer networking with automatic distributed consensus.
img: 
importance: 1
category:
related_publications: false
---

*A deep dive into implementing a proof-of-work blockchain with peer-to-peer networking*

---

## Introduction

Ever wondered how blockchains actually work under the hood? I spent the past week building a fully functional distributed blockchain from scratch in C++.

In this write-up, I'll walk through the implementation, explain the key concepts, and share what I learned about distributed systems, cryptography, and network programming.

**[View the full project on GitHub](https://github.com/brockbenton/cpp-blockchain)**

---

## What I Built

A complete blockchain system featuring:
- ✅ Proof-of-work mining with SHA-256
- ✅ Transaction validation and balance tracking
- ✅ TCP-based peer-to-peer networking
- ✅ Multi-threaded architecture
- ✅ Automatic chain synchronization
- ✅ JSON persistence

---

## Part 1: Understanding Blockchains

### What is a Blockchain?

At its core, a blockchain is deceptively simple: a linked list where each node contains a cryptographic hash of the previous node.
```
Block 0 (Genesis)          Block 1                Block 2
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Index: 0        │    │ Index: 1        │    │ Index: 2        │
│ PrevHash: "0"   │◄───│ PrevHash: 00a3..│◄───│ PrevHash: 00f7..│
│ Hash: 00a3f5... │    │ Hash: 00f7d2... │    │ Hash: 0012ab... │
│ Data: [txs]     │    │ Data: [txs]     │    │ Data: [txs]     │
│ Nonce: 47283    │    │ Nonce: 19384    │    │ Nonce: 82947    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

Change anything in Block 1? Its hash changes. But Block 2 stores Block 1's old hash, so the link breaks. The chain is tamper-evident.

### Why is This Secure?

**Cryptographic hashing** makes it computationally infeasible to:
1. Find two inputs that produce the same hash (collision resistance)
2. Reverse a hash to get the original input (preimage resistance)
3. Modify data without detection (tamper evidence)

---

## Part 2: Core Implementation

### SHA-256: The Foundation

Every block's identity is its SHA-256 hash—a 256-bit fingerprint calculated from all its data:
```cpp
std::string Block::calculateHash() const {
    // Combine all block data
    std::string data = 
        std::to_string(index) + 
        std::to_string(timestamp) + 
        std::to_string(nonce) +
        transactionsAsString() + 
        previousHash;
    
    // SHA-256 hash
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256_CTX sha256;
    SHA256_Init(&sha256);
    SHA256_Update(&sha256, toHash.c_str(), toHash.size());
    SHA256_Final(hash, &sha256);
    
    // Convert to hex string
    std::stringstream ss;
    for(int i = 0; i < SHA256_DIGEST_LENGTH; i++) {
        ss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
    }
    return ss.str();
}
```

Change even one character in the input, and you get a completely different hash. This is what makes tampering detectable.

### Proof-of-Work: Making Mining Expensive

Here's the problem: if anyone can create blocks instantly, the chain is worthless. Solution? Make block creation computationally expensive.

**The Challenge:** Find a hash that starts with a certain number of zeros.
```cpp
void Block::mineBlock(int difficulty) {
    std::string target(difficulty, '0'); // e.g., "0000"
    
    while (hash.substr(0, difficulty) != target) {
        nonce++;  // Try different nonces
        hash = calculateHash();
    }
    
    std::cout << "Block mined! Hash: " << hash << std::endl;
}
```

**Why this works:**
- SHA-256 output is uniformly random
- ~1 in 16 hashes starts with "0"
- ~1 in 256 starts with "00"
- ~1 in 4,096 starts with "000"
- ~1 in 65,536 starts with "0000"

**Difficulty 4** means trying ~65,000 hashes on average. Bitcoin uses difficulty 20+, requiring trillions of attempts!

Rewriting history requires re-mining every block, which is computationally prohibitive.

---

## Part 3: Transactions & Economics

### Transaction Model

Each block contains multiple transactions:
```cpp
class Transaction {
    std::string sender;
    std::string receiver;
    double amount;
    time_t timestamp;
};
```

### Balance Tracking

Balances aren't stored directly—they're calculated by scanning the entire chain:
```cpp
double Blockchain::getBalance(std::string address) {
    double balance = 0;
    for (const Block& block : chain) {
        for (const Transaction& tx : block.transactions) {
            if (tx.sender == address) balance -= tx.amount;
            if (tx.receiver == address) balance += tx.amount;
        }
    }
    return balance;
}
```

### Mining Rewards

Where does money come from? Miners create it!

Every block includes a special "coinbase" transaction:
```
From: SYSTEM
To: MINER
Amount: 50
```

This is how Bitcoin's 21 million coins are gradually minted—through mining rewards that halve every 210,000 blocks.

---

## Part 4: Distributed Networking

This is where it gets really interesting.

### TCP Sockets: The Foundation

**Server (listening for connections):**
```cpp
// Create socket
int serverSocket = socket(AF_INET, SOCK_STREAM, 0);

// Bind to port
sockaddr_in addr;
addr.sin_family = AF_INET;
addr.sin_port = htons(8080);
bind(serverSocket, (sockaddr*)&addr, sizeof(addr));

// Listen for connections
listen(serverSocket, 5);

// Accept incoming connections
int clientSocket = accept(serverSocket, nullptr, nullptr);
```

**Client (connecting to a peer):**
```cpp
int peerSocket = socket(AF_INET, SOCK_STREAM, 0);

sockaddr_in peerAddr;
peerAddr.sin_family = AF_INET;
peerAddr.sin_port = htons(8080);
inet_pton(AF_INET, "127.0.0.1", &peerAddr.sin_addr);

connect(peerSocket, (sockaddr*)&peerAddr, sizeof(peerAddr));
```

Sockets are like phone calls—one side listens, the other dials, and once connected, they can exchange messages.

### Multi-Threading: Handling Multiple Peers

Each node needs to:
1. **Listen** for incoming connections (blocking)
2. **Handle** multiple connected peers simultaneously
3. **Send/receive** messages without freezing

**Solution:** Spawn a thread for each task:
```cpp
// Background listener thread
std::thread listenerThread([this]() {
    while (running) {
        int peerSocket = accept(serverSocket, nullptr, nullptr);
        
        // Spawn handler for this peer
        std::thread(&Node::handlePeer, this, peerSocket).detach();
    }
});
```

Multiple threads accessing the blockchain simultaneously!
```cpp
void Node::mineAndBroadcast(std::vector<Transaction> txs) {
    chainMutex.lock();  // Lock before modifying
    blockchain.addBlock(txs);
    Block& newBlock = blockchain.getChain().back();
    chainMutex.unlock();  // Unlock
    
    // Broadcast to all peers (no lock needed)
    std::string msg = createBlockMessage(newBlock);
    broadcastMessage(msg);
}
```

Hold locks for minimum time. Broadcasting is slow (network I/O), so unlock before broadcasting!

### Message Protocol

Nodes communicate using JSON messages:
```json
// Request chain
{"type":"GET_CHAIN"}

// Send chain
{"type":"CHAIN","data":[{block1}, {block2}, ...]}

// Broadcast new block
{"type":"NEW_BLOCK","data":{block}}

// Query chain length
{"type":"GET_LENGTH"}
{"type":"LENGTH","value":5}
```

Why JSON? Human-readable, easy to debug, widely supported. Production systems use binary protocols (Protobuf, etc.) for efficiency.

### Chain Synchronization

When nodes connect, they need to agree on the blockchain:
```
Node A (3 blocks)  ←→  Node B (5 blocks)

1. A asks B: "How long is your chain?"
   B responds: "5 blocks"

2. A realizes B has a longer chain
   A requests: "Send me your full chain"

3. B sends all 5 blocks

4. A validates the chain:
   - All hashes correct?
   - All links valid?
   - Longer than my chain?

5. If valid, A adopts B's chain
```

The longest valid chain wins. This is how distributed consensus works!

---

## Part 5: Technical Challenges & Solutions

### Challenge 1: Blockchain Forks

**Problem:** Two miners find blocks simultaneously
```
       ┌─ Block 2A (Node 1)
Genesis ─ Block 1 ─┤
       └─ Block 2B (Node 2)
```

**Solution:** Longest chain rule. When Node 1 mines Block 3A, Node 2 abandons 2B and adopts the 2A→3A chain.

### Challenge 2: Race Conditions

**Problem:** Thread A reading chain while Thread B modifies it

**Solution:** Mutexes
```cpp
std::mutex chainMutex;

// Writer
chainMutex.lock();
blockchain.addBlock(newBlock);
chainMutex.unlock();

// Reader
chainMutex.lock();
int length = blockchain.getChainLength();
chainMutex.unlock();
```

### Challenge 3: JSON Parsing

**Problem:** Parsing nested JSON by hand in C++
```json
{"type":"CHAIN","data":[{"tx":[{...},{...}]},{"tx":[{...}]}]}
```

**Solution:** Brace counting algorithm
```cpp
int braceCount = 0;
for (size_t i = 0; i < json.length(); i++) {
    if (json[i] == '{') braceCount++;
    if (json[i] == '}') {
        braceCount--;
        if (braceCount == 0) {
            // Found complete JSON object
            extractBlock(startPos, i);
        }
    }
}
```

---

## Conclusion

Building a blockchain from scratch demystified how cryptocurrencies actually work. It's not magic—it's clever application of cryptography, distributed systems, and economic incentives.

**Key takeaways:**
- Blockchains are just tamper-evident linked lists
- Proof-of-work makes rewriting history expensive
- Distributed consensus requires careful protocol design
- Systems programming teaches you how computers really work

The full source code is available on GitHub.

**[→ View on GitHub](https://github.com/yourusername/cpp-blockchain)**
