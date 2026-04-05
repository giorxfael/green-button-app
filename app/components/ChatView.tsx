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
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
      <div className="flex-grow overflow-y-auto px-4 space-y-2 pt-24 pb-4 flex flex-col-reverse">
        <div ref={scrollRef} />
        {messages.filter((msg: any) => msg.text?.trim()).map((msg: any, idx: number) => {
          const isMine = msg.senderId === myId;
          const isLatest = idx === 0;
          return (
            <div key={msg.id} className="flex flex-col w-full py-0.5">
              <div className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] px-4 py-2 rounded-[20px] text-[15px] font-medium ${isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[#262629] text-white rounded-bl-none'}`}>{msg.text}</div>
              </div>
              {isMine && isLatest && (
                <span className="text-[10px] text-zinc-500 font-bold mt-1 pr-1 text-right animate-in fade-in duration-300">
                  {msg.seen ? 'Read' : 'Delivered'}
                </span>
              )}
            </div>
          );
        })}
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest py-4 text-center">Messages expire in 24h</p>
      </div>
      <div className="w-full bg-[#121212]/90 backdrop-blur-2xl border-t border-white/10 px-4 py-3 pb-10">
        <div className="relative flex items-center bg-[#1c1c1e] rounded-full border border-white/10 pr-2">
          <input 
            type="text" 
            placeholder="iMessage" 
            autoFocus 
            value={chatInput} 
            onChange={(e) => setChatInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
            className="w-full bg-transparent py-3 px-4 text-sm focus:outline-none placeholder:text-zinc-600"
          />
          <button 
            onClick={sendChatMessage} 
            disabled={!chatInput.trim()} 
            className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 active:scale-90 transition-all"
          >
            <span className="text-white text-lg font-bold">↑</span>
          </button>
        </div>
      </div>
    </div>
  );
}
