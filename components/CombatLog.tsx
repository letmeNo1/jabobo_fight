
import React from 'react';
import { BattleLog } from '../types';

interface CombatLogProps {
  logs: BattleLog[];
  logEndRef: React.RefObject<HTMLDivElement | null>;
  isMobile: boolean;
}

const CombatLog: React.FC<CombatLogProps> = ({ logs, logEndRef, isMobile }) => {
  return (
    <div className="w-full bg-slate-950 p-2.5 md:p-6 overflow-y-auto custom-scrollbar border-t border-slate-800 shrink-0 z-[260]" style={{ height: isMobile ? '50vh' : '30vh', maxHeight: isMobile ? 'none' : '350px' }}>
      <div className="max-w-2xl mx-auto space-y-2 md:space-y-3">
        {logs.map((log, i) => (
          <div key={i} className={`px-3 md:px-5 py-2 md:py-3.5 rounded-lg md:rounded-2xl border-l-4 text-[11px] md:text-sm shadow-lg animate-popIn ${log.attacker === '你' ? 'bg-blue-950/30 border-blue-500 text-blue-100' : log.attacker === '系统' ? 'bg-orange-900/30 border-orange-500 text-orange-100 font-bold' : 'bg-red-950/30 border-red-500 text-red-100'}`}>
            <div className="flex items-center">
              <span className="font-black opacity-30 mr-2 md:mr-4 uppercase text-[8px] md:text-[11px] shrink-0 tracking-widest">[{log.attacker}]</span>
              <span className="tracking-tight font-medium leading-tight">{log.text}</span>
            </div>
          </div>
        ))}
        <div ref={logEndRef} className="h-1" />
      </div>
    </div>
  );
};

export default CombatLog;
