'use client';
import { useState, useEffect, useOptimistic, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, addDoc } from 'firebase/firestore';

export default function ChatView({ myId }: { myId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // OPTIMISTIC UI: Instantly show message
  const [optimisticMsgs, addOptimistic] = useOptimistic(
    messages,
    (state: any[], newMsg: any) => [newMsg, ...state]
  );

  useEffect(() => {
    const q = query(
      collection(db, "messages"),
      where("timestamp", ">=", Timestamp.fromDate(new Date(Date.now() - 86400000))),
      orderBy("timestamp", "desc")
    );
    return onSnapshot(q, (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const send = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    
    // Instant UI update
    addOptimistic({ text, senderId: myId, timestamp: new Date(), seen: false });
    
    // Background DB update
    await addDoc(collection(db, "messages"), {
      text,
      senderId: myId,
      timestamp: Timestamp.now(),
      seen: false
    });
  };

  return (
    <div className="flex flex-col h-full pt-24 animate-in fade-in duration-300">
      <div className="flex-grow overflow-y-auto px-4 space-y-2 pb-24 flex flex-col-reverse">
        <div ref={scrollRef} />
        {optimisticMsgs.map((msg, idx) => (
          <div key={idx} className={`flex w-full ${msg.senderId === myId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-2 rounded-[20px] text-[15px] font-medium ${
              msg.senderId === myId ? 'bg-gradient-to-b from-[#0084ff] to-[#0078ff] rounded-br-none' : 'bg-[#262629] rounded-bl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div className="fixed bottom-0 w-full bg-black/90 backdrop-blur-xl p-4 pb-10">
        <div className="flex bg-[#1c1c1e] rounded-full px-4 py-2 border border-white/5">
          <input 
            value={input} onChange={(e) => setInput(e.target.value)} 
            className="bg-transparent flex-grow text-sm focus:outline-none" placeholder="iMessage"
          />
          <button onClick={send} className="bg-blue-600 rounded-full w-8 h-8 font-bold">↑</button>
        </div>
      </div>
    </div>
  );
}