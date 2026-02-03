
import React from 'react';
import { WEAPONS, SKILLS } from '../constants';
import config from '../config';

interface FighterDisplay {
  name: string;
  hp: number;
  maxHp: number;
  level: number;
  weapons: string[];
  skills: string[];
}

interface CombatStatusProps {
  fighter: FighterDisplay;
  side: 'left' | 'right';
  uiScale: number;
  label: string;
  isSpecial?: boolean;
}

const CombatStatus: React.FC<CombatStatusProps> = ({ fighter, side, uiScale, label, isSpecial }) => {
  const isLeft = side === 'left';
  const textAlign = isLeft ? 'text-left' : 'text-right';
  const barDir = isLeft ? 'r' : 'l';

  const renderAssets = () => {
    const ownedWeapons = WEAPONS.filter(w => fighter.weapons.includes(w.id));
    const ownedSkills = SKILLS.filter(s => fighter.skills.includes(s.id));
    return (
      <div className={`mt-3 md:mt-3 flex flex-col gap-2 md:gap-1.5 ${!isLeft ? 'items-end' : 'items-start'}`}>
        <div className={`flex flex-wrap gap-2 ${!isLeft ? 'justify-end' : 'justify-start'}`}>
          {ownedWeapons.map(w => (
            <span key={w.id} className="px-3 md:px-2 py-1 md:py-0.5 bg-slate-800/95 text-orange-400 text-[18px] md:text-[10px] font-black rounded-lg border-2 border-orange-500/40 shadow-xl whitespace-nowrap">⚔️ {w.name}</span>
          ))}
        </div>
        <div className={`flex flex-wrap gap-2 ${!isLeft ? 'justify-end' : 'justify-start'}`}>
          {ownedSkills.map(s => (
            <span key={s.id} className="px-3 md:px-2 py-1 md:py-0.5 bg-slate-800/95 text-blue-400 text-[18px] md:text-[10px] font-black rounded-lg border-2 border-blue-500/40 shadow-xl whitespace-nowrap">📜 {s.name}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`absolute ${side}-0 top-0 ${config.combat.status.widthMobile} ${config.combat.status.widthPC} ${config.combat.status.maxWidth} pointer-events-auto ${textAlign}`}
      style={{ transform: `scale(${uiScale})`, transformOrigin: `top ${side}` }}
    >
      <div className={`flex items-end text-white font-black mb-2 md:mb-1.5 drop-shadow-2xl uppercase tracking-tighter ${isLeft ? 'pl-2 md:pl-4' : 'pr-2 md:pr-4'}`}>
        {isLeft ? (
          <>
            <div className="flex items-center gap-2 md:gap-2">
              <span className="bg-orange-600 px-4 md:px-4 py-1.5 md:py-1 rounded-l-xl italic text-[22px] md:text-sm shadow-lg">{label}</span>
              <span className="bg-slate-700/90 px-3 md:px-3 py-1.5 md:py-1 rounded-r-xl border-r-2 border-slate-500/50 text-[20px] md:text-xs">Lv.{fighter.level}</span>
            </div>
            <span className="ml-auto font-mono text-[36px] md:text-xl text-emerald-400 pr-2 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">{Math.ceil(fighter.hp)}</span>
          </>
        ) : (
          <>
            <span className="font-mono text-[36px] md:text-xl text-rose-400 pl-2 drop-shadow-[0_0_10px_rgba(251,113,133,0.5)]">{Math.ceil(fighter.hp)}</span>
            <div className="flex items-center gap-2 md:gap-2 ml-auto">
              <span className="bg-slate-700/90 px-3 md:px-3 py-1.5 md:py-1 rounded-l-xl border-l-2 border-slate-500/50 text-[20px] md:text-xs">Lv.{fighter.level}</span>
              <span className={`${isSpecial ? 'bg-purple-600' : 'bg-red-600'} px-4 md:px-4 py-1.5 md:py-1 rounded-r-xl italic text-[22px] md:text-sm shadow-lg`}>{label}</span>
            </div>
          </>
        )}
      </div>
      <div className={`h-10 md:h-6 bg-black/70 rounded-${barDir}-2xl border-2 border-${barDir} border-slate-500/50 overflow-hidden shadow-[inset_0_4px_15px_rgba(0,0,0,0.7)]`}>
        <div 
          className={`h-full bg-gradient-to-${barDir} ${isLeft ? 'from-emerald-600 via-green-500 to-emerald-400' : 'from-red-700 via-rose-600 to-red-500 ml-auto'} transition-all duration-700 relative`} 
          style={{ width: `${(fighter.hp/fighter.maxHp)*100}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent h-1/2"></div>
        </div>
      </div>
      <div className={isLeft ? 'pl-2 md:pl-4' : 'pr-2 md:pr-4'}>{renderAssets()}</div>
    </div>
  );
};

export default CombatStatus;
