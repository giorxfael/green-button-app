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
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-black animate-in fade-in duration-300">
      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto px-4 pt-32 pb-4 flex flex-col-reverse space-y-reverse space-y-1">
        <div ref={scrollRef} />
        
        {messages.filter((msg: any) => msg.text?.trim()).map((msg: any, idx: number) => {
          const isMine = msg.senderId === myId;
          const isLatest = idx === 0;

          return (
            <div key={msg.id} className="flex flex-col w-full animate-in fade-in duration-200">
              <div className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2 rounded-[20px] text-[16px] font-medium leading-tight shadow-sm ${
                  isMine 
                    ? 'bg-[#007aff] text-white rounded-br-none' 
                    : 'bg-[#262629] text-white rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>

              {/* Read/Delivered Status */}
              {isMine && isLatest && (
                <div className="text-[10px] text-zinc-500 font-bold mt-1 pr-1 text-right animate-in fade-in duration-500">
                  {msg.seen ? 'Read' : 'Delivered'}
                </div>
              )}
            </div>
          );
        })}
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] py-6 text-center opacity-40">
          Messages expire in 24h
        </p>
      </div>

      {/* iMessage Input Bar */}
      <div className="w-full bg-black/90 backdrop-blur-2xl border-t border-white/5 px-4 py-3 pb-10">
        <div className="relative flex items-center bg-[#1c1c1e] rounded-full border border-white/10 pr-1.5">
          <input 
            type="text" 
            placeholder="iMessage" 
            value={chatInput} 
            onChange={(e) => setChatInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
            // CRITICAL: Font size 16px prevents iOS auto-zoom
            className="w-full bg-transparent py-3 px-4 text-[16px] focus:outline-none placeholder:text-zinc-600 text-white"
            autoComplete="off"
          />
          <button 
            onClick={sendChatMessage} 
            disabled={!chatInput.trim()}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              chatInput.trim() ? 'bg-[#007aff] opacity-100' : 'bg-zinc-700 opacity-30'
            }`}
          >
            <span className="text-white text-lg font-bold">↑</span>
          </button>
        </div>
      </div>
    </div>
  );
}