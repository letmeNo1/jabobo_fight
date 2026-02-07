
import React, { useEffect } from 'react';
import { BattleLog } from '../types';

interface CombatLogProps {
  logs: BattleLog[];
  logEndRef: React.RefObject<HTMLDivElement | null>;
  isMobile: boolean;
}

const CombatLog: React.FC<CombatLogProps> = ({ logs, logEndRef, isMobile }) => {
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, logEndRef]);

  // 竖屏下给 35% 空间，横屏或PC端给固定高度
  const heightStyle = isMobile ? { height: '35vh' } : { height: '280px' };

  return (
    <div 
      className="w-full bg-slate-950 p-3 md:p-6 overflow-y-auto custom-scrollbar border-t border-white/5 shrink-0 z-[260] relative shadow-[0_-20px_50px_rgba(0,0,0,0.5)]" 
      style={heightStyle}
    >
      <div className="max-w-2xl mx-auto space-y-2 md:space-y-3">
        {logs.map((log, i) => (
          <div 
            key={i} 
            className={`px-3 py-2 md:px-5 md:py-3 rounded-xl border-l-4 text-[11px] md:text-sm shadow-md animate-popIn transition-all
              ${log.attacker === '你' || log.attacker === 'PLAYER' || log.attacker === 'P1' 
                ? 'bg-blue-600/10 border-blue-500 text-blue-100' 
                : log.attacker === '系统' 
                ? 'bg-orange-500/10 border-orange-500 text-orange-200 font-bold' 
                : 'bg-red-600/10 border-red-500 text-red-100'}`}
          >
            <div className="flex items-start">
              <span className="font-black opacity-40 mr-2 uppercase text-[9px] shrink-0 tracking-widest mt-0.5">
                {log.attacker}
              </span>
              <span className="tracking-tight font-medium leading-normal break-words">
                {log.text}
              </span>
            </div>
          </div>
        ))}
        <div ref={logEndRef} className="h-4" />
      </div>
      
      {/* 顶部渐变遮罩 */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-950 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default CombatLog;
