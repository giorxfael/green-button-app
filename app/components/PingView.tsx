'use client';

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
    <div className="flex flex-col px-6 pb-20 pt-16">
      <div className="flex flex-col items-center justify-center py-20 min-h-[60vh]">
        {isIBeingPinged ? (
          <div className="w-full max-w-xs space-y-8 animate-in fade-in zoom-in duration-500 text-center">
            <p className="text-3xl font-black tracking-tighter italic uppercase">{appState.message}</p>
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="REPLY..." 
                value={replyMsg} 
                onChange={(e) => setReplyMsg(e.target.value)}
                className="w-full bg-transparent border-b border-white/40 px-2 py-3 text-center focus:outline-none text-lg font-black uppercase italic"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => replyMsg ? handleResponse('text') : handleResponse('yes')} className="bg-[#22c55e] text-black py-5 rounded-3xl font-black uppercase italic active:scale-95 transition-all">Yes</button>
              <button onClick={() => replyMsg ? setReplyMsg('') : handleResponse('no')} className="bg-[#ef4444] text-black py-5 rounded-3xl font-black uppercase italic active:scale-95 transition-all">No</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-12">
            <div className="relative w-72">
              <input 
                disabled={amIWaiting} 
                type="text" 
                placeholder="MESSAGE..." 
                value={customMsg} 
                onChange={(e) => setCustomMsg(e.target.value)}
                className="w-full bg-transparent border-b border-white/20 py-4 text-center focus:outline-none focus:border-green-500 text-2xl font-black uppercase italic placeholder:text-zinc-800"
              />
            </div>
            <div className="flex flex-col items-center gap-4">
              <button 
                disabled={amIWaiting} 
                onClick={sendPing} 
                className={`w-64 h-64 rounded-full text-5xl font-black uppercase italic transition-all active:scale-90 ${amIWaiting ? 'bg-zinc-900 text-zinc-700' : 'bg-green-600 shadow-[0_0_80px_rgba(34,197,94,0.4)]'}`}
              >
                {amIWaiting ? '...' : 'PUSH'}
              </button>
              
              {amIWaiting && (
                <button onClick={cancelPing} className="text-red-500 font-black italic uppercase text-xs tracking-[0.2em] pt-4 active:opacity-50 transition-opacity">
                  Cancel Ping
                </button>
              )}
            </div>
            <p className={`font-black text-2xl uppercase italic h-8 ${statusColor}`}>{status}</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-sm mx-auto flex items-center justify-between px-6 mb-8 opacity-60">
        <div className="flex flex-col items-start text-left">
          <span className="text-[8px] text-zinc-500 uppercase font-black italic tracking-widest mb-1">Quiet Streak</span>
          <span className="text-sm font-mono text-zinc-300 font-bold tabular-nums">{streak.time}</span>
        </div>
        <span className="text-2xl drop-shadow-[0_0_80px_rgba(255,255,255,0.2)]">{streak.emoji}</span>
      </div>

      {/* HISTORY WITH SWIPE TO DELETE */}
      <div className="w-full max-w-sm mx-auto bg-zinc-900/40 rounded-3xl overflow-hidden border border-white/5 text-left mb-10">
        <h2 className="text-[10px] uppercase text-gray-600 p-6 pb-4 font-black italic tracking-widest">History</h2>
        <div className="divide-y divide-white/5">
          {history.map((item: any) => {
            // Check if it's a text reply
            const isReplied = item.status === 'replied' || !!item.textResponse;

            return (
              <div 
                key={item.id} 
                className="relative overflow-hidden bg-transparent touch-pan-x"
                onTouchStart={handleTouchStart}
                onTouchMove={(e) => handleTouchMove(e, item.id)}
              >
                <div 
                  className={`flex justify-between items-start p-6 text-xs transition-transform duration-300 ease-out ${swipedId === item.id ? '-translate-x-20' : 'translate-x-0'}`}
                >
                  <div className="flex flex-col">
                    <span className={`text-[8px] font-[1000] uppercase italic ${item.status === 'CANCELED' ? 'text-red-500' : isReplied ? 'text-green-500' : 'text-blue-500'}`}>
                      {isReplied ? "REPLIED" : (item.status !== 'pending' && item.status !== 'CANCELED' ? "PICKED" : item.status)}
                    </span>
                    <p className="text-gray-400 font-mono">{item.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-right max-w-[60%]">
                    <p className="text-zinc-400 italic mb-1">"{item.message}"</p>
                    
                    {/* Show actual reply text if it exists, otherwise show status */}
                    <p className={`font-black uppercase text-[10px] italic ${item.status === 'yes' ? 'text-green-500' : item.status === 'no' || item.status === 'CANCELED' ? 'text-red-500' : 'text-blue-400'}`}>
                      {isReplied && item.textResponse ? item.textResponse : item.status}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => deleteHistoryItem(item.id)}
                  className={`absolute top-0 right-0 h-full w-20 bg-red-600 text-white font-black italic text-[10px] uppercase transition-all duration-300 ${swipedId === item.id ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}