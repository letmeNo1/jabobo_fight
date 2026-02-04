
import React, { useState } from 'react';
import { WEAPONS, SKILLS } from '../constants';
import config from '../config';

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
  isSpecial?: boolean;
}

const CombatStatus: React.FC<CombatStatusProps> = ({ fighter, side, uiScale, label, isSpecial }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isLeft = side === 'left';
  const textAlign = isLeft ? 'text-left' : 'text-right';
  const barDir = isLeft ? 'r' : 'l';

  const ownedWeapons = WEAPONS.filter(w => fighter.weapons.includes(w.id));
  const ownedSkills = SKILLS.filter(s => fighter.skills.includes(s.id));

  return (
    <div 
      className={`absolute ${side}-0 top-0 ${config.combat.status.widthMobile} ${config.combat.status.widthPC} ${config.combat.status.maxWidth} pointer-events-auto ${textAlign} group`}
      style={{ transform: `scale(${uiScale})`, transformOrigin: `top ${side}` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Detail Tooltip */}
      <div className={`absolute top-full mt-4 transition-all duration-300 pointer-events-none z-[300]
        ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'}
        ${isLeft ? 'left-0' : 'right-0'}`}
      >
        <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-slate-700/50 rounded-2xl p-5 shadow-2xl min-w-[260px] ring-1 ring-white/10 text-left">
          <div className="flex justify-between items-center mb-4 border-b border-slate-700/50 pb-2">
            <div>
              <h4 className="text-white font-black italic text-lg uppercase">{fighter.name}</h4>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Combat Intel</p>
            </div>
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-black">Lv. {fighter.level}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-slate-800/50 p-2 rounded-xl border border-white/5">
              <p className="text-[8px] text-slate-500 font-black uppercase mb-1">STR</p>
              <p className="text-lg font-black text-orange-400">⚔️ {fighter.str}</p>
            </div>
            <div className="bg-slate-800/50 p-2 rounded-xl border border-white/5">
              <p className="text-[8px] text-slate-500 font-black uppercase mb-1">AGI</p>
              <p className="text-lg font-black text-emerald-400">💨 {fighter.agi}</p>
            </div>
          </div>

          <div>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2 px-1">Mastered Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {ownedSkills.length > 0 ? ownedSkills.map(s => (
                <span key={s.id} className="px-2 py-1 bg-blue-500/10 text-blue-300 text-[10px] font-bold rounded-lg border border-blue-500/20">
                  📜 {s.name}
                </span>
              )) : <span className="text-[10px] text-slate-600 italic px-1">No special skills</span>}
            </div>
          </div>
        </div>
      </div>

      <div className={`flex items-end text-white font-black mb-1.5 drop-shadow-2xl uppercase tracking-tighter ${isLeft ? 'pl-2' : 'pr-2'}`}>
        {isLeft ? (
          <>
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <span className="bg-orange-600 px-3 py-1 rounded-l-xl italic text-xs shadow-lg">{label}</span>
                <span className="bg-slate-700/90 px-2 py-1 rounded-r-xl border-r-2 border-slate-500/50 text-[10px]">Lv.{fighter.level}</span>
              </div>
              {/* Status Badges */}
              <div className="flex gap-1">
                {fighter.status.disarmed > 0 && <span className="text-[9px] bg-rose-600 px-1.5 rounded-md animate-pulse">🚫 缴械 {fighter.status.disarmed}</span>}
                {fighter.status.sticky > 0 && <span className="text-[9px] bg-yellow-600 px-1.5 rounded-md animate-pulse">🕸️ 黏住 {fighter.status.sticky}</span>}
                {fighter.status.afterimage > 0 && <span className="text-[9px] bg-cyan-600 px-1.5 rounded-md">✨ 残影</span>}
                {fighter.status.dots.length > 0 && <span className="text-[9px] bg-purple-600 px-1.5 rounded-md">🤢 中毒</span>}
              </div>
            </div>
            <span className="ml-auto font-mono text-2xl text-emerald-400 pr-1">{Math.ceil(fighter.hp)}</span>
          </>
        ) : (
          <>
            <span className="font-mono text-2xl text-rose-400 pl-1">{Math.ceil(fighter.hp)}</span>
            <div className="flex flex-col items-end gap-1 ml-auto">
              <div className="flex items-center gap-2">
                <span className="bg-slate-700/90 px-2 py-1 rounded-l-xl border-l-2 border-slate-500/50 text-[10px]">Lv.{fighter.level}</span>
                <span className="bg-red-600 px-3 py-1 rounded-r-xl italic text-xs shadow-lg">{label}</span>
              </div>
              {/* Status Badges */}
              <div className="flex gap-1">
                {fighter.status.dots.length > 0 && <span className="text-[9px] bg-purple-600 px-1.5 rounded-md text-white">中毒 🤢</span>}
                {fighter.status.afterimage > 0 && <span className="text-[9px] bg-cyan-600 px-1.5 rounded-md text-white">残影 ✨</span>}
                {fighter.status.sticky > 0 && <span className="text-[9px] bg-yellow-600 px-1.5 rounded-md text-white animate-pulse">黏住 {fighter.status.sticky} 🕸️</span>}
                {fighter.status.disarmed > 0 && <span className="text-[9px] bg-rose-600 px-1.5 rounded-md text-white animate-pulse">缴械 {fighter.status.disarmed} 🚫</span>}
              </div>
            </div>
          </>
        )}
      </div>

      <div className={`h-6 bg-black/70 rounded-${barDir}-2xl border-2 border-slate-500/50 overflow-hidden shadow-inner`}>
        <div 
          className={`h-full bg-gradient-to-${barDir} ${isLeft ? 'from-emerald-600 to-green-400' : 'from-red-700 to-rose-500 ml-auto'} transition-all duration-700 relative`} 
          style={{ width: `${(fighter.hp/fighter.maxHp)*100}%` }}
        >
          <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
        </div>
      </div>

      <div className={`mt-2 flex flex-wrap gap-1.5 ${!isLeft ? 'justify-end' : 'justify-start'} ${isLeft ? 'pl-2' : 'pr-2'}`}>
        {ownedWeapons.map(w => (
          <span key={w.id} className={`px-2 py-0.5 bg-slate-800/90 text-orange-400 text-[10px] font-black rounded-lg border border-orange-500/30 shadow-sm animate-popIn ${fighter.status.disarmed > 0 ? 'opacity-30 grayscale' : ''}`}>
            ⚔️ {w.name}
          </span>
        ))}
        {ownedWeapons.length === 0 && <span className="text-[10px] text-slate-500 italic">空手</span>}
      </div>
    </div>
  );
};

export default CombatStatus;
