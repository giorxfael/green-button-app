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
  updateDoc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { getToken } from 'firebase/messaging';

// --- UPDATED HEADER COMPONENT ---
export function Header({ isChatOpen, setIsChatOpen, myId }: any) { 
  const [unreadCount, setUnreadCount] = useState(0); 

  useEffect(() => { 
    if (!myId) return; 
    const twentyFourHoursAgo = new Date(Date.now() - 86400000); 
    const q = query( 
      collection(db, "messages"), 
      where("timestamp", ">=", Timestamp.fromDate(twentyFourHoursAgo)), 
      where("senderId", "!=", myId) 
    ); 

    return onSnapshot(q, (snap) => { 
      const unread = snap.docs.filter(d => !d.data().seen).length; 
      setUnreadCount(unread); 
    }); 
  }, [myId]); 

  // iMessage Style Chat Header
  if (isChatOpen) {
    const otherPhone = myId === 'iPhone1' ? 'iPhone 2' : 'iPhone 1';
    
    return (
      // Changed from 'fixed' to 'absolute' so iOS keyboard doesn't push it off screen
      <div className="absolute top-0 left-0 w-full z-50 bg-[#121212]/85 backdrop-blur-xl border-b border-white/10 pt-12 pb-3 px-4 flex items-center justify-between">
        <button 
          onClick={() => setIsChatOpen(false)} 
          className="flex items-center text-[#0a84ff] active:opacity-50 transition-opacity"
        >
          <span className="text-4xl leading-none -mt-1 font-light pr-1">‹</span>
          <span className="text-[17px] font-normal pt-1">{unreadCount > 0 ? unreadCount : ''}</span>
        </button>
        
        {/* Center Contact Info (Avatar removed) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-[13px] font-semibold text-white tracking-wide">{otherPhone}</span>
        </div>
        
        {/* Invisible spacer to keep flexbox perfectly centered */}
        <div className="w-10"></div> 
      </div>
    );
  }

  // Original Ping View Floating Bubble
  return ( 
    <div className="absolute top-0 left-0 w-full z-50 pt-10 px-4 pointer-events-none"> 
      <button  
        onClick={() => setIsChatOpen(true)}  
        className="pointer-events-auto opacity-100 transition-all active:scale-90 flex items-center relative" 
      > 
        <div className="relative p-2 bg-black/40 rounded-full backdrop-blur-md"> 
          <span className="text-2xl">💬</span> 
          {unreadCount > 0 && ( 
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-black"> 
              {unreadCount} 
            </span> 
          )} 
        </div> 
      </button> 
    </div> 
  ); 
}
// --- END HEADER COMPONENT ---


