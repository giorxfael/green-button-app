'use client';
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, collection, query, orderBy, limit, where, Timestamp, updateDoc, deleteDoc, getDocs, setDoc, addDoc } from 'firebase/firestore';

export default function PingView({ myId }: { myId: string }) {
  const [appState, setAppState] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [statusColor, setStatusColor] = useState('text-yellow-400');
  const [customMsg, setCustomMsg] = useState('');
  const [replyMsg, setReplyMsg] = useState('');
  const [swipedId, setSwipedId] = useState<string | null>(null);

  // LISTENERS
  useEffect(() => {
    const unsubPing = onSnapshot(doc(db, "notifications", "current"), (docSnap) => {
      if (docSnap.exists()) {
        setAppState(docSnap.data());
        if (docSnap.data().status === 'pending' && docSnap.data().sender === myId) {
          setStatus('Waiting... ⏳');
          setStatusColor('text-yellow-400');
        } else { setStatus(''); }
      } else {
        if (appState?.status === 'pending') {
          setStatus('CANCELED 🚫'); setStatusColor('text-red-500');
          setTimeout(() => { setStatus(''); setStatusColor('text-yellow-400'); }, 3000);
        }
        setAppState(null);
      }
    });

    const q = query(collection(db, "history"), orderBy("timestamp", "desc"), limit(5));
    const unsubHist = onSnapshot(q, (snap) => setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubPing(); unsubHist(); };
  }, [myId, appState]);

  const sendPing = async () => {
    const msg = customMsg || "🔔";
    setCustomMsg('');
    await setDoc(doc(db, "notifications", "current"), { message: msg, sender: myId, status: "pending", timestamp: Timestamp.now() });
    await addDoc(collection(db, "history"), { message: msg, sender: myId, status: "pending", timestamp: Timestamp.now() });
  };

  const cancelPing = async () => {
    const q = query(collection(db, "history"), where("status", "==", "pending"), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) await updateDoc(doc(db, "history", snap.docs[0].id), { status: "CANCELED" });
    await deleteDoc(doc(db, "notifications", "current"));
  };

  const handleResponse = async (answer: string) => {
    await fetch('/api/respond', { method: 'POST', body: JSON.stringify({ answer, textResponse: answer === 'replied' ? replyMsg : null }) });
    setReplyMsg('');
  };

  const streak = (() => {
    const last = history.find(i => i.timestamp)?.timestamp?.toDate();
    if (!last) return { time: "0h 0m", emoji: "🆕" };
    const diff = new Date().getTime() - last.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff / 60000) % 60);
    return { time: `${h}h ${m}m`, emoji: h >= 1 ? "🧘" : "🤫" };
  })();

  const isIBeingPinged = appState?.status === 'pending' && appState?.sender !== myId;
  const amIWaiting = appState?.status === 'pending' && appState?.sender === myId;

  return (
    <div className="flex flex-col px-6 pb-20 pt-16 animate-in fade-in duration-500">
      <div className="flex flex-col items-center justify-center py-20 min-h-[60vh]">
        {isIBeingPinged ? (
          <div className="w-full max-w-xs space-y-8 text-center">
            <p className="text-3xl font-black tracking-tighter italic uppercase">{appState.message}</p>
            <input type="text" placeholder="REPLY..." value={replyMsg} onChange={(e) => setReplyMsg(e.target.value)} className="w-full bg-transparent border-b border-white/40 px-2 py-3 text-center focus:outline-none text-lg font-black uppercase italic" />
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleResponse(replyMsg ? 'replied' : 'yes')} className="bg-[#22c55e] text-black py-5 rounded-3xl font-black uppercase italic">Yes</button>
              <button onClick={() => handleResponse('no')} className="bg-[#ef4444] text-black py-5 rounded-3xl font-black uppercase italic">No</button>
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

      <div className="w-full max-w-sm mx-auto flex items-center justify-between px-6 mb-8 opacity-60">
        <div className="flex flex-col text-left"><span className="text-[8px] font-black italic uppercase">Quiet Streak</span><span className="text-sm font-mono font-bold">{streak.time}</span></div>
        <span className="text-2xl">{streak.emoji}</span>
      </div>

      <div className="w-full max-w-sm mx-auto bg-zinc-900/40 rounded-3xl p-6 border border-white/5 text-left mb-10">
        <h2 className="text-[10px] uppercase text-gray-600 mb-4 font-black italic">History</h2>
        <div className="space-y-4">
          {history.map((item) => (
            <div key={item.id} className="flex justify-between items-start text-xs border-b border-white/5 pb-2">
              <div className="flex flex-col">
                <span className={`text-[8px] font-black uppercase italic ${item.status === 'CANCELED' ? 'text-red-500' : 'text-blue-500'}`}>{item.status}</span>
                <p className="text-gray-400 font-mono">{item.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="text-right"><p className="text-zinc-400 italic mb-1">"{item.message}"</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}