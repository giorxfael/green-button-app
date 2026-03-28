'use client';
import { useState, useEffect, useRef } from 'react';
import { db, getMessagingInstance } from '../lib/firebase';
import { doc, setDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';

export default function Home() {
  const [role, setRole] = useState<'sender' | 'receiver' | null>(null);
  const [status, setStatus] = useState('');
  const [customMsg, setCustomMsg] = useState(''); 
  const [incomingMsg, setIncomingMsg] = useState<string | null>(null);
  const [responseTime, setResponseTime] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pendingDocId, setPendingDocId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  
  const sessionStart = useRef(new Date().getTime());

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get('role') as 'sender' | 'receiver';
    setRole(urlRole || 'sender');
    setIsRegistered(localStorage.getItem('isRegistered') === 'true');
  }, []);

  // 1. REVERSE STREAK LOGIC
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
    if (hours >= 5) emoji = "📴";
    if (days >= 1) emoji = "🏆";
    if (days >= 3) emoji = "♾️";

    const timeStr = days > 0 ? `${days}d ${hours % 24}h` : `${hours}h ${minutes}m`;
    return { time: timeStr, emoji };
  };

  const streak = getQuietStreak();

  // 2. MAIN REAL-TIME LISTENER
  useEffect(() => {
    if (!mounted || !role) return;

    const unsubscribe = onSnapshot(doc(db, "notifications", "current"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const now = new Date().getTime();
        const timeOfPing = data.timestamp?.toDate().getTime() || 0;
        const timeOfResponse = data.respondedAt?.toDate().getTime() || 0;

        const isPingFresh = (now - timeOfPing) < 120000;
        const isResponseFresh = (now - timeOfResponse) < 60000;
        const isResponseFromThisSession = timeOfResponse > sessionStart.current;

        if (role === 'receiver') {
          if (data.status === "pending" && isPingFresh) {
            setPendingDocId("current");
            setIncomingMsg(data.message || "Ping!");
            setStatus(""); 
          } else {
            setPendingDocId(null);
            setStatus(isRegistered ? "Standing by..." : "");
          }
        } else {
          if ((data.status === "yes" || data.status === "no") && isResponseFresh && isResponseFromThisSession) {
            const timeStr = data.respondedAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setResponseTime(timeStr);
            setStatus(data.status === 'yes' ? "Yes I'm all yours! ✅" : "HELL NO ❌");
          } else if (data.status === "pending" && isPingFresh) {
            setResponseTime(null);
            setStatus('Waiting... ⏳');
          }
        }
      }
    });
    return () => unsubscribe();
  }, [mounted, role, isRegistered]);

  // 3. HISTORY LISTENER
  useEffect(() => {
    if (!mounted) return;
    const q = query(collection(db, "history"), orderBy("timestamp", "desc"), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(items);
    });
    return () => unsubscribe();
  }, [mounted]);

  if (!mounted || !role) return <div className="min-h-screen bg-black" />;

  const handleResponse = async (answer: 'yes' | 'no') => {
    try {
      setStatus("Sending...");
      const res = await fetch('/api/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer })
      });
      if (res.ok) {
        setPendingDocId(null);
        setStatus("Sent! ✅");
      }
    } catch (e) { setStatus("Error."); }
  };

  const sendPing = async () => {
    if (status.includes('Waiting')) return;
    setResponseTime(null);
    setStatus('Sending...');
    const res = await fetch('/api/notify', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: customMsg || "🔔" }) 
    });
    if (res.ok) setCustomMsg(''); 
    else setStatus('Failed.');
  };

  const registerAsReceiver = async () => {
    setStatus('Activating...');
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const token = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY });
      await setDoc(doc(db, "tokens", "receiver"), { token: token, lastUpdated: new Date() });
      localStorage.setItem('isRegistered', 'true');
      setIsRegistered(true);
      setStatus('Ready ✅');
    } catch (e) { setStatus('Failed.'); }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-black text-white p-6 text-center overflow-x-hidden relative">
      
      {/* TOP RIGHT QUIET STREAK */}
      {role === 'sender' && (
        <div className="absolute top-8 right-8 flex flex-col items-end animate-in fade-in slide-in-from-right duration-700">
          <span className="text-4xl mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            {streak.emoji}
          </span>
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-zinc-600 uppercase tracking-[0.3em] font-black">Quiet Time</span>
            <span className="text-xs font-mono text-zinc-400 tabular-nums">
              {streak.time}
            </span>
          </div>
        </div>
      )}

      <div className="relative flex-grow flex items-center justify-center w-full">
        {role === 'receiver' ? (
          <div className="w-full max-w-xs z-10">
            {pendingDocId ? (
              <div className="space-y-8">
                <div className="flex flex-col items-center justify-center min-h-[200px] px-4">
                  {incomingMsg && [...incomingMsg].length <= 2 ? (
                    <div className="text-9xl animate-bounce drop-shadow-[0_0_35px_rgba(255,255,255,0.3)]">
                      {incomingMsg}
                    </div>
                  ) : (
                    <div className="animate-in fade-in zoom-in duration-500">
                      <span className="text-zinc-500 text-[10px] uppercase tracking-[0.4em] font-black mb-2 block">Incoming</span>
                      <p className="text-3xl font-black tracking-tighter leading-none text-white uppercase italic">
                        {incomingMsg}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button onClick={() => handleResponse('yes')} className="bg-transparent border-2 border-green-500 text-green-500 py-6 rounded-[2rem] text-2xl font-black active:scale-95 transition-all shadow-[0_0_15px_rgba(34,197,94,0.15)]">YES</button>
                  <button onClick={() => handleResponse('no')} className="bg-transparent border-2 border-red-500 text-red-500 py-6 rounded-[2rem] text-2xl font-black active:scale-95 transition-all shadow-[0_0_15px_rgba(239,68,68,0.15)]">NO</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {!isRegistered && (
                  <button onClick={registerAsReceiver} className="bg-blue-600 px-8 py-4 rounded-2xl font-bold mb-4">Activate</button>
                )}
                <p className="text-zinc-700 text-[10px] uppercase tracking-[0.5em] font-black">{status || "Standby"}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            {/* MINIMALIST GLASS INPUT */}
            <div className="relative mb-10 w-72">
              <input 
                type="text" 
                placeholder="MESSAGE..." 
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                className="w-full bg-transparent border-b border-white/20 px-2 py-4 text-center focus:outline-none focus:border-green-500 transition-all text-xl font-black tracking-[0.2em] placeholder:text-zinc-800 placeholder:font-black uppercase italic"
              />
              <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            </div>

            <div className="w-64 h-64 flex items-center justify-center">
               <button 
                 onClick={sendPing} 
                 className="w-full h-full rounded-full bg-green-600 shadow-[0_0_60px_rgba(34,197,94,0.5)] active:scale-90 flex items-center justify-center text-4xl font-black uppercase tracking-tighter transition-all"
               >
                 {customMsg ? 'SEND' : 'PUSH'}
               </button>
            </div>

            <div className="h-32 flex flex-col items-center justify-center mt-6">
              <p className={`font-black text-2xl uppercase italic tracking-tighter transition-all duration-300 ${status.includes('yours') ? 'text-green-400' : status.includes('HELL') ? 'text-red-400' : 'text-yellow-400'}`}>
                {status}
              </p>
              {responseTime && (
                <p className="text-zinc-600 font-mono text-[10px] mt-2 uppercase tracking-[0.3em] font-black italic">
                  Confirmed {responseTime}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-sm mt-8 bg-zinc-900/40 rounded-3xl p-6 border border-white/5 backdrop-blur-md mb-4">
        <h2 className="text-[10px] uppercase tracking-[0.3em] text-gray-600 mb-4 font-black text-left ml-2 italic">History</h2>
        <div className="space-y-4 text-left">
          {history.map((item) => {
            const timeToDisplay = item.respondedAt ? item.respondedAt.toDate() : item.timestamp?.toDate();
            const label = item.respondedAt ? "PICKED" : "SENT";
            return (
              <div key={item.id} className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                <div className="flex flex-col">
                  <span className={`text-[8px] font-black uppercase ${item.respondedAt ? 'text-blue-500' : 'text-gray-700'}`}>{label}</span>
                  <span className="text-gray-400 font-mono">{timeToDisplay?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-600 italic max-w-[80px] truncate">{item.message}</span>
                  <span className={`font-black uppercase text-sm ${item.status === 'yes' ? 'text-green-500' : item.status === 'no' ? 'text-red-500' : 'text-gray-800'}`}>
                    {item.status === 'yes' ? "YES" : item.status === 'no' ? "NO" : "..."}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}