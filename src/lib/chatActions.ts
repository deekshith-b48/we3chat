import { ethers } from 'ethers';
import { getContract, getProvider } from '@/lib/ethers-helpers';
import { uploadJSON, fetchJSONFromCID } from '@/lib/ipfs';
import { getOrCreateX25519, encryptForRecipient, decryptFromSender, fromHex0x } from '@/lib/crypto';
import ChatABI from '@/lib/abi/ChatApp.json';
import { CHAT_ADDRESS } from '@/lib/contract';

export async function sendMessageFlow(
  signer: ethers.Signer,
  myAddress: string,
  friendAddress: string,
  friendPubkeyHex: string,
  plaintext: string,
  onUpdate?: (u: any) => void
) {
  if (!signer) throw new Error('No signer');
  const contract = getContract(signer);
  if (!contract) throw new Error('Chat contract not configured');

  const { secretKey } = getOrCreateX25519();
  const recipPub = fromHex0x(friendPubkeyHex);
  const enc = await encryptForRecipient(plaintext, secretKey, recipPub);

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
  const cidHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(cid));
  // New ABI: sendMessage(friendAddr, cidHash)
  const txResp = await (contract as any).sendMessage(friendAddress, cidHash);
  onUpdate?.({ status: 'pending', txHash: txResp.hash, cid, cidHash, payload });
  const receipt = await txResp.wait();
  onUpdate?.({ status: 'confirmed', txHash: txResp.hash, blockNumber: receipt.blockNumber, cid, cidHash });
  return { txResp, receipt, cid, cidHash };
}

export async function loadConversation(myAddress: string, friendAddress: string) {
  const provider = getProvider();
  const contract = getContract(provider);
  if (!contract) throw new Error('Chat contract not configured');

  let msgs: any[] = [];
  try {
    if (typeof (contract as any).getMessages === 'function') {
      msgs = await (contract as any).getMessages(friendAddress);
    } else if (typeof (contract as any).readMessage === 'function') {
      msgs = await (contract as any).readMessage(friendAddress);
    } else {
      throw new Error('No read method found on contract');
    }
  } catch {
    return [];
  }

  const iface = new ethers.utils.Interface(ChatABI as any);
  const topics = [ethers.utils.id('MessageSent(address,address,bytes32,uint256)')];
  const logs = await provider.getLogs({ address: CHAT_ADDRESS, fromBlock: 0, toBlock: 'latest', topics });
  const cidMap = new Map<string, string>();
  for (const log of logs) {
    try {
      const parsed = iface.parseLog(log);
      const cidHash = (parsed.args[2] as string).toLowerCase();
      // Old ABI may not emit cid string; keep map empty in that case
      if (parsed.args.length > 4 && parsed.args[4]) {
        cidMap.set(cidHash, parsed.args[4] as string);
      }
    } catch {}
  }

  const { secretKey } = getOrCreateX25519();
  const out: any[] = [];
  for (const m of msgs) {
    const cidHash: string | undefined = (m.cidHash as string) ?? (m[2] as string);
    if (!cidHash) continue;
    const cid = cidMap.get(cidHash.toLowerCase());
    if (!cid) {
      out.push({ raw: m, cid: null, plaintext: null, error: 'cid-not-found' });
      continue;
    }
    try {
      const ipfsPayload = await fetchJSONFromCID(cid);
      const sender = (m.sender as string) ?? m[0];
      let senderPubHex = '';
      try {
        senderPubHex = await (contract as any).getEncryptionKey(sender);
      } catch {
        try {
          senderPubHex = await (contract as any).x25519PublicKey(sender);
        } catch {}
      }
      const senderPub = fromHex0x(senderPubHex);
      let plaintext: string | null = null;
      try {
        plaintext = await decryptFromSender(ipfsPayload.ciphertext, ipfsPayload.iv, ipfsPayload.salt, secretKey, senderPub);
      } catch {
        plaintext = null;
      }
      out.push({ raw: m, cid, plaintext, timestamp: (m as any).timestamp?.toNumber?.() ?? (m as any).timestamp });
    } catch {
      out.push({ raw: m, cid, plaintext: null, error: 'ipfs-fetch-or-decrypt-failed' });
    }
  }

  out.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  return out;
}

export function subscribeToMessages(cb: (p: { from: string; to: string; cidHash: string; rawLog: any }) => void) {
  const provider = getProvider();
  const iface = new ethers.utils.Interface(ChatABI as any);
  const filter = { address: CHAT_ADDRESS, topics: [ethers.utils.id('MessageSent(address,address,bytes32,uint256)')] };
  const handler = (log: any) => {
    try {
      const parsed = iface.parseLog(log);
      cb({ from: parsed.args[0] as string, to: parsed.args[1] as string, cidHash: (parsed.args[2] as string).toLowerCase(), rawLog: log });
    } catch {}
  };
  provider.on(filter as any, handler);
  return () => provider.off(filter as any, handler as any);
}
