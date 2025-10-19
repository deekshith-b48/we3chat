// chatActions.ts
import { Contract } from "ethers";
import { getContract, getProvider } from "./ethers-helpers";
import { uploadJSON, fetchJSONFromCID } from "./ipfs";
import { getOrCreateX25519, encryptForRecipient, decryptFromSender, fromHex0x } from "./crypto";
import ChatABI from "@/lib/abi/ChatApp.json";
import { CHAT_ADDRESS } from "./contract";
import { ethers } from "ethers";

/**
 * sendMessageFlow:
 * - encrypt for recipient
 * - upload to IPFS
 * - compute cidHash (keccak256)
 * - call contract.sendMessage
 */
export async function sendMessageFlow(
  signer: any,
  myAddress: string,
  friendAddress: string,
  friendPubkeyHex: string,
  plaintext: string,
  onUpdate?: (u: any) => void
) {
  if (!signer) throw new Error("No signer");
  const contract = getContract(signer) as Contract | null;
  if (!contract) throw new Error("Chat contract not configured");

  const { secretKey: mySec } = getOrCreateX25519();
  const recipPub = fromHex0x(friendPubkeyHex);
  const enc = await encryptForRecipient(plaintext, mySec, recipPub);

  const payload = {
    v: 1,
    ciphertext: enc.ciphertext,
    iv: enc.iv,
    salt: enc.salt,
    sender: myAddress,
    receiver: friendAddress,
    timestamp: Date.now(),
  };

  const cid = await uploadJSON(payload);
  const cidHash = ethers.keccak256(ethers.toUtf8Bytes(cid)); // bytes32
  const txResp = await contract.sendMessage(friendAddress, cidHash, cid);
  onUpdate?.({ status: "pending", txHash: txResp.hash, cid, cidHash, payload });
  const receipt = await txResp.wait();
  onUpdate?.({ status: "confirmed", txHash: txResp.hash, blockNumber: receipt.blockNumber, cid, cidHash });
  return { txResp, receipt, cid, cidHash };
}

/**
 * loadConversation:
 * - calls contract.getMessages/readMessage to get conversation messages
 * - fetches MessageSent logs to map cidHash -> cid
 * - fetches IPFS blob for each CID and attempts to decrypt
 */
