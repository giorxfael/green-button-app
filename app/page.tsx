'use client';
import { useState, useEffect, useRef } from 'react';
import { db, getMessagingInstance } from '../lib/firebase';
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  limit, 
  where, 
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { getToken } from 'firebase/messaging';

export default function Home() {
  const [myId, setMyId] = useState<'iPhone1' | 'iPhone2' | null>(null);
  const [appState, setAppState] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [customMsg, setCustomMsg] = useState('');
  const [replyMsg, setReplyMsg] = useState(''); 
  const [history, setHistory] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  // CHAT STATES
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const sessionStart = useRef(new Date().getTime());

  useEffect(() => {
    setMounted(true);
    const savedId = localStorage.getItem('myDeviceId') as 'iPhone1' | 'iPhone2';
    if (savedId) setMyId(savedId);
  }, []);

  // 1. PING LISTENER
  useEffect(() => {
    if (!mounted || !myId) return;
    const unsubscribe = onSnapshot(doc(db, "notifications", "current"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAppState(data);
        if (data.status === 'pending' && data.sender === myId) {
          setStatus('Waiting... ⏳');
        } else {
          setStatus('');
        }
      }
    });
    return () => unsubscribe();
  }, [mounted, myId]);

  // 2. CHAT LISTENER
  useEffect(() => {
    if (!mounted || !isChatOpen) return;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, "messages"),
      where("timestamp", ">=", Timestamp.fromDate(twentyFourHoursAgo)),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [mounted, isChatOpen]);

  // 3. SEEN LOGIC
  useEffect(() => {
    if (!mounted || !isChatOpen || !messages.length || !myId) return;
    const unseenMessages = messages.filter(msg => msg.senderId !== myId && !msg.seen);
    unseenMessages.forEach(async (msg) => {
      const msgRef = doc(db, "messages", msg.id);
      await updateDoc(msgRef, { seen: true });
    });
  }, [isChatOpen, messages, myId, mounted]);

  // 4. HISTORY LISTENER
  useEffect(() => {
    if (!mounted) return;
    const q = query(collection(db, "history"), orderBy("timestamp", "desc"), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [mounted]);

  const getQuietStreak = () => {
    if (history.length === 0) return { time: "0h 0m", emoji: "🆕" };
    const lastPing = history.find(item => item.timestamp)?.timestamp?.toDate();
    if (!lastPing) return { time: "0h 0m", emoji: "🐣" };
    const diffInMs = new Date().getTime() - lastPing.getTime();
    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffInMs / (1000 * 60)) % 60);
    const days = Math.floor(hours / 24);
    return { time: days > 0 ? `${days}d ${hours % 24}h` : `${hours}h ${minutes}m`, emoji: hours >= 1 ? "🧘" : "🤫" };
  };

  const streak = getQuietStreak();

  const sendPing = async () => {
    await fetch('/api/notify', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: customMsg || "🔔", senderId: myId }) 
    });
    setCustomMsg('');
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput;
    setChatInput('');
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, senderId: myId })
    });
  };

  const handleResponse = async (answer: 'yes' | 'no' | 'text') => {
    await fetch('/api/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        answer: answer === 'text' ? 'replied' : answer,
        textResponse: answer === 'text' ? replyMsg : null 
      })
    });
    setReplyMsg('');
  };

  const register = async (id: 'iPhone1' | 'iPhone2') => {
    setMyId(id);
    localStorage.setItem('myDeviceId', id);
    const messaging = await getMessagingInstance();
    if (!messaging) return;
    const token = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY });
    await setDoc(doc(db, "tokens", id), { token });
    localStorage.setItem('isRegistered', 'true');
  };

  if (!mounted) return <div className="min-h-screen bg-black" />;
  if (!myId) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-6 p-6">
       <button onClick={() => register('iPhone1')} className="w-full max-w-xs border-2 border-white/10 py-6 rounded-3xl font-black italic text-xl text-white uppercase tracking-tighter">iPhone 1</button>
       <button onClick={() => register('iPhone2')} className="w-full max-w-xs border-2 border-white/10 py-6 rounded-3xl font-black italic text-xl text-white uppercase tracking-tighter">iPhone 2</button>
    </div>
  );

  const isIBeingPinged = appState?.status === 'pending' && appState?.sender !== myId;
  const amIWaiting = appState?.status === 'pending' && appState?.sender === myId;

  return (
    <div className="flex flex-col h-screen bg-black text-white text-center overflow-hidden relative">
      
      {/* HEADER (RE-FIXED) */}
      <div className="absolute top-0 w-full z-50 px-6 pt-14 pb-4 flex items-center justify-start">
          <button onClick={() => setIsChatOpen(!isChatOpen)} className="opacity-40 hover:opacity-100 transition-all active:scale-90 flex items-center">
            {isChatOpen ? (
              <span className="text-blue-500 font-black italic text-[10px] tracking-widest uppercase">〈 Back</span>
            ) : (
              <span className="text-2xl">💬</span>
            )}
          </button>
      </div>

      {isChatOpen ? (
        /* IPHONE MESSAGES VIEW */
        <div className="flex flex-col h-full pt-28 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex-grow overflow-y-auto px-4 space-y-2 pb-24 scrollbar-hide flex flex-col">
             <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest py-4 text-center">Messages expire in 24h</p>
            {messages.filter(msg => msg.text?.trim()).map((msg, idx) => {
              const isMine = msg.senderId === myId;
              const isLast = idx === messages.length - 1;
              return (
                <div key={msg.id} className="flex flex-col w-full">
                  <div className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2 rounded-[20px] text-[15px] leading-tight font-medium ${isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[#262629] text-white rounded-bl-none'}`}>{msg.text}</div>
                  </div>
                  {isMine && isLast && (
                    <span className="text-[10px] text-zinc-500 font-bold mt-1 pr-1 text-right animate-in fade-in duration-300">
                      {msg.seen ? 'Read' : 'Delivered'}
                    </span>
                  )}
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
          <div className="absolute bottom-0 w-full bg-[#121212]/90 backdrop-blur-2xl border-t border-white/10 px-4 py-3 pb-10">
            <div className="relative flex items-center bg-[#1c1c1e] rounded-full border border-white/10 pr-2">
              <input type="text" placeholder="iMessage" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                className="w-full bg-transparent py-3 px-4 text-sm focus:outline-none placeholder:text-zinc-600"
              />
              <button onClick={sendChatMessage} disabled={!chatInput.trim()} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${chatInput.trim() ? 'bg-blue-600' : 'bg-zinc-700 opacity-30'}`}><span className="text-white text-lg font-bold">↑</span></button>
            </div>
          </div>
        </div>
      ) : (
        /* RESTORED PING VIEW */
        <div className="flex flex-col h-full pt-28">
          <div className="relative flex-grow flex items-center justify-center w-full">
            {isIBeingPinged ? (
              <div className="w-full max-w-xs z-10 space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="flex flex-col items-center justify-center min-h-[160px] px-4"><p className="text-3xl font-black tracking-tighter leading-none text-white uppercase italic">{appState.message}</p></div>
                <div className="relative w-full mb-4 px-4">
                  <input type="text" placeholder="REPLY..." value={replyMsg} onChange={(e) => setReplyMsg(e.target.value)}
                    className="w-full bg-transparent border-b border-white/40 px-2 py-3 text-center focus:outline-none focus:border-white transition-all text-lg font-black tracking-[0.1em] uppercase italic placeholder:text-zinc-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 px-8">
                  <button onClick={() => replyMsg ? handleResponse('text') : handleResponse('yes')} className={`bg-transparent border py-4 rounded-3xl text-lg font-black active:scale-95 transition-all ${replyMsg ? 'border-blue-500 text-blue-500' : 'border-green-500 text-green-500'}`}>{replyMsg ? 'SEND' : 'YES'}</button>
                  <button onClick={() => replyMsg ? setReplyMsg('') : handleResponse('no')} className={`bg-transparent border py-4 rounded-3xl text-lg font-black active:scale-95 transition-all ${replyMsg ? 'border-zinc-500 text-zinc-500' : 'border-red-500 text-red-500'}`}>{replyMsg ? 'CANCEL' : 'NO'}</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="relative mb-10 w-72">
                  <input disabled={amIWaiting} type="text" placeholder="MESSAGE..." value={customMsg} onChange={(e) => setCustomMsg(e.target.value)}
                    className="w-full bg-transparent border-b border-white/20 px-2 py-4 text-center focus:outline-none focus:border-green-500 transition-all text-xl font-black tracking-[0.2em] placeholder:text-zinc-800 placeholder:font-black uppercase italic"
                  />
                  <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                </div>
                <div className="w-64 h-64 flex items-center justify-center">
                  <button disabled={amIWaiting} onClick={sendPing} 
                    className={`w-full h-full rounded-full text-4xl font-black uppercase tracking-tighter transition-all ${amIWaiting ? 'bg-zinc-900 text-zinc-700' : 'bg-green-600 shadow-[0_0_60px_rgba(34,197,94,0.5)] active:scale-90'}`}
                  >{amIWaiting ? '...' : (customMsg ? 'SEND' : 'PUSH')}</button>
                </div>
                <div className="h-32 flex flex-col items-center justify-center mt-6">
                  <p className="font-black text-2xl uppercase italic tracking-tighter text-yellow-400">{status}</p>
                </div>
              </div>
            )}
          </div>

          {/* QUIET STREAK */}
          <div className="w-full max-w-sm mx-auto flex items-center justify-between px-6 mb-4 opacity-60">
            <div className="flex flex-col items-start text-left">
              <span className="text-[8px] text-zinc-500 uppercase tracking-[0.3em] font-black leading-none mb-1 italic">Quiet Streak</span>
              <span className="text-sm font-mono text-zinc-300 tabular-nums font-bold">{streak.time}</span>
            </div>
            <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{streak.emoji}</span>
          </div>

          {/* HISTORY */}
          <div className="w-full max-w-sm mx-auto bg-zinc-900/40 rounded-3xl p-6 border border-white/5 backdrop-blur-md mb-10 text-left">
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-gray-600 mb-4 font-black ml-2 italic">Activity</h2>
            <div className="space-y-4">
              {history.map((item) => (
                <div key={item.id} className="flex justify-between items-start text-xs border-b border-white/5 pb-2">
                  <div className="flex flex-col">
                    <span className={`text-[8px] font-black uppercase ${item.status !== 'pending' ? 'text-blue-500' : 'text-zinc-800'}`}>{item.status !== 'pending' ? "PICKED" : "SENT"}</span>
                    <span className="text-gray-400 font-mono">{item.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1 max-w-[180px]">
                    <span className="text-xs text-zinc-600 italic truncate w-full text-right">"{item.message}"</span>
                    <span className={`font-black uppercase text-[10px] italic ${item.status === 'yes' ? 'text-green-500' : item.status === 'no' ? 'text-red-500' : 'text-blue-400'}`}>{item.status === 'replied' ? "REPLIED" : item.status.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}