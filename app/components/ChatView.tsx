'use client';
import { useRef } from 'react';

export default function ChatView({ 
  messages, 
  myId, 
  chatInput, 
  setChatInput, 
  sendChatMessage 
}: any) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-black animate-in fade-in duration-300">
      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto px-4 pt-28 pb-4 flex flex-col-reverse space-y-reverse space-y-4">
        <div ref={scrollRef} />
        
        {messages.filter((msg: any) => msg.text?.trim()).map((msg: any, idx: number) => {
          const isMine = msg.senderId === myId;
          const isLatest = idx === 0;

          return (
            <div key={msg.id} className="flex flex-col w-full animate-in slide-in-from-left-2 duration-200">
              <div className="flex items-start gap-2">
                {/* Snapchat Blue/Red status line for others */}
                {!isMine && (
                  <div className="w-[3px] h-full self-stretch bg-[#00b2ff] rounded-full mr-1" />
                )}
                
                <div className="flex flex-col">
                  {/* Name Label - Snapchat style */}
                  <span className={`text-[11px] font-bold uppercase tracking-wider mb-0.5 ${isMine ? 'text-[#00b2ff] self-end' : 'text-[#ff1361]'}`}>
                    {isMine ? 'ME' : 'THEM'}
                  </span>
                  
                  {/* Message Bubble - Snap uses very slight rounding and no background for text usually, but a subtle grey looks better on OLED */}
                  <div className={`px-0 py-0.5 text-[16px] leading-tight font-medium text-white ${isMine ? 'text-right' : 'text-left'}`}>
                    {msg.text}
                  </div>
                </div>
              </div>

              {/* Status Info */}
              {isLatest && (
                <div className={`text-[10px] text-zinc-600 font-bold mt-1 flex items-center gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <span>{msg.seen ? 'Opened' : 'Delivered'}</span>
                  <span className="text-[8px] opacity-50">•</span>
                  <span>{isMine ? 'Just now' : 'Received'}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Snapchat Input Bar */}
      <div className="w-full bg-black px-3 py-4 pb-10">
        <div className="flex items-center gap-3 bg-[#1e1e1e] rounded-full px-4 py-1.5 border border-white/5">
          {/* Camera Icon Placeholder (Classic Snap) */}
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <span className="text-sm">📷</span>
          </div>

          <input 
            type="text" 
            placeholder="Send a Chat" 
            autoFocus 
            value={chatInput} 
            onChange={(e) => setChatInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
            className="flex-grow bg-transparent py-2 text-[15px] focus:outline-none placeholder:text-zinc-500 text-white"
          />

          {/* Send Button - Snap Blue */}
          {chatInput.trim() && (
            <button 
              onClick={sendChatMessage} 
              className="text-[#00b2ff] font-bold text-sm tracking-wide animate-in fade-in zoom-in duration-200"
            >
              Send
            </button>
          )}
          
          {/* Microphone/Emoji Icons Placeholder */}
          {!chatInput.trim() && (
            <div className="flex gap-3 opacity-60">
              <span>😊</span>
              <span>🎙️</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}