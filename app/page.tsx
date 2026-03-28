'use client';
import { useState, useEffect, useRef } from 'react';
import { db, getMessagingInstance } from '../lib/firebase';
import { doc, setDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';

export default function Home() {
  const [role, setRole] = useState<'sender' | 'receiver' | null>(null);
  const [status, setStatus] = useState('');
  const [mounted, setMounted] = useState(false);
  const [pendingDocId, setPendingDocId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSenderRegistered, setIsSenderRegistered] = useState(false);
  
  const sessionStart = useRef(new Date().getTime());

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get('role') as 'sender' | 'receiver';
    setRole(urlRole || 'sender');
    setIsRegistered(localStorage.getItem('isRegistered') === 'true');
    setIsSenderRegistered(localStorage.getItem('isSenderRegistered') === 'true');
  }, []);

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
            setStatus("NEW PING RECEIVED! 👇");
          } else {
            setPendingDocId(null);
            setStatus(isRegistered ? "Waiting for a ping..." : "");
          }
        } else {
          // SENDER LOGIC UPDATED
          if ((data.status === "yes" || data.status === "no") && isResponseFresh && isResponseFromThisSession) {
            if (data.status === 'yes') {
              setStatus("Yes I'm all yours! ✅");
            } else {
              setStatus("HELL NO ❌");
            }
          } else if (data.status === "pending" && isPingFresh) {
            setStatus('Waiting... ⏳'); // Changed from "Ping Sent! Waiting..."
          }
        }
      }
    });
    return () => unsubscribe();
  }, [mounted, role, isRegistered]);

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
    setStatus('Sending...');
    const res = await fetch('/api/notify', { method: 'POST' });
    if (!res.ok) setStatus('Failed.');
  };

  const registerDevice = async (type: 'sender' | 'receiver') => {
    setStatus('Activating...');
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const token = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY });
      await setDoc(doc(db, "tokens", type), { token: token, lastUpdated: new Date() });
      const storageKey = type === 'sender' ? 'isSenderRegistered' : 'isRegistered';
      localStorage.setItem(storageKey, 'true');
      type === 'sender' ? setIsSenderRegistered(true) : setIsRegistered(true);
      setStatus('Ready ✅');
    } catch (e) { setStatus('Failed.'); }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-black text-white p-6 text-center">
      <div className="flex-grow flex flex-col items-center justify-center w-full mt-10">
        {role === 'receiver' ? (
          <div className="w-full max-w-xs">
            {pendingDocId ? (
              <div className="space-y-4">
                <p className="text-xl font-bold text-yellow-400 mb-6 uppercase tracking-tighter">Incoming Ping:</p>
                <button onClick={() => handleResponse('yes')} className="w-full bg-green-500 py-6 rounded-3xl text-3xl font-black shadow-[0_10px_30px_rgba(34,197,94,0.4)] active:scale-95 transition-all">YES</button>
                <button onClick={() => handleResponse('no')} className="w-full bg-red-500 py-6 rounded-3xl text-3xl font-black shadow-[0_10px_30px_rgba(239,68,68,0.4)] active:scale-95 transition-all">NO</button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {!isRegistered && (
                  <button onClick={() => registerDevice('receiver')} className="bg-blue-600 px-8 py-4 rounded-2xl font-bold mb-4">Activate Receiver</button>
                )}
                <p className="text-gray-400 italic text-sm mt-4">{status}</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <button onClick={sendPing} className="w-64 h-64 rounded-full bg-green-600 shadow-[0_0_60px_rgba(34,197,94,0.5)] active:scale-90 flex items-center justify-center text-4xl font-black uppercase tracking-tighter transition-all">PUSH</button>
            <p className={`mt-10 font-mono text-2xl transition-all ${status.includes('yours') ? 'text-green-400' : status.includes('HELL') ? 'text-red-400' : 'text-yellow-400'}`}>{status}</p>
            {!isSenderRegistered && (
              <button onClick={() => registerDevice('sender')} className="mt-8 text-[10px] text-gray-600 border border-white/10 px-4 py-2 rounded-full uppercase tracking-widest">Enable Response Alerts</button>
            )}
          </div>
        )}
      </div>

      <div className="w-full max-w-sm mt-12 bg-zinc-900/40 rounded-3xl p-6 border border-white/5 backdrop-blur-md mb-4">
        <h2 className="text-[10px] uppercase tracking-[0.3em] text-gray-600 mb-4 font-black text-left ml-2">History</h2>
        <div className="space-y-3 text-left">
          {history.map((item) => (
            <div key={item.id} className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
              <span className="text-gray-600 font-mono">{item.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className={`font-black uppercase ${item.status === 'yes' ? 'text-green-500' : item.status === 'no' ? 'text-red-500' : 'text-gray-700'}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}