# 🚀 Web3 Chat Setup Guide

This guide will help you set up the complete Web3 chat functionality with wallet connections, smart contracts, IPFS storage, and client-side encryption.

## 📋 Prerequisites

- Node.js 18+ and npm
- MetaMask or another Ethereum wallet
- A Web3.Storage account (for IPFS)
- A WalletConnect project ID
- Test MATIC for Polygon Amoy testnet

## 🔧 Environment Setup

### 1. Copy Environment Configuration

```bash
cp env.example .env.local
```

### 2. Configure Required Environment Variables

Edit `.env.local` with your actual values:

#### Core Settings
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

#### Web3 Configuration
```env
# Network settings (Polygon Amoy testnet)
NEXT_PUBLIC_NETWORK_ID=80002
NEXT_PUBLIC_NETWORK_NAME=polygon-amoy
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_EXPLORER_URL=https://amoy.polygonscan.com

# Your deployed contract address
NEXT_PUBLIC_CHAT_ADDRESS=0xYourContractAddress
```

#### Wallet Integration
```env
# Get from https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Optional: Get from https://www.alchemy.com
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
```

#### IPFS Storage
```env
# Get from https://web3.storage
NEXT_PUBLIC_WEB3STORAGE_TOKEN=your_web3storage_token
```

## 🔗 Smart Contract Deployment

### 1. Deploy the ChatApp Contract

Deploy the smart contract with these functions:

```solidity
// Core functions your contract needs:
function createAccount(string memory name, bytes32 pubkey) external;
function setEncryptionKey(bytes32 pubkey) external;
function addFriend(address friendAddr, string memory name) external;
function sendMessage(address friendAddr, bytes32 cidHash, string memory cid) external;
function getFriends() external view returns (Friend[] memory);
function getMessages(address friendAddr) external view returns (Message[] memory);
function readMessage(address friendAddr) external view returns (Message[] memory);
function username(address user) external view returns (string memory);
function getEncryptionKey(address user) external view returns (bytes32);

// Events
event MessageSent(address indexed from, address indexed to, bytes32 indexed cidHash, uint256 timestamp, string cid);
event AccountCreated(address indexed user, string username, bytes32 publicKey);
event FriendAdded(address indexed user1, address indexed user2);
```

### 2. Update Contract Address

Replace `NEXT_PUBLIC_CHAT_ADDRESS` in `.env.local` with your deployed contract address.

## 🎯 Testing the Web3 Chat

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Application

```bash
npm run dev
```

### 3. Test Web3 Features

#### Connect Wallet
1. Open http://localhost:3000
2. Click "Connect Wallet"
3. Connect with MetaMask
4. Switch to Polygon Amoy testnet

#### Create Account
1. Click "Create Account" if you haven't set up an account
2. Enter a username
3. Sign the transaction
4. Wait for confirmation

#### Add Friends
1. Go to "Add Friend" section
2. Enter a friend's wallet address
3. Send friend request via smart contract
4. Friend needs to accept via `addFriend` contract call

#### Send Encrypted Messages
1. Select a friend from the sidebar
2. Type a message
3. Click Send
4. Watch the Web3 flow:
   - Message gets encrypted with X25519 + AES-GCM
   - Encrypted payload uploads to IPFS
   - CID hash gets stored on-chain
   - Transaction confirmation

#### Receive Messages
1. Messages automatically decrypt when received
2. Real-time updates via blockchain events
3. Message status tracking (pending → confirmed)
4. Transaction links to block explorer

## 🔐 Encryption Details

### Key Management
- Each user has an X25519 keypair stored locally
- Public keys are stored on-chain via `setEncryptionKey`
- Private keys never leave the browser

### Message Encryption Flow
1. **Shared Secret**: X25519 ECDH between sender private key and recipient public key
2. **Key Derivation**: HKDF-SHA256 to derive AES-GCM key
3. **Encryption**: AES-GCM with random IV and salt
4. **IPFS Upload**: Encrypted payload stored on IPFS
5. **On-chain Storage**: Only CID hash stored on blockchain

### Message Decryption Flow
1. **Fetch**: Get CID from blockchain events
2. **Download**: Fetch encrypted payload from IPFS
3. **Decrypt**: Use recipient private key + sender public key
4. **Display**: Show decrypted message in UI

## 📱 User Interface Features

### Chat Interface
- **Web3/API Status Indicator**: Shows current connection mode
- **Message Encryption Badges**: Visual indicators for encrypted messages
- **Transaction Links**: Direct links to block explorer
- **Decryption Error Handling**: Clear error messages
- **Real-time Updates**: Automatic message sync via events

