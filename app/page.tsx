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
       <button onClick={() => register('iPhone1')} className="w-full max-w-xs bg-zinc-900 py-6 rounded-3xl font-bold text-xl text-white">iPhone 1</button>
       <button onClick={() => register('iPhone2')} className="w-full max-w-xs bg-zinc-900 py-6 rounded-3xl font-bold text-xl text-white">iPhone 2</button>
    </div>
  );

  const isIBeingPinged = appState?.status === 'pending' && appState?.sender !== myId;
  const amIWaiting = appState?.status === 'pending' && appState?.sender === myId;

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden relative font-[-apple-system,BlinkMacSystemFont,sans-serif]">
      
      {/* HEADER */}
      <div className="absolute top-0 w-full z-50 px-5 pt-16 pb-3 flex items-center justify-between bg-black/80 backdrop-blur-xl border-b border-white/5">
        <button onClick={() => setIsChatOpen(!isChatOpen)} className="text-[#007AFF] text-[17px] font-normal flex items-center active:opacity-40 transition-opacity">
          {isChatOpen ? <><span className="text-2xl mr-1">‹</span><span>Back</span></> : <span className="text-2xl">💬</span>}
        </button>
        <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2">
            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center mb-0.5">
                <span className="text-[10px] text-zinc-500">👤</span>
            </div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{isChatOpen ? "MESSAGES" : "DASHBOARD"}</span>
        </div>
        <div className="w-10" />
      </div>

      {isChatOpen ? (
        /* CHAT VIEW */
        <div className="flex flex-col h-full pt-[110px] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex-grow overflow-y-auto px-3 space-y-1.5 pb-24 scrollbar-hide flex flex-col">
             <p className="text-[11px] text-zinc-500 font-semibold py-4 text-center">Yesterday 2:45 AM</p>
            {messages.filter(msg => msg.text?.trim()).map((msg, idx) => {
              const isMine = msg.senderId === myId;
              const isLast = idx === messages.length - 1;
              return (
                <div key={msg.id} className="flex flex-col w-full">
                  <div className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2 rounded-[18px] text-[16px] leading-[1.3] ${
                        isMine 
                        ? 'bg-gradient-to-b from-[#0084ff] to-[#0078ff] text-white rounded-tr-[4px]' 
                        : 'bg-[#262629] text-white rounded-tl-[4px]'
                    }`}>
                        {msg.text}
                    </div>
                  </div>
                  {isMine && isLast && (
                    <span className="text-[11px] text-zinc-500 font-normal mt-1 mr-1 text-right">
                      {msg.seen ? 'Read' : 'Delivered'}
                    </span>
                  )}
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
          
          <div className="absolute bottom-0 w-full bg-black/90 backdrop-blur-2xl px-3 py-3 pb-10">
            <div className="relative flex items-center bg-[#1c1c1e] rounded-[22px] px-4 py-1.5 border border-white/5">
              <input 
                type="text" placeholder="iMessage" value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                className="flex-grow bg-transparent py-2 text-[16px] focus:outline-none placeholder:text-[#636366]"
              />
              <button 
                onClick={sendChatMessage} 
                disabled={!chatInput.trim()}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    chatInput.trim() ? 'bg-[#007AFF] scale-100' : 'bg-zinc-700 opacity-20 scale-90'
                }`}
              >
                <span className="text-white font-bold text-lg">↑</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* PING VIEW */
        <div className="flex flex-col h-full pt-32 px-6">
          <div className="flex-grow flex flex-col items-center justify-center space-y-12">
            {isIBeingPinged ? (
              <div className="w-full space-y-8 animate-in fade-in zoom-in duration-500">
                <h1 className="text-4xl font-black tracking-tighter italic uppercase text-center">{appState.message}</h1>
                <input 
                  type="text" placeholder="Reply..." value={replyMsg} onChange={(e) => setReplyMsg(e.target.value)}
                  className="w-full bg-zinc-900 rounded-2xl py-4 px-6 text-center focus:outline-none focus:ring-1 ring-white/20 text-xl font-bold italic"
                />
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => replyMsg ? handleResponse('text') : handleResponse('yes')} className="bg-[#34C759] py-5 rounded-2xl text-xl font-black uppercase italic">Yes</button>
                  <button onClick={() => replyMsg ? setReplyMsg('') : handleResponse('no')} className="bg-[#FF3B30] py-5 rounded-2xl text-xl font-black uppercase italic">No</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-12">
                <div className="relative w-full">
                  <input 
                    disabled={amIWaiting} type="text" placeholder="SEND MESSAGE..." value={customMsg} onChange={(e) => setCustomMsg(e.target.value)}
                    className="bg-transparent text-center text-2xl font-black italic uppercase tracking-widest placeholder:text-zinc-800 focus:outline-none"
                  />
                </div>
                <button 
                  disabled={amIWaiting} onClick={sendPing} 
                  className={`w-64 h-64 rounded-full text-5xl font-black italic transition-all active:scale-90 ${
                    amIWaiting ? 'bg-zinc-900 text-zinc-700' : 'bg-[#34C759] shadow-[0_0_80px_rgba(52,199,89,0.3)]'
                  }`}
                >
                  {amIWaiting ? '...' : 'PUSH'}
                </button>
                <p className="text-yellow-400 font-black italic tracking-widest h-8">{status}</p>
              </div>
            )}
          </div>

          {/* QUIET STREAK */}
          <div className="flex items-center justify-between bg-zinc-900/50 p-5 rounded-3xl mb-4">
            <div className="text-left">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Quiet Streak</p>
              <p className="text-lg font-mono font-bold text-zinc-300">{streak.time}</p>
            </div>
            <span className="text-3xl">{streak.emoji}</span>
          </div>

          {/* HISTORY */}
          <div className="bg-zinc-900/50 rounded-3xl p-6 mb-10 text-left">
            <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">Activity</h2>
            <div className="space-y-4">
              {history.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                  <div>
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-0.5">{item.status === 'replied' ? 'CONVO' : 'PING'}</p>
                    <p className="text-zinc-400 font-mono">{item.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-400 italic mb-1">"{item.message}"</p>
                    <p className={`font-black uppercase text-[10px] ${item.status === 'yes' ? 'text-green-500' : item.status === 'no' ? 'text-red-500' : 'text-blue-400'}`}>{item.status}</p>
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