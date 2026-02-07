
import React, { useState } from 'react';
import { WEAPONS, SKILLS } from '../constants';
import config from '../config';
import { calculateTotalCP } from '../utils/combatPower';

interface FighterDisplay {
  name: string;
  hp: number;
  maxHp: number;
  level: number;
  str: number;
  agi: number;
  spd: number;
  weapons: string[];
  skills: string[];
  status: {
    disarmed: number;
    sticky: number;
    afterimage: number;
    dots: any[];
  };
}

interface CombatStatusProps {
  fighter: FighterDisplay;
  side: 'left' | 'right';
  uiScale: number;
  label: string;
  isMobile?: boolean;
}

const CombatStatus: React.FC<CombatStatusProps> = ({ fighter, side, uiScale, label, isMobile }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isLeft = side === 'left';
  const textAlign = isLeft ? 'text-left' : 'text-right';
  const barDir = isLeft ? 'r' : 'l';

  const ownedWeapons = WEAPONS.filter(w => fighter.weapons.includes(w.id));
  const totalCP = calculateTotalCP(fighter as any);

  const widthClass = isMobile ? 'w-[48%]' : (config.combat.status.widthPC + ' ' + config.combat.status.maxWidth);

  return (
    <div 
      className={`relative ${textAlign} pointer-events-auto ${widthClass} group transition-all`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`absolute top-full mt-2 transition-all duration-300 pointer-events-none z-[300]
        ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'}
        ${isLeft ? 'left-0' : 'right-0'}`}
      >
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3 shadow-2xl min-w-[180px] text-left">
          <h4 className="text-white font-black text-sm uppercase">{fighter.name}</h4>
          <div className="text-[10px] font-black text-indigo-400 italic">CP: {totalCP}</div>
          <div className="grid grid-cols-2 gap-1 mt-2">
            <div className="bg-white/5 p-1 rounded text-[9px]">⚔️ {fighter.str}</div>
            <div className="bg-white/5 p-1 rounded text-[9px]">💨 {fighter.agi}</div>
          </div>
        </div>
      </div>

      <div className={`flex items-end text-white font-black mb-1 drop-shadow-md uppercase tracking-tighter`}>
        {isLeft ? (
          <>
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-1">
                <span className="bg-orange-600 px-2 py-0.5 rounded-l-lg italic text-[9px] shadow-sm">{label}</span>
                <span className="text-[9px] text-indigo-300 italic font-black">⚡{totalCP}</span>
              </div>
              <div className="flex gap-0.5 mt-0.5">
                {fighter.status.disarmed > 0 && <span className="text-[8px] bg-rose-600 px-1 rounded-sm animate-pulse">🚫缴械</span>}
                {fighter.status.sticky > 0 && <span className="text-[8px] bg-yellow-600 px-1 rounded-sm animate-pulse">🕸️黏住</span>}
              </div>
            </div>
            <span className="ml-auto font-mono text-lg md:text-xl text-emerald-400 leading-none">{Math.ceil(fighter.hp)}</span>
          </>
        ) : (
          <>
            <span className="font-mono text-lg md:text-xl text-rose-400 leading-none">{Math.ceil(fighter.hp)}</span>
            <div className="flex flex-col items-end gap-0.5 ml-auto">
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-indigo-300 italic font-black">⚡{totalCP}</span>
                <span className="bg-red-600 px-2 py-0.5 rounded-r-lg italic text-[9px] shadow-sm">{label}</span>
              </div>
              <div className="flex gap-0.5 mt-0.5">
                {fighter.status.sticky > 0 && <span className="text-[8px] bg-yellow-600 px-1 rounded-sm animate-pulse">🕸️</span>}
                {fighter.status.disarmed > 0 && <span className="text-[8px] bg-rose-600 px-1 rounded-sm animate-pulse">🚫</span>}
              </div>
            </div>
          </>
        )}
      </div>

      {/* HP Bar */}
      <div className={`h-2.5 md:h-5 bg-black/70 rounded-${barDir}-xl border border-white/10 overflow-hidden shadow-inner`}>
        <div 
          className={`h-full bg-gradient-to-${barDir} ${isLeft ? 'from-emerald-600 to-green-400' : 'from-red-700 to-rose-500 ml-auto'} transition-all duration-700 relative`} 
          style={{ width: `${(fighter.hp/fighter.maxHp)*100}%` }}
        >
          <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
        </div>
      </div>

      {/* 武器列表：移动端紧凑显示 */}
      <div className={`mt-1.5 flex flex-wrap gap-0.5 ${!isLeft ? 'justify-end' : 'justify-start'}`}>
        {ownedWeapons.slice(0, 5).map(w => (
          <span 
            key={w.id} 
            className={`px-1 py-0.5 bg-slate-800/90 text-orange-400 text-[7px] md:text-[8px] font-black rounded border border-orange-500/10 truncate max-w-[40px] md:max-w-none ${w.isArtifact ? 'border-amber-400/30 text-amber-300' : ''}`}
            title={w.name}
          >
            {isMobile ? w.name.substring(0, 2) : w.name}
          </span>
        ))}
        {ownedWeapons.length > 5 && <span className="text-[7px] text-slate-500 ml-1">+{ownedWeapons.length - 5}</span>}
      </div>
    </div>
  );
};

export default CombatStatus;
