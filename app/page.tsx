'use client';
import { useState, useEffect } from 'react';
import Header from './components/Header';
import ChatView from './components/ChatView';
import PingView from './components/PingView';

export default function Home() {
  const [myId, setMyId] = useState<'iPhone1' | 'iPhone2' | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedId = localStorage.getItem('myDeviceId') as 'iPhone1' | 'iPhone2';
    if (savedId) setMyId(savedId);
    
    // Zoom prevention
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0';
    document.getElementsByTagName('head')[0].appendChild(meta);
  }, []);

  if (!mounted || !myId) return <div className="bg-black min-h-screen" />;

  return (
    <main className={`bg-black text-white relative ${isChatOpen ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'}`}>
      <style jsx global>{`
        ::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>

      <Header 
        isChatOpen={isChatOpen} 
        setIsChatOpen={setIsChatOpen} 
        myId={myId} 
      />

      {isChatOpen ? (
        <ChatView myId={myId} />
      ) : (
        <PingView myId={myId} />
      )}
    </main>
  );
}