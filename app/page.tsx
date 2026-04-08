'use client';
import { useState, useEffect, useRef } from 'react';
import { db, getMessagingInstance } from '../lib/firebase';
import { 
  doc, setDoc, onSnapshot, collection, query, orderBy, limit, 
  where, Timestamp, updateDoc, deleteDoc, getDocs 
} from 'firebase/firestore';
import { getToken } from 'firebase/messaging';

import ChatView from './components/ChatView';
import PingView from './components/PingView';

export default function Home() {
  const [myId, setMyId] = useState<'iPhone1' | 'iPhone2' | null>(null);
  const [appState, setAppState] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [statusColor, setStatusColor] = useState('text-yellow-400');
  const [customMsg, setCustomMsg] = useState('');
  const [replyMsg, setReplyMsg] = useState(''); 
  const [history, setHistory] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  
  // Presence & Typing States
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isOtherOnline, setIsOtherOnline] = useState(false);
  const [lastSeenString, setLastSeenString] = useState('');

  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStart = useRef(0);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');

  // HELPER: Calculates relative time (e.g., "5m ago")
  const formatLastSeen = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };
  
  useEffect(() => {
    setMounted(true);
    const savedId = localStorage.getItem('myDeviceId') as 'iPhone1' | 'iPhone2';
    if (savedId) setMyId(savedId);

    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    document.getElementsByTagName('head')[0].appendChild(meta);
  }, []);

  // ONLINE/OFFLINE HEARTBEAT
  useEffect(() => {
    if (!mounted || !myId) return;
    const setOnlineStatus = async (isOnline: boolean) => {
      await setDoc(doc(db, "presence", myId), {
        online: isOnline,
        lastSeen: Timestamp.now()
      }, { merge: true });
    };
    setOnlineStatus(true);
    const handleVisibilityChange = () => setOnlineStatus(document.visibilityState === 'visible');
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      setOnlineStatus(false);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [mounted, myId]);

  // PRESENCE & TYPING LISTENER
  useEffect(() => {
    if (!mounted || !myId) return;
    const otherId = myId === 'iPhone1' ? 'iPhone2' : 'iPhone1';
    const unsub = onSnapshot(doc(db, "presence", otherId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsOtherTyping(data.typing || false);
        setIsOtherOnline(data.online || false);
        setLastSeenString(formatLastSeen(data.lastSeen));
      }
    });
    return () => unsub();
  }, [mounted, myId]);

  const handleTyping = async (isTyping: boolean) => {
    if (!myId) return;
    await setDoc(doc(db, "presence", myId), { 
      typing: isTyping,
      lastActive: Timestamp.now() 
    }, { merge: true });
  };

  // PING LISTENER
  useEffect(() => {
    if (!mounted || !myId) return;
    const unsubscribe = onSnapshot(doc(db, "notifications", "current"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAppState(data);
        if (data.status === 'pending' && data.sender === myId) {
          setStatus('Waiting... ⏳'); setStatusColor('text-yellow-400');
        } else { setStatus(''); }
      } else {
        setAppState(null); setStatus('');
      }
    });
    return () => unsubscribe();
  }, [mounted, myId]);

  // CHAT & HISTORY LOGIC
  useEffect(() => {
    if (!mounted) return;
    const q = query(collection(db, "messages"), where("timestamp", ">=", Timestamp.fromDate(new Date(Date.now() - 86400000))), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snapshot) => setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !isChatOpen || !messages.length || !myId) return;
    messages.filter(msg => msg.senderId !== myId && !msg.seen).forEach(async (msg) => {
      await updateDoc(doc(db, "messages", msg.id), { seen: true });
    });
  }, [isChatOpen, messages, myId, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const q = query(collection(db, "history"), orderBy("timestamp", "desc"), limit(5));
    return onSnapshot(q, (snapshot) => setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
  }, [mounted]);

  const streak = (() => {
    if (history.length === 0) return { time: "0h 0m", emoji: "🆕" };
    const lastPing = history.find(item => item.status !== 'pending' && item.status !== 'CANCELED')?.timestamp?.toDate();
    if (!lastPing) return { time: "0h 0m", emoji: "🐣" };
    const diffInMs = Math.max(0, new Date().getTime() - lastPing.getTime());
    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffInMs / (1000 * 60)) % 60);
    const days = Math.floor(hours / 24);
    return { time: days > 0 ? `${days}d ${hours % 24}h` : `${hours}h ${minutes}m`, emoji: hours >= 1 ? "🧘" : "🤫" };
  })();

  const sendPing = async () => {
    await fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: customMsg || "🔔", senderId: myId }) });
    setCustomMsg('');
  };

  const cancelPing = async () => {
    const q = query(collection(db, "history"), where("status", "==", "pending"), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) await updateDoc(doc(db, "history", snap.docs[0].id), { status: "CANCELED" });
    await deleteDoc(doc(db, "notifications", "current"));
    setAppState(null); setStatus('');
  };

  const deleteHistoryItem = async (id: string) => {
    await deleteDoc(doc(db, "history", id));
    setSwipedId(null);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput; setChatInput('');
    handleTyping(false);
    await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, senderId: myId }) });
  };

  const handleResponse = async (answer: 'yes' | 'no' | 'text') => {
    await fetch('/api/respond', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: answer === 'text' ? 'replied' : answer, textResponse: answer === 'text' ? replyMsg : null }) });
    setReplyMsg(''); setAppState(null);
  };

  const register = async (id: 'iPhone1' | 'iPhone2') => {
    setMyId(id); localStorage.setItem('myDeviceId', id);
    const messaging = await getMessagingInstance();
    if (!messaging) return;
    const token = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY });
    await setDoc(doc(db, "tokens", id), { token });
  };

  if (!mounted) return <div className="min-h-screen bg-black" />;
  if (!myId) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-6 p-6 font-black italic">
       <button onClick={() => register('iPhone1')} className="w-full max-w-xs border-2 border-white/10 py-6 rounded-3xl text-xl text-white uppercase tracking-tighter">iPhone 1</button>
       <button onClick={() => register('iPhone2')} className="w-full max-w-xs border-2 border-white/10 py-6 rounded-3xl text-xl text-white uppercase tracking-tighter">iPhone 2</button>
    </div>
  );

  const unreadCount = messages.filter(msg => msg.senderId !== myId && !msg.seen).length;

  return (
    <div className={`flex flex-col bg-black text-white relative ${isChatOpen ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'}`}>
      <style jsx global>{`
        ::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        input { font-size: 16px !important; }
      `}</style>
      {!isChatOpen && (
        <div className="absolute top-0 left-0 w-full z-50 pt-10 px-4 pointer-events-none">
            <button onClick={() => setIsChatOpen(true)} className="pointer-events-auto opacity-100 transition-all active:scale-90 flex items-center relative">
                <div className="relative p-2 bg-black/40 rounded-full backdrop-blur-md">
                  <span className="text-2xl">💬</span>
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-black">{unreadCount}</span>}
                </div>
            </button>
        </div>
      )}
      {isChatOpen ? (
        <ChatView 
          messages={messages} myId={myId} chatInput={chatInput} setChatInput={setChatInput} 
          sendChatMessage={sendChatMessage} setIsChatOpen={setIsChatOpen} 
          isOtherTyping={isOtherTyping} onTyping={handleTyping}
          isOtherOnline={isOtherOnline} lastSeenString={lastSeenString}
        />
      ) : (
        <PingView 
          isIBeingPinged={appState?.status === 'pending' && appState?.sender !== myId}
          appState={appState} replyMsg={replyMsg} setReplyMsg={setReplyMsg} handleResponse={handleResponse}
          amIWaiting={appState?.status === 'pending' && appState?.sender === myId}
          customMsg={customMsg} setCustomMsg={setCustomMsg} sendPing={sendPing} cancelPing={cancelPing}
          status={status} statusColor={statusColor} streak={streak} history={history} swipedId={swipedId}
          handleTouchStart={(e: any) => touchStart.current = e.targetTouches[0].clientX}
          handleTouchMove={(e: any, id: string) => {
            const touchEnd = e.targetTouches[0].clientX;
            if (touchStart.current - touchEnd > 50) setSwipedId(id);
            else if (touchEnd - touchStart.current > 50) setSwipedId(null);
          }}
          deleteHistoryItem={deleteHistoryItem}
        />
      )}
    </div>
  );
}