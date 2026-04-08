'use client';
import { useState, useRef } from 'react';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function ChatView({ 
  messages, myId, chatInput, setChatInput, sendChatMessage, setIsChatOpen,
  isOtherTyping, onTyping, isOtherOnline, lastSeenString
}: any) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStart = useRef(0);
  const otherPhone = myId === 'iPhone1' ? 'iPhone 2' : 'iPhone 1';

  const handleTouchStart = (e: React.TouchEvent) => touchStart.current = e.targetTouches[0].clientX;
  const handleTouchMove = (e: React.TouchEvent) => {
    const touchEnd = e.targetTouches[0].clientX;
    setIsSwiping(touchStart.current - touchEnd > 30);
  };
  const handleTouchEnd = () => setIsSwiping(false);

  // Toggle Reaction Logic
  const handleDoubleClick = async (msgId: string, currentReaction: string) => {
    const msgRef = doc(db, "messages", msgId);
    await updateDoc(msgRef, {
      reaction: currentReaction === '❤️' ? null : '❤️'
    });
    // Add haptic buzz
    if (window.navigator.vibrate) window.navigator.vibrate(10);
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-black animate-in fade-in duration-300 select-none">
      
      {/* Top Banner */}
      <div className="fixed top-0 left-0 w-full z-50 bg-[#121212]/85 backdrop-blur-xl border-b border-white/5 pt-12 pb-5 px-4 flex items-center justify-between">
        <button onClick={() => setIsChatOpen(false)} className="flex items-center text-[#007aff] active:opacity-50 transition-opacity">
          <span className="text-4xl leading-none -mt-1 font-light pr-1">‹</span>
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-[13px] font-semibold text-white tracking-wide">{otherPhone}</span>
          <div className="flex items-center gap-1 mt-0.5">
            {isOtherOnline ? (
              <>
                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest">Active now</span>
              </>
            ) : (
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                {lastSeenString ? `Active ${lastSeenString}` : 'Offline'}
              </span>
            )}
          </div>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto px-4 pt-32 pb-6 flex flex-col-reverse space-y-reverse space-y-1 overflow-x-hidden touch-pan-y"
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div ref={scrollRef} />
        
        {isOtherTyping && (
          <div className="flex justify-start w-full mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-[#1c1c1e] px-4 py-3 rounded-[22px] rounded-bl-none flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}

        {messages.filter((msg: any) => msg.text?.trim()).map((msg: any, idx: number) => {
          const isMine = msg.senderId === myId;
          const isLastMessage = idx === 0; 
          const timeString = msg.timestamp?.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
          
          return (
            <div key={msg.id} className={`relative flex flex-col w-full transition-transform duration-300 ease-out ${isSwiping ? '-translate-x-16' : 'translate-x-0'}`}>
              <div className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                
                {/* BUBBLE WITH DOUBLE-TAP */}
                <div 
                  onDoubleClick={() => handleDoubleClick(msg.id, msg.reaction)}
                  className={`relative max-w-[75%] px-4 py-2.5 rounded-[22px] text-[17px] font-normal leading-tight transition-transform active:scale-[0.98] ${
                    isMine ? 'bg-[#007aff] text-white rounded-br-none' : 'bg-[#1c1c1e] text-white rounded-bl-none'
                  }`}
                >
                  {msg.text}

                  {/* REACTION HEART BADGE - UPDATED: Bigger */}
                  {msg.reaction === '❤️' && (
                    <div className={`absolute -top-2.5 ${isMine ? '-left-2.5' : '-right-2.5'} bg-zinc-900 border-2 border-black rounded-full w-7 h-7 flex items-center justify-center shadow-lg animate-in zoom-in duration-200`}>
                      <span className="text-[13px] leading-none mt-[1px]">❤️</span>
                    </div>
                  )}
                </div>

                <div className={`absolute -right-16 self-center text-[10px] font-bold text-zinc-600 uppercase tracking-tighter w-12 transition-opacity duration-200 ${isSwiping ? 'opacity-100' : 'opacity-0'}`}>{timeString}</div>
              </div>
              {isMine && isLastMessage && (
                <div className={`text-[11px] text-zinc-500 font-medium mt-1 pr-1 text-right transition-opacity duration-300 ${isSwiping ? 'opacity-0' : 'opacity-100'}`}>{msg.seen ? `Read ${timeString}` : 'Delivered'}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="w-full bg-black px-2 pb-10 pt-2">
        <div className="relative flex items-center bg-[#1c1c1e] rounded-full border border-white/5 px-4 py-1.5">
          <input type="text" placeholder="Message" value={chatInput} onFocus={() => onTyping(true)} onBlur={() => onTyping(false)}
            onChange={(e) => { setChatInput(e.target.value); onTyping(e.target.value.length > 0); }}
            onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
            className="w-full bg-transparent py-2 text-[16px] focus:outline-none placeholder:text-zinc-500 text-white" autoComplete="off" />
          <div className="flex items-center gap-3 ml-2">
            {chatInput.trim() ? (
              <button onClick={sendChatMessage} className="w-8 h-8 rounded-full bg-[#007aff] flex items-center justify-center active:scale-90 transition-all">
                <span className="text-white text-xl font-bold">↑</span>
              </button>
            ) : (
              <button className="opacity-60">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}