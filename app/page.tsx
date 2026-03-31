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

export default function Home() {
  const [myId, setMyId] = useState<'iPhone1' | 'iPhone2' | null>(null);
  const [appState, setAppState] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [statusColor, setStatusColor] = useState('text-yellow-400');
  const [customMsg, setCustomMsg] = useState('');
  const [replyMsg, setReplyMsg] = useState(''); 
  const [history, setHistory] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  // CHAT STATES
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. INITIAL SETUP & ZOOM FIX
  useEffect(() => {
    setMounted(true);
    const savedId = localStorage.getItem('myDeviceId') as 'iPhone1' | 'iPhone2';
    if (savedId) setMyId(savedId);
    
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0';
    document.getElementsByTagName('head')[0].appendChild(meta);
  }, []);

  // 2. REAL-TIME PING LISTENER
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
        // TRIGGERED ON CANCEL
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

  // 3. CHAT & HISTORY LISTENERS
  useEffect(() => {
    if (!mounted) return;
    const twentyFourHoursAgo = new Date(Date.now() - 86400000);
    
    // Messages
    const qChat = query(
      collection(db, "messages"),
      where("timestamp", ">=", Timestamp.fromDate(twentyFourHoursAgo)),
      orderBy("timestamp", "desc")
    );
    const unsubChat = onSnapshot(qChat, (snap) => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // History
    const qHist = query(collection(db, "history"), orderBy("timestamp", "desc"), limit(5));
    const unsubHist = onSnapshot(qHist, (snap) => {
      setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubChat(); unsubHist(); };
  }, [mounted]);

  // 4. CORE FUNCTIONS
  const sendPing = async () => {
    const msg = customMsg.trim() || "🔔";
    setCustomMsg('');
    const timestamp = Timestamp.now();
    
    await setDoc(doc(db, "notifications", "current"), { 
      message: msg, sender: myId, status: 'pending', timestamp 
    });
    await setDoc(doc(collection(db, "history")), { 
      message: msg, sender: myId, status: 'pending', timestamp 
    });
  };

  const cancelPing = async () => {
    // OPTIMISTIC RESET: Clear UI instantly
    setAppState(null);
    setStatus('CANCELED 🚫');
    setStatusColor('text-red-500');

    try {
      const q = query(collection(db, "history"), where("status", "==", "pending"), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, "history", snap.docs[0].id), { status: "CANCELED" });
      }
      await deleteDoc(doc(db, "notifications", "current"));
    } catch (e) { console.error(e); }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput;
    setChatInput('');
    await setDoc(doc(collection(db, "messages")), {
      text, senderId: myId, timestamp: Timestamp.now(), seen: false
    });
  };

  // 5. RENDER LOGIC
  if (!mounted) return <div className="min-h-screen bg-black" />;
  if (!myId) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-6 p-6">
       <button onClick={() => setMyId('iPhone1')} className="w-full max-w-xs border-2 border-white/10 py-6 rounded-3xl font-black italic text-xl text-white">iPhone 1</button>
       <button onClick={() => setMyId('iPhone2')} className="w-full max-w-xs border-2 border-white/10 py-6 rounded-3xl font-black italic text-xl text-white">iPhone 2</button>
    </div>
  );

  const isIBeingPinged = appState?.status === 'pending' && appState?.sender !== myId;
  const amIWaiting = appState?.status === 'pending' && appState?.sender === myId;
  const unreadCount = messages.filter(msg => msg.senderId !== myId && !msg.seen).length;

  return (
    <div className={`flex flex-col bg-black text-white relative ${isChatOpen ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'}`}>
      <style jsx global>{`
        ::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        input { font-size: 16px !important; }
      `}</style>

      {/* HEADER */}
      <div className="absolute top-0 left-0 w-full z-50 pt-10 px-4 pointer-events-none">
          <button onClick={() => setIsChatOpen(!isChatOpen)} className="pointer-events-auto opacity-100 transition-all active:scale-90 flex items-center relative">
            {isChatOpen ? (
              <span className="text-blue-500 font-black italic text-[11px] tracking-widest uppercase py-2 pr-4 bg-black/60 rounded-full backdrop-blur-md">〈 Back</span>
            ) : (
              <div className="relative p-2 bg-black/40 rounded-full backdrop-blur-md">
                <span className="text-2xl">💬</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-black">
                    {unreadCount}
                  </span>
                )}
              </div>
            )}
          </button>
      </div>

      {isChatOpen ? (
        /* CHAT VIEW */
        <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
          <div className="flex-grow overflow-y-auto px-4 space-y-2 pt-24 pb-4 flex flex-col-reverse">
            <div ref={scrollRef} />
            {messages.map((msg, idx) => {
              const isMine = msg.senderId === myId;
              return (
                <div key={idx} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-2 rounded-[20px] text-[15px] font-medium ${isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[#262629] text-white rounded-bl-none'}`}>{msg.text}</div>
                </div>
              );
            })}
          </div>
          <div className="w-full bg-[#121212]/90 backdrop-blur-2xl border-t border-white/10 px-4 py-3 pb-10">
            <div className="relative flex items-center bg-[#1c1c1e] rounded-full border border-white/10 pr-2">
              <input type="text" placeholder="iMessage" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                className="w-full bg-transparent py-3 px-4 text-sm focus:outline-none placeholder:text-zinc-600"
              />
              <button onClick={sendChatMessage} className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 active:scale-90 transition-all"><span className="text-white text-lg font-bold">↑</span></button>
            </div>
          </div>
        </div>
      ) : (
        /* PING VIEW */
        <div className="flex flex-col px-6 pb-20 pt-16">
          <div className="flex flex-col items-center justify-center py-20 min-h-[60vh]">
            {isIBeingPinged ? (
              <div className="w-full max-w-xs space-y-8 animate-in zoom-in duration-300 text-center">
                <p className="text-3xl font-black tracking-tighter italic uppercase">{appState.message}</p>
                <input type="text" placeholder="REPLY..." value={replyMsg} onChange={(e) => setReplyMsg(e.target.value)} className="w-full bg-transparent border-b border-white/40 px-2 py-3 text-center focus:outline-none text-lg font-black uppercase italic" />
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setReplyMsg('')} className="bg-[#22c55e] text-black py-5 rounded-3xl font-black uppercase italic">Yes</button>
                  <button onClick={() => setReplyMsg('')} className="bg-[#ef4444] text-black py-5 rounded-3xl font-black uppercase italic">No</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-12">
                <input disabled={amIWaiting} type="text" placeholder="MESSAGE..." value={customMsg} onChange={(e) => setCustomMsg(e.target.value)} className="w-full bg-transparent border-b border-white/20 py-4 text-center focus:outline-none text-2xl font-black uppercase italic placeholder:text-zinc-800" />
                <div className="flex flex-col items-center gap-4">
                  <button disabled={amIWaiting} onClick={sendPing} className={`w-64 h-64 rounded-full text-5xl font-black uppercase italic transition-all active:scale-90 ${amIWaiting ? 'bg-zinc-900 text-zinc-700' : 'bg-green-600 shadow-[0_0_80px_rgba(34,197,94,0.4)]'}`}>
                    {amIWaiting ? '...' : 'PUSH'}
                  </button>
                  {amIWaiting && <button onClick={cancelPing} className="text-red-500 font-black italic uppercase text-xs tracking-[0.2em] pt-4">Cancel Ping</button>}
                </div>
                <p className={`font-black text-2xl uppercase italic h-8 ${statusColor}`}>{status}</p>
              </div>
            )}
          </div>

          <div className="w-full max-w-sm mx-auto bg-zinc-900/40 rounded-3xl p-6 border border-white/5 text-left mb-10">
            <h2 className="text-[10px] uppercase text-gray-600 mb-4 font-black italic">History</h2>
            <div className="space-y-4">
              {history.map((item, i) => (
                <div key={i} className="flex justify-between items-start text-xs border-b border-white/5 pb-2">
                  <div className="flex flex-col">
                    <span className={`text-[8px] font-black uppercase italic ${item.status === 'CANCELED' ? 'text-red-500' : 'text-blue-500'}`}>{item.status}</span>
                    <p className="text-gray-400 font-mono">{item.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-400 italic mb-1">"{item.message}"</p>
                    <p className={`font-black uppercase text-[10px] italic ${item.status === 'yes' ? 'text-green-500' : item.status === 'no' || item.status === 'CANCELED' ? 'text-red-500' : 'text-blue-400'}`}>{item.status}</p>
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