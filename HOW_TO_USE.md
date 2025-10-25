# 📱 How to Use We3Chat - Complete Guide

## 🎯 Overview

We3Chat is a fully decentralized chat application built on the Ethereum blockchain (Polygon Amoy testnet). Here's how to use all its features.

## 🚀 Getting Started

### 1. Connect Your Wallet
- Open the app at `http://localhost:3000`
- Click on your preferred wallet option:
  - **MetaMask** (Browser Extension)
  - **WalletConnect** (Mobile Wallet)
  - **Coinbase Wallet** (Mobile/Desktop)
- Approve the connection request in your wallet

### 2. Register Your Profile
After connecting, you'll need to register:
- **Username**: Choose a unique username (required)
- **Bio**: Write a short bio about yourself (optional)
- **Avatar**: Upload a profile picture (optional)
- Click **"Register"** to create your on-chain profile

**Note**: Registration requires a blockchain transaction, so make sure you have some MATIC on Polygon Amoy testnet.

---

## 👥 Finding and Adding Friends

### User Discovery
1. Click the **🔍 Discover Users** button in the sidebar
2. Browse all registered We3Chat users
3. Use the search bar to find specific users by:
   - Username
   - Wallet address
   - Bio keywords
4. Click **"Add Friend"** on any user you want to connect with

### Friend Requests
1. Click the **👥 Friend Requests** button in the sidebar
2. View all pending friend requests
3. For each request, you can:
   - **Accept**: Click the green "Accept" button
   - **Reject**: Click the red "Reject" button
4. Accepted friends will appear in your sidebar

### Managing Friends
- All your friends appear in the **Friends** section of the sidebar
- Click on any friend to start a direct message conversation
- Friends list shows:
  - Friend's username
  - Wallet address (shortened)
  - Online status

---

## 💬 Chatting with Friends

### Starting a Conversation
1. Click on a friend's name in the sidebar
2. The chat interface will open on the right
3. Type your message in the input box at the bottom
4. Press **Enter** or click **"Send"** to send the message

### Advanced Chat Features

#### Message Types
- **Text Messages**: Simple text communication
- **File Sharing**: Click the 📎 button to attach files
- **Voice Messages**: Hold the 🎤 button to record
- **Images**: Drag and drop or select image files
- **Videos**: Share video files

#### Message Actions
- **Reply**: Click the ↩️ button to reply to a specific message
- **React**: Click 😀 to add emoji reactions
- **Forward**: Click ↗️ to forward to other chats
- **Edit**: Click ✏️ to edit your own messages
- **Delete**: Click 🗑️ to delete your messages

#### Message Status
Your messages show status indicators:
- **⏳ Sending**: Message is being sent
- **✓ Sent**: Message delivered to blockchain
- **✓✓ Delivered**: Message delivered to recipient
- **✓✓ Read**: Message has been read (blue checkmarks)

#### Typing Indicators
- See when your friend is typing
- Three animated dots appear at the bottom of chat
- Shows "{Friend} is typing..."

---

## 👥 Group Chats

### Creating a Group
1. Click the **➕ Create Group** button in the sidebar
2. Enter group details:
   - **Group Name**: Choose a name (required)
   - **Description**: Optional group description
   - **Avatar**: Upload a group image (optional)
3. Select members from your friends list
4. Click **"Create Group"** to create

### Group Features
- **Group Info**: View group name, description, members
- **Add Members**: Invite more friends to the group
- **Remove Members**: Remove members (admin only)
- **Leave Group**: Leave the group chat
- **Delete Group**: Permanently delete (creator only)

### Group Messaging
- Works exactly like direct messages
- All members can see messages
- @mentions support (coming soon)
- Group reactions and replies

---

## 🔍 Search Functionality

### Searching Messages
1. Use the search bar at the top of any chat
2. Search for:
   - Specific words or phrases
   - Sender names
   - Message types
   - Date ranges

### Search Filters
- Filter by message type (text, image, file, etc.)
- Filter by sender
- Filter by date range
- Sort by relevance or date

---

## 🔔 Notifications

### Enabling Notifications
1. The app will ask for notification permission
2. Click **"Allow"** in your browser
3. You'll receive notifications for:
   - New messages
   - Friend requests
   - Group invitations
   - Mentions (coming soon)

### Notification Settings
- **Sound**: Enable/disable notification sounds
- **Preview**: Show/hide message preview
- **Quiet Hours**: Set do-not-disturb times

---

## 🎨 User Interface Guide

### Sidebar (Left)
- **Search Bar**: Find users and groups
- **Action Buttons**: 
  - 🔍 Discover Users
  - 👥 Friend Requests
  - ➕ Create Group
