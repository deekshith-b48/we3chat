// ChatPanel.tsx
import React, { useEffect, useState, useRef } from "react";
import { loadConversation, sendMessageFlow, subscribeToMessageEvents } from "../lib/chatActions";
import { useAccount } from "wagmi";
import { getSigner } from "../lib/ethers-helpers";

type Friend = { address: string; username?: string; pubkey?: string };

export default function ChatPanel({ friend }: { friend: Friend }) {
  const { address } = useAccount();
  const signer = getSigner();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
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
      } catch (e) {
        console.debug("Failed to load conversation", e);
      }
    })();

    // subscribe to MessageSent for realtime updates
  const unsub = subscribeToMessageEvents(address || "", async (ev: any) => {
      // if this event affects this conversation, add it
      if ((ev.from.toLowerCase() === friend.address.toLowerCase() && ev.to.toLowerCase() === (address || "").toLowerCase()) ||
          (ev.from.toLowerCase() === (address || "").toLowerCase() && ev.to.toLowerCase() === friend.address.toLowerCase())) {
        // fetch ipfs, decrypt locally by calling loadConversation for simplicity (or fetch single cid)
        try {
          const conv = await loadConversation(address as string, friend.address);
          if (!mounted.current) return;
          setMessages(conv);
        } catch (e) { /* ignore */ }
      }
    });

    return () => {
      mounted.current = false;
      if (typeof unsub === "function") unsub();
    };
  }, [address, friend?.address]);

  async function onSend() {
    if (!input.trim() || !signer || !address) return;
    setSending(true);
    try {
  await sendMessageFlow(signer, address as string, friend.address, friend.pubkey || "", input, (update: any) => {
        if (update.status === "pending") {
          setMessages((s) => [...s, { plaintext: input, pending: true, txHash: update.txHash, cid: update.cid }]);
        }
        if (update.status === "confirmed") {
          // replace pending message with confirmed - simply reload conversation
          loadConversation(address as string, friend.address).then((conv: any) => setMessages(conv)).catch(() => {});
        }
      });
      setInput("");
    } catch (e) {
      console.error("sendMessage failed", e);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[80%] p-2 rounded ${m.raw?.sender?.toLowerCase() === address?.toLowerCase() || m.sender === address ? "ml-auto bg-blue-500 text-white" : "bg-gray-200"}`}>
            <div>{m.plaintext ?? (m.error ? <i>{m.error}</i> : <i>decrypting...</i>)}</div>
            <div className="text-xs opacity-70 mt-1">{m.timestamp ? new Date(m.timestamp).toLocaleString() : ""}{m.pending ? " · pending" : ""}</div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t flex gap-2">
        <input className="flex-1 p-2 border rounded" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." />
        <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={onSend} disabled={sending || !input.trim()}>
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