export async function loadConversation(myAddress: string, friendAddress: string) {
  const provider = getProvider();
  const contract = getContract(provider);

  try {
    // 1) Get messages from contract
    const messages = await contract.readMessage(friendAddress);

    // 2) Build mapping cidHash -> cid by querying MessageSent logs
      const iface = new ethers.Interface(ChatABI);
  const filter = {
    address: CHAT_ADDRESS,
    topics: [ethers.id("MessageSent(address,address,bytes32,uint256,string)")]
  };

    // Get logs for both directions of conversation
    const logs = await provider.getLogs({ 
      ...filter, 
      fromBlock: 0, 
      toBlock: "latest" 
    });

    // Parse logs and map cidHash->cid
    const cidMap = new Map<string, string>();
    for (const log of logs) {
      try {
        const parsed = iface.parseLog(log);
        if (!parsed) continue;
        // parsed.args = [from, to, cidHash, timestamp, cid]
        const from = parsed.args[0] as string;
        const to = parsed.args[1] as string;
        const cidHash = (parsed.args[2] as string).toLowerCase();
        const cid = parsed.args[4] as string;
        
        // Only include messages between these two users
        if ((from.toLowerCase() === myAddress.toLowerCase() && to.toLowerCase() === friendAddress.toLowerCase()) ||
            (from.toLowerCase() === friendAddress.toLowerCase() && to.toLowerCase() === myAddress.toLowerCase())) {
          cidMap.set(cidHash, cid);
        }
      } catch (e) {
        // ignore unrelated logs
        console.warn("Error parsing log:", e);
      }
    }

    // 3) For each returned message, get the cid, fetch ipfs, decrypt
    const { secretKey } = getOrCreateX25519(); // my private key
    const decryptedMessages = [];

    for (const m of messages) {
      const hash = (m.cidHash as string).toLowerCase();
      const cid = cidMap.get(hash);
      
      if (!cid) {
        console.warn("No CID found for cidHash:", hash);
        continue;
      }

      try {
        // Fetch encrypted payload from IPFS
        const encPayload = await fetchJSONFromCID(cid);
        
        // Determine sender's public key
        const sender = m.sender as string;
        const senderPubHex = await contract.getEncryptionKey(sender);
        
        if (!senderPubHex || senderPubHex === "0x0000000000000000000000000000000000000000000000000000000000000000") {
          throw new Error("Sender public key not found");
        }

        const senderPub = fromHex0x(senderPubHex);
        
        // Decrypt the message
        const plaintext = await decryptFromSender(
          encPayload.ciphertext,
          encPayload.iv,
          encPayload.salt,
          secretKey,
          senderPub
        );

        decryptedMessages.push({
          id: `${sender}-${m.timestamp}`,
          sender: m.sender,
          receiver: m.receiver,
          content: plaintext,
          timestamp: typeof m.timestamp === 'object' && m.timestamp.toNumber ? m.timestamp.toNumber() : Number(m.timestamp),
          cidHash: m.cidHash,
          cid,
          status: 'confirmed' as const,
          isEncrypted: true
        });

      } catch (err) {
        console.error("Error decrypting message:", err);
        decryptedMessages.push({
          id: `${m.sender}-${m.timestamp}`,
          sender: m.sender,
          receiver: m.receiver,
          content: "[Decryption failed]",
          timestamp: typeof m.timestamp === 'object' && m.timestamp.toNumber ? m.timestamp.toNumber() : Number(m.timestamp),
          cidHash: m.cidHash,
          cid: cid || '',
          status: 'confirmed' as const,
          isEncrypted: true,
          decryptionError: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    // Sort by timestamp
    return decryptedMessages.sort((a, b) => a.timestamp - b.timestamp);

  } catch (error) {
    console.error("Error loading conversation:", error);
    throw new Error(`Failed to load conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * subscribeToMessageEvents:
 * - Sets up event listener for MessageSent events
 * - Filters for messages involving the current user
 * - Returns unsubscribe function
 */
export function subscribeToMessageEvents(
  userAddress: string,
  onNewMessage: (event: any) => void
): () => void {
  const provider = getProvider();
  const iface = new ethers.Interface(ChatABI);
  
  // Create filter for MessageSent events
  const filter = {
    address: CHAT_ADDRESS,
    topics: [ethers.id("MessageSent(address,address,bytes32,uint256,string)")]
  };

  const handleLog = (log: any) => {
    try {
      const parsed = iface.parseLog(log);
      if (!parsed) return;
      const from = parsed.args[0] as string;
      const to = parsed.args[1] as string;
      const cidHash = parsed.args[2] as string;
      const timestamp = parsed.args[3];
      const cid = parsed.args[4] as string;

      // Only process messages involving this user
      if (from.toLowerCase() === userAddress.toLowerCase() || 
          to.toLowerCase() === userAddress.toLowerCase()) {
        onNewMessage({
          from,
          to,
          cidHash,
          timestamp: typeof timestamp === 'object' && timestamp.toNumber ? timestamp.toNumber() : Number(timestamp),
          cid,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash
        });
      }
    } catch (error) {
      console.error("Error parsing MessageSent event:", error);
    }
  };

  // Subscribe to events
  provider.on(filter, handleLog);

  // Return unsubscribe function
  return () => {
    provider.off(filter, handleLog);
  };
}

/**
 * loadFriendsFromContract:
 * - Fetches user's friends list from contract
 * - Gets username and public key for each friend
 */
export async function loadFriendsFromContract(userAddress: string) {
  const provider = getProvider();
  const contract = getContract(provider);

  try {
    // Get friends list
    const friends = await contract.getFriends({ from: userAddress });
    
    const friendsWithData = [];
    for (const friend of friends) {
      try {
        const friendAddress = friend.friendAddress || friend;
        const username = await contract.username(friendAddress);
        const publicKeyHex = await contract.getEncryptionKey(friendAddress);
        
        friendsWithData.push({
          address: friendAddress,
          username: username || `User ${friendAddress.slice(0, 6)}...`,
          publicKey: publicKeyHex,
          addedAt: friend.addedAt ? (typeof friend.addedAt === 'object' && friend.addedAt.toNumber ? friend.addedAt.toNumber() : Number(friend.addedAt)) : Date.now()
        });
      } catch (error) {
        console.error(`Error loading data for friend ${friend}:`, error);
        // Add friend with minimal data
        friendsWithData.push({
          address: typeof friend === 'string' ? friend : friend.friendAddress,
          username: `User ${(typeof friend === 'string' ? friend : friend.friendAddress).slice(0, 6)}...`,
          publicKey: null,
          addedAt: Date.now()
        });
      }
    }

    return friendsWithData;
  } catch (error) {
    console.error("Error loading friends from contract:", error);
    throw new Error(`Failed to load friends: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