// --- YOUR UNTOUCHED HOME COMPONENT ---
export default function Home() {
  const [myId, setMyId] = useState<'iPhone1' | 'iPhone2' | null>(null);
  const [appState, setAppState] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [statusColor, setStatusColor] = useState('text-yellow-400');
  const [customMsg, setCustomMsg] = useState('');
  const [replyMsg, setReplyMsg] = useState(''); 
  const [history, setHistory] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  // SWIPE STATE
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStart = useRef(0);

  // CHAT STATES
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const sessionStart = useRef(new Date().getTime());

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0';
    document.getElementsByTagName('head')[0].appendChild(meta);
  }, []);

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
          setStatusColor('text-yellow-400');
        } else {
          setStatus('');
        }
      } else {
        if (appState?.status === 'pending') {
          setStatus('CANCELED 🚫');
          setStatusColor('text-red-500');
          setTimeout(() => {
            setStatus('');
            setStatusColor('text-yellow-400');
          }, 3000);
        }
        setAppState(null);
      }
    });
    return () => unsubscribe();
  }, [mounted, myId, appState]);

  // 2. CHAT LISTENER
  useEffect(() => {
    if (!mounted) return;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, "messages"),
      where("timestamp", ">=", Timestamp.fromDate(twentyFourHoursAgo)),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [mounted]);

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

  const cancelPing = async () => {
    const q = query(collection(db, "history"), where("status", "==", "pending"), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      await updateDoc(doc(db, "history", querySnapshot.docs[0].id), { status: "CANCELED" });
    }
    await deleteDoc(doc(db, "notifications", "current"));
  };

  const deleteHistoryItem = async (id: string) => {
    await deleteDoc(doc(db, "history", id));
    setSwipedId(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    const touchEnd = e.targetTouches[0].clientX;
    if (touchStart.current - touchEnd > 50) {
      setSwipedId(id);
    } else if (touchEnd - touchStart.current > 50) {
      setSwipedId(null);
    }
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-6 p-6 font-black italic">
       <button onClick={() => register('iPhone1')} className="w-full max-w-xs border-2 border-white/10 py-6 rounded-3xl text-xl text-white uppercase tracking-tighter">iPhone 1</button>
       <button onClick={() => register('iPhone2')} className="w-full max-w-xs border-2 border-white/10 py-6 rounded-3xl text-xl text-white uppercase tracking-tighter">iPhone 2</button>
    </div>
  );

  const isIBeingPinged = appState?.status === 'pending' && appState?.sender !== myId;
  const amIWaiting = appState?.status === 'pending' && appState?.sender === myId;

  return (
    <div className={`flex flex-col bg-black text-white relative ${isChatOpen ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'}`}>
      
      <style jsx global>{`
        ::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        input { font-size: 16px !important; }
      `}</style>

      {/* HEADER COMPONENT */}
      <Header isChatOpen={isChatOpen} setIsChatOpen={setIsChatOpen} myId={myId} />

      {isChatOpen ? (
        /* CHAT VIEW */
        <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
          <div className="flex-grow overflow-y-auto px-4 space-y-2 pt-24 pb-4 flex flex-col-reverse">
            <div ref={scrollRef} />
            {messages.filter(msg => msg.text?.trim()).map((msg, idx) => {
              const isMine = msg.senderId === myId;
              const isLatest = idx === 0;
              return (
                <div key={msg.id} className="flex flex-col w-full py-0.5">
                  <div className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2 rounded-[20px] text-[15px] font-medium ${isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[#262629] text-white rounded-bl-none'}`}>{msg.text}</div>
                  </div>
                  {isMine && isLatest && (
                    <span className="text-[10px] text-zinc-500 font-bold mt-1 pr-1 text-right animate-in fade-in duration-300">
                      {msg.seen ? 'Read' : 'Delivered'}
                    </span>
                  )}
                </div>
              );
            })}
             <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest py-4 text-center">Messages expire in 24h</p>
          </div>
          <div className="w-full bg-[#121212]/90 backdrop-blur-2xl border-t border-white/10 px-4 py-3 pb-10">
            <div className="relative flex items-center bg-[#1c1c1e] rounded-full border border-white/10 pr-2">
              <input 
                type="text" 
                placeholder="iMessage" 
                autoFocus 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="w-full bg-transparent py-3 px-4 text-sm focus:outline-none placeholder:text-zinc-600"
              />
              <button onClick={sendChatMessage} disabled={!chatInput.trim()} className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 active:scale-90 transition-all"><span className="text-white text-lg font-bold">↑</span></button>
            </div>
          </div>
        </div>
      ) : (
        /* PING VIEW */
        <div className="flex flex-col px-6 pb-20 pt-16">
          <div className="flex flex-col items-center justify-center py-20 min-h-[60vh]">
            {isIBeingPinged ? (
              <div className="w-full max-w-xs space-y-8 animate-in fade-in zoom-in duration-500 text-center">
                <p className="text-3xl font-black tracking-tighter italic uppercase">{appState.message}</p>
                <div className="relative w-full">
                  <input type="text" placeholder="REPLY..." value={replyMsg} onChange={(e) => setReplyMsg(e.target.value)}
                    className="w-full bg-transparent border-b border-white/40 px-2 py-3 text-center focus:outline-none text-lg font-black uppercase italic"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => replyMsg ? handleResponse('text') : handleResponse('yes')} className="bg-[#22c55e] text-black py-5 rounded-3xl font-black uppercase italic active:scale-95 transition-all">Yes</button>
                  <button onClick={() => replyMsg ? setReplyMsg('') : handleResponse('no')} className="bg-[#ef4444] text-black py-5 rounded-3xl font-black uppercase italic active:scale-95 transition-all">No</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-12">
                <div className="relative w-72">
                  <input disabled={amIWaiting} type="text" placeholder="MESSAGE..." value={customMsg} onChange={(e) => setCustomMsg(e.target.value)}
                    className="w-full bg-transparent border-b border-white/20 py-4 text-center focus:outline-none focus:border-green-500 text-2xl font-black uppercase italic placeholder:text-zinc-800"
                  />
                </div>
                <div className="flex flex-col items-center gap-4">
                  <button disabled={amIWaiting} onClick={sendPing} 
                    className={`w-64 h-64 rounded-full text-5xl font-black uppercase italic transition-all active:scale-90 ${amIWaiting ? 'bg-zinc-900 text-zinc-700' : 'bg-green-600 shadow-[0_0_80px_rgba(34,197,94,0.4)]'}`}
                  >{amIWaiting ? '...' : 'PUSH'}</button>
                  
                  {amIWaiting && (
                    <button onClick={cancelPing} className="text-red-500 font-black italic uppercase text-xs tracking-[0.2em] pt-4 active:opacity-50 transition-opacity">
                      Cancel Ping
                    </button>
                  )}
                </div>
                <p className={`font-black text-2xl uppercase italic h-8 ${statusColor}`}>{status}</p>
              </div>
            )}
          </div>

          {/* STREAK */}
          <div className="w-full max-w-sm mx-auto flex items-center justify-between px-6 mb-8 opacity-60">
            <div className="flex flex-col items-start text-left">
              <span className="text-[8px] text-zinc-500 uppercase font-black italic tracking-widest mb-1">Quiet Streak</span>
              <span className="text-sm font-mono text-zinc-300 font-bold tabular-nums">{streak.time}</span>
            </div>
            <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{streak.emoji}</span>
          </div>

          {/* ACTIVITY WITH SWIPE DELETE */}
          <div className="w-full max-w-sm mx-auto bg-zinc-900/40 rounded-3xl overflow-hidden border border-white/5 text-left mb-10">
            <h2 className="text-[10px] uppercase text-gray-600 p-6 pb-4 font-black italic tracking-widest">History</h2>
            <div className="divide-y divide-white/5">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  className="relative overflow-hidden bg-transparent touch-pan-x"
                  onTouchStart={handleTouchStart}
                  onTouchMove={(e) => handleTouchMove(e, item.id)}
                >
                  <div 
                    className={`flex justify-between items-start p-6 text-xs transition-transform duration-300 ${swipedId === item.id ? '-translate-x-20' : 'translate-x-0'}`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-[8px] font-black uppercase italic ${item.status === 'CANCELED' ? 'text-red-500' : 'text-blue-500'}`}>
                        {item.status !== 'pending' && item.status !== 'CANCELED' ? "PICKED" : item.status}
                      </span>
                      <p className="text-gray-400 font-mono">{item.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-400 italic mb-1">"{item.message}"</p>
                      <p className={`font-black uppercase text-[10px] italic ${item.status === 'yes' ? 'text-green-500' : item.status === 'no' || item.status === 'CANCELED' ? 'text-red-500' : 'text-blue-400'}`}>{item.status}</p>
                    </div>
                  </div>
                  
                  {/* DELETE BUTTON */}
                  <button 
                    onClick={() => deleteHistoryItem(item.id)}
                    className={`absolute top-0 right-0 h-full w-20 bg-red-600 text-white font-black italic text-[10px] uppercase transition-opacity duration-300 ${swipedId === item.id ? 'opacity-100' : 'opacity-0'}`}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}