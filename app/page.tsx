'use client';
import { useState, useEffect, useRef } from 'react';
import { db, getMessagingInstance } from '../lib/firebase';
import { doc, setDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';

export default function Home() {
  const [myId, setMyId] = useState<'iPhone1' | 'iPhone2' | null>(null);
  const [appState, setAppState] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [customMsg, setCustomMsg] = useState('');
  const [responseTime, setResponseTime] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const sessionStart = useRef(new Date().getTime());

  useEffect(() => {
    setMounted(true);
    const savedId = localStorage.getItem('myDeviceId') as 'iPhone1' | 'iPhone2';
    if (savedId) setMyId(savedId);
    setIsRegistered(localStorage.getItem('isRegistered') === 'true');
  }, []);

  // 1. SHARED STREAK LOGIC
  const getQuietStreak = () => {
    if (history.length === 0) return { time: "0h 0m", emoji: "🆕" };
    const lastPing = history.find(item => item.timestamp)?.timestamp?.toDate();
    if (!lastPing) return { time: "0h 0m", emoji: "🐣" };
    const diffInMs = new Date().getTime() - lastPing.getTime();
    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffInMs / (1000 * 60)) % 60);
    const days = Math.floor(hours / 24);
    let emoji = "🤫"; 
    if (hours >= 1) emoji = "🧘";
    if (days >= 1) emoji = "🏆";
    return { time: days > 0 ? `${days}d ${hours % 24}h` : `${hours}h ${minutes}m`, emoji };
  };

  const streak = getQuietStreak();

  // 2. SYNC GLOBAL STATE
  useEffect(() => {
    if (!mounted || !myId) return;
    const unsubscribe = onSnapshot(doc(db, "notifications", "current"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAppState(data);
        const timeOfResponse = data.respondedAt?.toDate().getTime() || 0;
        if (timeOfResponse > sessionStart.current && (data.status === 'yes' || data.status === 'no')) {
          const timeStr = data.respondedAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setResponseTime(timeStr);
          setStatus(data.status === 'yes' ? "YES! ✅" : "NO ❌");
        } else if (data.status === 'pending' && data.sender === myId) {
          setStatus('Waiting... ⏳');
        } else {
          setStatus('');
        }
      }
    });
    return () => unsubscribe();
  }, [mounted, myId]);

  // 3. SYNC HISTORY
  useEffect(() => {
    if (!mounted) return;
    const q = query(collection(db, "history"), orderBy("timestamp", "desc"), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [mounted]);

  const sendPing = async () => {
    setStatus('Sending...');
    const res = await fetch('/api/notify', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: customMsg || "🔔", senderId: myId }) 
    });
    if (res.status === 409) setStatus('Too slow! 💨');
    else if (res.ok) { setCustomMsg(''); setStatus('Waiting... ⏳'); }
  };

  const handleResponse = async (answer: 'yes' | 'no') => {
    setStatus("Sending...");
    await fetch('/api/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer })
    });
    setStatus("");
  };

  const register = async (id: 'iPhone1' | 'iPhone2') => {
    setMyId(id);
    localStorage.setItem('myDeviceId', id);
    const messaging = await getMessagingInstance();
    if (!messaging) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const token = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY });
    await setDoc(doc(db, "tokens", id), { token });
    localStorage.setItem('isRegistered', 'true');
    setIsRegistered(true);
  };

  if (!mounted) return <div className="min-h-screen bg-black" />;

  // SELECTION SCREEN
  if (!myId) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-6 p-6">
       <span className="text-zinc-600 text-[10px] uppercase tracking-[0.5em] font-black italic">Identity</span>
       <button onClick={() => register('iPhone1')} className="w-full max-w-xs border-2 border-white/10 py-6 rounded-3xl font-black italic text-xl text-white">IPHONE 1</button>
       <button onClick={() => register('iPhone2')} className="w-full max-w-xs border-2 border-white/10 py-6 rounded-3xl font-black italic text-xl text-white">IPHONE 2</button>
    </div>
  );

  const isIBeingPinged = appState?.status === 'pending' && appState?.sender !== myId;
  const amIWaiting = appState?.status === 'pending' && appState?.sender === myId;

  return (
    <div className="flex flex-col items-center min-h-screen bg-black text-white p-6 text-center overflow-x-hidden relative">
      
      {/* 1. TOP INTERACTION ZONE (UNIFIED) */}
      <div className="relative flex-grow flex items-center justify-center w-full">
        {isIBeingPinged ? (
          <div className="w-full max-w-xs z-10 space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="flex flex-col items-center justify-center min-h-[200px] px-4">
              {appState.message && [...appState.message].length <= 2 ? (
                <div className="text-9xl animate-bounce drop-shadow-[0_0_35px_rgba(255,255,255,0.3)]">{appState.message}</div>
              ) : (
                <div className="animate-in fade-in zoom-in duration-500">
                  <span className="text-zinc-500 text-[10px] uppercase tracking-[0.4em] font-black mb-2 block italic tracking-[0.3em]">Incoming</span>
                  <p className="text-3xl font-black tracking-tighter leading-none text-white uppercase italic">{appState.message}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <button onClick={() => handleResponse('yes')} className="bg-transparent border-2 border-green-500 text-green-500 py-6 rounded-[2rem] text-2xl font-black active:scale-95 transition-all">YES</button>
              <button onClick={() => handleResponse('no')} className="bg-transparent border-2 border-red-500 text-red-500 py-6 rounded-[2rem] text-2xl font-black active:scale-95 transition-all">NO</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="relative mb-10 w-72">
              <input 
                disabled={amIWaiting}
                type="text" placeholder="MESSAGE..." value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                className="w-full bg-transparent border-b border-white/20 px-2 py-4 text-center focus:outline-none focus:border-green-500 transition-all text-xl font-black tracking-[0.2em] placeholder:text-zinc-800 placeholder:font-black uppercase italic"
              />
            </div>
            <div className="w-64 h-64 flex items-center justify-center">
               <button 
                 disabled={amIWaiting}
                 onClick={sendPing} 
                 className={`w-full h-full rounded-full text-4xl font-black uppercase tracking-tighter transition-all ${amIWaiting ? 'bg-zinc-900 text-zinc-700' : 'bg-green-600 shadow-[0_0_60px_rgba(34,197,94,0.5)] active:scale-90'}`}
               >
                 {amIWaiting ? '...' : (customMsg ? 'SEND' : 'PUSH')}
               </button>
            </div>
            <div className="h-32 flex flex-col items-center justify-center mt-6">
              <p className={`font-black text-2xl uppercase italic tracking-tighter transition-all duration-300 ${status.includes('yours') ? 'text-green-400' : status.includes('HELL') ? 'text-red-400' : 'text-yellow-400'}`}>{status}</p>
              {responseTime && <p className="text-zinc-600 font-mono text-[10px] mt-2 uppercase tracking-[0.3em] font-black italic">Confirmed {responseTime}</p>}
            </div>
          </div>
        )}
      </div>

      {/* 2. SHARED STATS & HISTORY (UNIFIED) */}
      <div className="w-full max-w-sm flex items-center justify-between px-6 mb-4 opacity-60">
        <div className="flex flex-col items-start text-left">
          <span className="text-[8px] text-zinc-500 uppercase tracking-[0.3em] font-black leading-none mb-1 italic">Quiet Streak</span>
          <span className="text-sm font-mono text-zinc-300 tabular-nums font-bold">{streak.time}</span>
        </div>
        <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{streak.emoji}</span>
      </div>

      <div className="w-full max-w-sm bg-zinc-900/40 rounded-3xl p-6 border border-white/5 backdrop-blur-md mb-6 text-left">
        <h2 className="text-[10px] uppercase tracking-[0.3em] text-gray-600 mb-4 font-black ml-2 italic">History</h2>
        <div className="space-y-4">
          {history.map((item) => (
            <div key={item.id} className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
              <div className="flex flex-col">
                <span className={`text-[8px] font-black uppercase ${item.status !== 'pending' ? 'text-blue-500' : 'text-zinc-800'}`}>{item.status !== 'pending' ? "PICKED" : "SENT"}</span>
                <span className="text-gray-400 font-mono">{item.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-600 italic max-w-[80px] truncate">{item.message}</span>
                <span className={`font-black uppercase text-sm italic ${item.status === 'yes' ? 'text-green-500' : item.status === 'no' ? 'text-red-500' : 'text-zinc-800'}`}>
                  {item.status === 'yes' ? "YES" : item.status === 'no' ? "NO" : "..."}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}