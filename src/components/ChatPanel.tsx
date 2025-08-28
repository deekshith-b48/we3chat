import React, { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { getSigner } from '@/lib/ethers-helpers';
import { loadConversation, sendMessageFlow, subscribeToMessages } from '@/lib/chatActions';

type Friend = { address: string; username?: string; pubkey?: string };

export default function ChatPanel({ friend }: { friend: Friend }) {
  const { address } = useAccount();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!address || !friend?.address) return;

    (async () => {
      try {
        const conv = await loadConversation(address as string, friend.address);
        if (!mounted.current) return;
        setMessages(conv);
      } catch {}
    })();

    const unsub = subscribeToMessages(async (ev) => {
      if ((ev.from.toLowerCase() === friend.address.toLowerCase() && ev.to.toLowerCase() === (address || '').toLowerCase()) ||
          (ev.from.toLowerCase() === (address || '').toLowerCase() && ev.to.toLowerCase() === friend.address.toLowerCase())) {
        try {
          const conv = await loadConversation(address as string, friend.address);
          if (!mounted.current) return;
          setMessages(conv);
        } catch {}
      }
    });

    return () => {
      mounted.current = false;
      if (typeof unsub === 'function') unsub();
    };
  }, [address, friend?.address]);

  async function onSend() {
    if (!input.trim() || !address) return;
    setSending(true);
    try {
      const signer = getSigner();
      await sendMessageFlow(signer as any, address as string, friend.address, friend.pubkey || '', input, (update) => {
        if (update.status === 'pending') {
          setMessages((s) => [...s, { plaintext: input, pending: true, txHash: update.txHash, cid: update.cid }]);
        }
        if (update.status === 'confirmed') {
          loadConversation(address as string, friend.address).then((conv) => setMessages(conv)).catch(() => {});
        }
      });
      setInput('');
    } catch (e) {
      console.error('sendMessage failed', e);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[80%] p-2 rounded ${m.raw?.sender?.toLowerCase() === address?.toLowerCase() || m.sender === address ? 'ml-auto bg-blue-500 text-white' : 'bg-gray-200'}`}>
            <div>{m.plaintext ?? (m.error ? <i>{m.error}</i> : <i>decrypting...</i>)}</div>
            <div className="text-xs opacity-70 mt-1">{m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}{m.pending ? ' · pending' : ''}</div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t flex gap-2">
        <input className="flex-1 p-2 border rounded" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." />
        <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={onSend} disabled={sending || !input.trim()}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