- **Friends List**: All your friends
- **Groups List**: All your group chats
- **User Profile**: Your profile at the bottom

### Main Chat Area (Right)
- **Chat Header**: Friend/group name and actions
- **Messages Area**: All messages in the conversation
- **Message Input**: Type and send messages
- **Attachment Buttons**: 📎 Files, 🎤 Voice

### Top Navigation Bar
- **App Title**: We3Chat logo
- **Connection Status**: Wallet connection indicator
- **Settings**: App settings (gear icon)
- **Profile**: Your profile dropdown

---

## 🔒 Privacy & Security

### End-to-End Encryption
- All messages are encrypted using **X25519 + AES-GCM**
- Only you and the recipient can read messages
- Even the blockchain cannot decrypt your messages

### Decentralized Storage
- Messages are stored on **IPFS** (InterPlanetary File System)
- No central server can access or delete your data
- Censorship-resistant and permanent storage

### Wallet Security
- Never share your private keys
- Always verify transaction details before signing
- Use hardware wallets for maximum security

---

## 🛠️ Troubleshooting

### Common Issues

#### "Not Connected" Error
**Problem**: Wallet is not connected
**Solution**:
1. Click "Connect Wallet" button
2. Select your wallet
3. Approve connection in wallet popup

#### "Please Register" Message
**Problem**: Profile not registered
**Solution**:
1. Fill in username (required)
2. Add bio and avatar (optional)
3. Click "Register"
4. Confirm transaction in wallet

#### Messages Not Sending
**Problem**: Transaction failing or insufficient funds
**Solution**:
1. Check you have MATIC for gas fees
2. Try increasing gas limit
3. Check network connection
4. Refresh and try again

#### Can't See Friends
**Problem**: Friends list is empty
**Solution**:
1. Click "Discover Users"
2. Send friend requests
3. Wait for acceptance
4. Refresh the page

#### Group Not Loading
**Problem**: Group chat not appearing
**Solution**:
1. Check you're a member
2. Refresh the page
3. Check blockchain connection
4. Try rejoining the group

---

## 💡 Pro Tips

### Best Practices
1. **Add Friends First**: Build your network before creating groups
2. **Use Reactions**: Quick way to acknowledge messages
3. **Search Often**: Use search to find old messages
4. **Pin Important Chats**: (Coming soon)
5. **Backup Keys**: Always backup your wallet recovery phrase

### Advanced Features
- **Voice Messages**: Hold mic button for quick voice notes
- **File Sharing**: Drag and drop files directly into chat
- **Bulk Forward**: Select multiple messages to forward
- **Read Receipts**: Know when messages are read
- **Typing Indicators**: See when others are typing

### Performance Tips
- Close unused chat windows
- Clear old conversations periodically
- Use search instead of scrolling
- Enable hardware acceleration in browser

---

## 📊 Understanding the System

### How Messages Work
1. **You Type**: Message is typed in the input
2. **Encryption**: Message is encrypted on your device
3. **IPFS Upload**: Encrypted content uploaded to IPFS
4. **Blockchain**: IPFS CID stored on blockchain
5. **Notification**: Recipient receives notification
6. **Decryption**: Recipient decrypts the message

### Transaction Costs
- **Registration**: One-time fee (~0.001 MATIC)
- **Friend Request**: Small fee (~0.0001 MATIC)
- **Sending Message**: Small fee (~0.0001 MATIC)
- **Creating Group**: Small fee (~0.0002 MATIC)

### Data Storage
- **User Profiles**: Stored on blockchain
- **Friend Lists**: Stored on blockchain
- **Group Info**: Stored on blockchain
- **Messages**: Encrypted and stored on IPFS
- **Files**: Stored on IPFS

---

## 🎯 Next Steps

### After Setup
1. ✅ Connect wallet
2. ✅ Register profile
3. ✅ Add friends
4. ✅ Start chatting
5. ✅ Create groups
6. ✅ Share files
7. ✅ Explore features

### Advanced Usage
- Set up notification preferences
- Customize your profile
- Create themed groups
- Use reactions creatively
- Forward important messages

---

## 🆘 Getting Help

### Support Resources
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Read the technical docs
- **Community**: Join our Discord/Telegram
- **FAQ**: Check frequently asked questions

### Need Help?
If you encounter any issues:
1. Check this guide first
2. Look for error messages in console (F12)
3. Try refreshing the page
4. Clear browser cache
5. Try a different wallet
6. Report the issue on GitHub

---

## 🎉 Enjoy We3Chat!

You're now ready to experience truly decentralized, private, and censorship-resistant messaging!

**Remember**: 
- Your keys, your data
- No central authority
- Complete privacy
- Permanent history

**Happy Chatting! 💬**

