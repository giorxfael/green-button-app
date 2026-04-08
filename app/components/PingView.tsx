'use client';
import { useState } from 'react';

export default function PingView({
  isIBeingPinged,
  appState,
  replyMsg,
  setReplyMsg,
  handleResponse,
  amIWaiting,
  customMsg,
  setCustomMsg,
  sendPing,
  cancelPing,
  status,
  statusColor,
  streak,
  history,
  swipedId,
  handleTouchStart,
  handleTouchMove,
  deleteHistoryItem
}: any) {
  return (
    <div className="flex flex-col p-6 pt-24 pb-12 min-h-screen">
      
      {/* PUSH SECTION (Incoming Ping) */}
      {isIBeingPinged && (
        <div className="mb-12 animate-in zoom-in fade-in duration-500">
          <div className="bg-[#1c1c1e] rounded-[32px] p-8 border border-white/10 shadow-2xl">
            <h2 className="text-zinc-500 font-black italic text-xs uppercase tracking-[0.2em] mb-4">Incoming Ping</h2>
            <p className="text-3xl font-black italic text-white leading-tight mb-8">
              "{appState.message}"
            </p>
            
            <input 
              type="text" 
              placeholder="Reply..." 
              value={replyMsg}
              onChange={(e) => setReplyMsg(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-white mb-6 focus:outline-none focus:border-blue-500 transition-colors"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleResponse('yes')} className="bg-white text-black font-black italic py-4 rounded-2xl uppercase tracking-tighter active:scale-95 transition-transform">Yes</button>
              <button onClick={() => handleResponse('no')} className="bg-zinc-800 text-white font-black italic py-4 rounded-2xl uppercase tracking-tighter active:scale-95 transition-transform">No</button>
              <button 
                onClick={() => handleResponse('text')} 
                disabled={!replyMsg.trim()}
                className="col-span-2 bg-blue-600 disabled:opacity-50 text-white font-black italic py-4 rounded-2xl uppercase tracking-tighter active:scale-95 transition-transform"
              >
                Send Reply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEND SECTION */}
      {!isIBeingPinged && !amIWaiting && (
        <div className="flex flex-col items-center mb-12">
          <button 
            onClick={sendPing}
            className="w-64 h-64 rounded-full bg-white flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.2)] active:scale-90 transition-all group"
          >
            <span className="text-black font-[1000] italic text-5xl uppercase tracking-tighter group-active:scale-110 transition-transform">Push</span>
          </button>
          
          <input 
            type="text" 
            placeholder="Custom message..." 
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            className="mt-10 w-full max-w-xs bg-transparent border-b-2 border-white/10 py-2 text-center text-xl font-bold italic focus:outline-none focus:border-white transition-colors"
          />
        </div>
      )}

      {/* WAITING SECTION */}
      {amIWaiting && (
        <div className="flex flex-col items-center mb-12 animate-pulse">
          <div className="w-64 h-64 rounded-full border-4 border-white/20 flex flex-col items-center justify-center">
            <span className="text-white/40 font-black italic text-xl uppercase tracking-widest">Sent</span>
            <span className="text-white font-black italic text-2xl mt-2">WAITING</span>
          </div>
          <button onClick={cancelPing} className="mt-8 text-red-500 font-black italic uppercase text-xs tracking-widest">Cancel Ping</button>
        </div>
      )}

      {/* STATUS & STREAK */}
      <div className="flex justify-between items-end mb-12 px-2">
        <div className="flex flex-col">
          <span className="text-zinc-500 font-black italic text-[10px] uppercase tracking-widest mb-1">Status</span>
          <span className={`text-2xl font-black italic tracking-tighter leading-none ${statusColor}`}>
            {status || 'READY'}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-zinc-500 font-black italic text-[10px] uppercase tracking-widest mb-1">Silence</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black italic tracking-tighter leading-none">{streak.time}</span>
            <span className="text-xl">{streak.emoji}</span>
          </div>
        </div>
      </div>

      {/* HISTORY SECTION - UPDATED LOGIC */}
      <div className="flex flex-col gap-4">
        <h2 className="text-zinc-500 font-black italic text-xs uppercase tracking-widest px-1">History</h2>
        
        {history.map((item: any) => {
          // Check if this was a reply or just a standard ping
          const isReplied = item.status === 'replied' || !!item.textResponse;
          const timeString = item.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div 
              key={item.id}
              onTouchStart={handleTouchStart}
              onTouchMove={(e) => handleTouchMove(e, item.id)}
              className="relative overflow-hidden group"
            >
              <div className={`flex justify-between items-center py-5 border-b border-white/5 transition-transform duration-300 ease-out ${swipedId === item.id ? '-translate-x-20' : 'translate-x-0'}`}>
                
                {/* LEFT: Label & Time */}
                <div className="flex flex-col">
                  <span className={`text-[10px] font-[1000] italic uppercase tracking-tighter ${isReplied ? 'text-blue-400' : 'text-zinc-600'}`}>
                    {isReplied ? 'Replied' : 'Picked'}
                  </span>
                  <span className="text-xl font-black italic tracking-tighter text-white/40 leading-none mt-1">
                    {timeString}
                  </span>
                </div>

                {/* RIGHT: The Message and The Actual Reply */}
                <div className="flex flex-col items-end text-right max-w-[65%]">
                  <span className="text-white italic font-medium text-[16px] leading-tight mb-1">
                    "{item.message}"
                  </span>
                  
                  {isReplied && item.textResponse ? (
                    <span className="text-blue-500 font-black italic uppercase text-[11px] tracking-tight mt-1 animate-in slide-in-from-right-2 duration-500">
                      {item.textResponse}
                    </span>
                  ) : isReplied ? (
                    <span className="text-blue-500 font-black italic uppercase text-[11px] tracking-tight mt-1">
                      Replied
                    </span>
                  ) : null}
                </div>
              </div>

              {/* SLIDE-TO-DELETE ACTION */}
              <button 
                onClick={() => deleteHistoryItem(item.id)}
                className="absolute right-0 top-0 h-full w-20 bg-red-600 flex items-center justify-center text-white font-[1000] italic text-[10px] tracking-widest"
              >
                DELETE
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}