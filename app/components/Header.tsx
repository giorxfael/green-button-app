'use client';
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';

export default function Header({ isChatOpen, setIsChatOpen, myId }: any) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
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

  return (
    <div className="absolute top-0 left-0 w-full z-50 pt-10 px-4 pointer-events-none">
      <button 
        onClick={() => setIsChatOpen(!isChatOpen)} 
        className="pointer-events-auto opacity-100 transition-all active:scale-90 flex items-center relative"
      >
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
  );
}