### Progress Indicators
- Encrypting message
- Uploading to IPFS
- Sending transaction
- Confirming on blockchain

## 🛠️ Troubleshooting

### Common Issues

#### "Web3.Storage client not initialized"
- Check `NEXT_PUBLIC_WEB3STORAGE_TOKEN` is set
- Verify token is valid at https://web3.storage

#### "Contract not found"
- Verify `NEXT_PUBLIC_CHAT_ADDRESS` is correct
- Ensure contract is deployed on the correct network
- Check network ID matches `NEXT_PUBLIC_NETWORK_ID`

#### "Sender public key not found"
- User must call `setEncryptionKey` first
- Check if account was created properly

#### "Decryption failed"
- Keys might be mismatched
- IPFS payload might be corrupted
- Check browser console for detailed errors

### Debug Mode

Enable debug logging:
```env
NEXT_PUBLIC_DEBUG_WEB3=true
```

This will show detailed logs for:
- Encryption/decryption operations
- IPFS uploads/downloads
- Contract interactions
- Event listening

## 🔍 Testing Checklist

### Basic Web3 Features
- [ ] Wallet connection (MetaMask)
- [ ] Network switching (Polygon Amoy)
- [ ] Account creation on contract
- [ ] Public key storage

### Friend Management
- [ ] Add friend via contract
- [ ] Friends list loads from contract
- [ ] Friend usernames display correctly
- [ ] Friend public keys retrieved

### Messaging
- [ ] Send encrypted message
- [ ] Message appears as "pending"
- [ ] Transaction confirmation updates status
- [ ] Recipient receives real-time notification
- [ ] Message decrypts correctly
- [ ] Explorer link works

### Error Handling
- [ ] Network disconnection
- [ ] Failed transactions
- [ ] IPFS unavailability
- [ ] Decryption errors
- [ ] Missing public keys

### UI/UX
- [ ] Loading states
- [ ] Progress indicators
- [ ] Error messages
- [ ] Transaction status
- [ ] Encryption indicators

## 🚀 Production Deployment

### 1. Update Environment

```env
NEXT_PUBLIC_NETWORK_ID=137  # Polygon Mainnet
NEXT_PUBLIC_RPC_URL=https://polygon-rpc.com
NEXT_PUBLIC_EXPLORER_URL=https://polygonscan.com
NEXT_PUBLIC_TESTNET=false
```

### 2. Deploy Contract to Mainnet

Use the same contract but deploy to Polygon Mainnet.

### 3. Security Considerations

- Never expose private keys
- Validate all user inputs
- Rate limit contract interactions
- Monitor for spam/abuse
- Consider gas optimization

## 📖 API Reference

### Core Hooks

```typescript
// Send messages with Web3
const { sendMessage, isLoading, progress } = useSendMessage();
await sendMessage(friendAddress, friendPublicKey, message, useWeb3 = true);

// Load conversation history
const { isLoading, error } = useLoadConversation(friendAddress, useWeb3 = true);

// Load friends from contract
const { loadFriends } = useLoadFriends(useWeb3 = true);

// Web3 event subscription
useWeb3Events(); // Auto-subscribes to MessageSent events

// Transaction tracking
const { trackTransaction } = useTransactionTracking();
```

### Core Functions

```typescript
// Send encrypted message
sendMessageFlow(signer, myAddress, friendAddress, friendPubkey, plaintext, onUpdate);

// Load conversation
loadConversation(myAddress, friendAddress);

// Subscribe to events
subscribeToMessageEvents(userAddress, onNewMessage);

// Load friends
loadFriendsFromContract(userAddress);

// IPFS operations
uploadJSON(encryptedPayload);
fetchJSONFromCID(cid);

// Encryption
encryptForRecipient(plaintext, senderSecretKey, recipientPublicKey);
decryptFromSender(ciphertext, iv, salt, recipientSecretKey, senderPublicKey);
```

## 💡 Tips for Development

1. **Start with Testnet**: Always test on Polygon Amoy first
2. **Monitor Gas**: Track transaction costs and optimize
3. **Handle Async**: All Web3 operations are asynchronous
4. **Cache Data**: Consider caching for better UX
5. **Error Boundaries**: Implement comprehensive error handling
6. **User Feedback**: Show clear progress and status messages

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for detailed errors
3. Verify all environment variables are set correctly
4. Test contract functions directly on block explorer

Happy building! 🎉
