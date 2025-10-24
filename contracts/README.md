# We3Chat Smart Contracts

This directory contains the smart contracts for the We3Chat decentralized chat application.

## Overview

We3Chat is a privacy-first decentralized chat application that allows users to:
- Create accounts with unique usernames
- Add friends using wallet addresses
- Send encrypted messages stored on-chain (metadata) and off-chain (content via IPFS)
- Maintain privacy through end-to-end encryption

## Architecture

- **ChatApp.sol**: Main smart contract handling account management, friend relationships, and message metadata
- **Encryption**: Messages are encrypted client-side using X25519 + AES-GCM
- **Storage**: Message content stored on IPFS, metadata stored on-chain
- **Network**: Deployed on Polygon for low gas fees and fast transactions

## Prerequisites

- Node.js 18+
- npm or yarn
- Hardhat
- MetaMask or similar Web3 wallet

## Installation

```bash
cd contracts
npm install
```

## Configuration

1. Copy `.env.example` to `.env`
2. Add your Polygon testnet RPC URL and private key:

```env
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_private_key_without_0x_prefix
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

## Development

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

### Deploy to Polygon Amoy Testnet

```bash
npx hardhat run scripts/deploy.js --network polygonAmoy
```

### Verify Contract

```bash
npx hardhat verify --network polygonAmoy <CONTRACT_ADDRESS>
```

## Contract Functions

### Account Management
- `createAccount(string username)`: Create a new account with unique username
- `accountExists(address user)`: Check if account exists
- `getUsername(address user)`: Get username for address

### Friend Management
- `addFriend(address friend)`: Add a friend
- `removeFriend(address friend)`: Remove a friend
- `areFriends(address user1, address user2)`: Check friendship status
- `getFriends(address user)`: Get list of friends

### Messaging
- `sendMessage(address receiver, string content, string ipfsHash)`: Send encrypted message
- `getMessages(address user1, address user2)`: Get messages between users
- `getConversation(address user1, address user2)`: Get full conversation
- `markMessageAsRead(address sender, uint256 index)`: Mark message as read
- `getUnreadCount(address receiver, address sender)`: Get unread message count

## Events

- `AccountCreated(address indexed user, string username)`
- `FriendAdded(address indexed user, address indexed friend)`
- `FriendRemoved(address indexed user, address indexed friend)`
- `MessageSent(address indexed sender, address indexed receiver, string content, string ipfsHash)`

## Security Considerations

- All message content is encrypted client-side before sending
- Only message metadata (timestamps, read status) is stored on-chain
- Encrypted content is stored off-chain via IPFS
- Users must verify friend addresses before adding them
- Private keys should never be shared or stored insecurely

## Gas Optimization

- Use Polygon network for lower gas fees
- Batch operations where possible
- Consider using Layer 2 solutions for frequent messaging

## Testing

The test suite covers:
- Account creation and validation
- Friend management (add/remove/check)
- Message sending and retrieval
- Edge cases and error handling
- Gas usage optimization

Run tests with:
```bash
npx hardhat test
```

## Deployment Addresses

Deployment information is saved in the `deployments/` directory with timestamps.

## Contributing

1. Follow Solidity style guide
2. Add tests for new functionality
3. Update documentation
4. Test on testnet before mainnet deployment

## License

MIT
