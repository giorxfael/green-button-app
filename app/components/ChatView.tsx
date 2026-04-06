'use client';
import { useState, useRef } from 'react';

export default function ChatView({ 
  messages, 
  myId, 
  chatInput, 
  setChatInput, 
  sendChatMessage,
  setIsChatOpen 
}: any) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStart = useRef(0);
  
  const otherPhone = myId === 'iPhone1' ? 'iPhone 2' : 'iPhone 1';

  // Handle Global Swipe Logic
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchEnd = e.targetTouches[0].clientX;
    // If dragging left more than 30px, show all timestamps
    if (touchStart.current - touchEnd > 30) {
      setIsSwiping(true);
    } else {
      setIsSwiping(false);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-black animate-in fade-in duration-300">
      
      {/* iMessage Top Banner */}
      <div className="fixed top-0 left-0 w-full z-50 bg-[#121212]/85 backdrop-blur-xl border-b border-white/5 pt-12 pb-5 px-4 flex items-center justify-between">
        <button 
          onClick={() => setIsChatOpen(false)} 
          className="flex items-center text-[#007aff] active:opacity-50 transition-opacity"
        >
          <span className="text-4xl leading-none -mt-1 font-light pr-1">‹</span>
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-[13px] font-semibold text-white tracking-wide">{otherPhone}</span>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-grow overflow-y-auto px-4 pt-32 pb-6 flex flex-col-reverse space-y-reverse space-y-1 overflow-x-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div ref={scrollRef} />
        
        {messages.filter((msg: any) => msg.text?.trim()).map((msg: any, idx: number) => {
          const isMine = msg.senderId === myId;
          const isLastMessage = idx === 0; 
          
          const timeString = msg.timestamp?.toDate().toLocaleTimeString([], { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });

          return (
            <div 
              key={msg.id} 
              className={`relative flex flex-col w-full transition-transform duration-300 ease-out ${
                isSwiping ? '-translate-x-16' : 'translate-x-0'
              }`}
            >
              <div className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-[22px] text-[17px] font-normal leading-tight ${
                  isMine 
                    ? 'bg-[#007aff] text-white rounded-br-none' 
                    : 'bg-[#1c1c1e] text-white rounded-bl-none'
                }`}>
                  {msg.text}
                </div>

                {/* TIMESTAMPS (Slides in for ALL messages) */}
                <div className={`absolute -right-16 self-center text-[10px] font-bold text-zinc-600 uppercase tracking-tighter w-12 transition-opacity duration-200 ${
                  isSwiping ? 'opacity-100' : 'opacity-0'
                }`}>
                  {timeString}
                </div>
              </div>

              {/* READ RECEIPTS */}
              {isMine && isLastMessage && (
                <div className={`text-[11px] text-zinc-500 font-medium mt-1 pr-1 text-right transition-opacity ${
                  isSwiping ? 'opacity-0' : 'opacity-100'
                }`}>
                  {msg.seen ? 'Read' : 'Delivered'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input Bar */}
      <div className="w-full bg-black px-2 pb-10 pt-2">
        <div className="relative flex items-center bg-[#1c1c1e] rounded-full border border-white/5 px-4 py-1.5">
          <input 
            type="text" 
            placeholder="Message" 
            value={chatInput} 
            onChange={(e) => setChatInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
            className="w-full bg-transparent py-2 text-[16px] focus:outline-none placeholder:text-zinc-500 text-white"
            autoComplete="off"
          />
          
          <div className="flex items-center gap-3 ml-2">
            {chatInput.trim() ? (
              <button 
                onClick={sendChatMessage}
                className="w-8 h-8 rounded-full bg-[#007aff] flex items-center justify-center active:scale-90 transition-all"
              >
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