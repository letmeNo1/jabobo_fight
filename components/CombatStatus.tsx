import React from 'react';
import { WEAPONS } from '../constants';
import config from '../config';
import { calculateTotalCP } from '../utils/combatPower';

interface CombatStatusProps {
  fighter: any; 
  side: 'left' | 'right';
  uiScale: number;
  label: string;
}

const CombatStatus: React.FC<CombatStatusProps> = ({ fighter, side, uiScale, label }) => {
  const isLeft = side === 'left';
  const barDir = isLeft ? 'r' : 'l';

  const cfg = config.combat.status;
  const m = cfg.mobile;
  const p = cfg.pc;

  const getCls = (key: keyof typeof config.combat.status.mobile) => 
    `${m[key]} ${p[key]}`;

  const ownedWeapons = WEAPONS.filter(w => fighter.weapons.includes(w.id));
  const totalCP = calculateTotalCP(fighter);
  const hpPercent = (fighter.hp / fighter.maxHp) * 100;

  return (
    <div 
      className={`absolute ${side}-0 top-0 ${cfg.widthMobile} ${cfg.widthPC} ${cfg.maxWidth} pointer-events-auto group flex flex-col ${isLeft ? 'items-start text-left' : 'items-end text-right'}`}
      style={{ transform: `scale(${uiScale})`, transformOrigin: `top ${side}` }}
    >
      {/* 1. 顶部：标签与战斗力 */}
      <div className={`w-full flex flex-col ${isLeft ? 'items-start' : 'items-end'} ${getCls('spacing')} mb-1.5 ${isLeft ? 'pl-2' : 'pr-2'}`}>
        <div className={`flex items-center gap-1.5 w-full ${isLeft ? 'justify-start' : 'justify-end'}`}>
          {isLeft ? (
            <>
              <span className={`bg-orange-600 ${getCls('paddingX')} ${getCls('paddingY')} ${getCls('labelFontSize')} rounded-l-xl italic font-black text-white shadow-lg`}>{label}</span>
              <span className={`bg-slate-700/90 ${getCls('paddingX')} ${getCls('paddingY')} ${getCls('levelFontSize')} rounded-r-xl border-r-2 border-slate-500/50 text-white`}>Lv.{fighter.level}</span>
              <span className={`${getCls('cpFontSize')} text-indigo-400 italic font-black ml-1`}>⚡ {totalCP}</span>
            </>
          ) : (
            <>
              {/* NPC 顺序镜像 */}
              <span className={`${getCls('cpFontSize')} text-indigo-400 italic font-black mr-1`}>⚡ {totalCP}</span>
              <span className={`bg-slate-700/90 ${getCls('paddingX')} ${getCls('paddingY')} ${getCls('levelFontSize')} rounded-l-xl border-l-2 border-slate-500/50 text-white`}>Lv.{fighter.level}</span>
              <span className={`bg-red-600 ${getCls('paddingX')} ${getCls('paddingY')} ${getCls('labelFontSize')} rounded-r-xl italic font-black text-white shadow-lg`}>{label}</span>
            </>
          )}
        </div>
        
        {/* 状态图标对齐 */}
        <div className={`flex gap-1 w-full ${isLeft ? 'justify-start' : 'justify-end'}`}>
           {fighter.status.disarmed > 0 && <span className={`${getCls('badgeFontSize')} bg-rose-600 px-1.5 rounded-md animate-pulse text-white font-bold text-[9px]`}>🚫</span>}
           {fighter.status.dots.length > 0 && <span className={`${getCls('badgeFontSize')} bg-purple-600 px-1.5 rounded-md text-white font-bold text-[9px]`}>🤢</span>}
        </div>
      </div>

      {/* 2. 血条容器：w-full 确保它撑开 */}
      <div className={`relative w-full ${getCls('barHeight')} bg-black/70 rounded-${barDir}-2xl border-2 border-slate-500/50 overflow-hidden shadow-inner`}>
        {/* 进度条：NPC 侧需要 ml-auto 来让空槽留在左边 */}
        <div 
          className={`h-full bg-gradient-to-${barDir} ${isLeft ? 'from-emerald-600 to-green-400' : 'from-red-700 to-rose-500 ml-auto'} transition-all duration-700 relative z-10`} 
          style={{ width: `${hpPercent}%` }}
        >
          <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
        </div>

        {/* 血条内居中文字 */}
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <span className={`${getCls('barTextFontSize')} font-mono text-white font-black drop-shadow-[0_1px_3px_rgba(0,0,0,1)] italic`}>
            {Math.ceil(fighter.hp)} <span className="opacity-50 text-[0.8em]">/ {fighter.maxHp}</span>
          </span>
        </div>
      </div>

      {/* 3. 底部武器：NPC 侧靠右排列 */}
      <div className={`mt-2 flex flex-wrap gap-1.5 w-full ${isLeft ? 'justify-start pl-2' : 'justify-end pr-2'}`}>
        {ownedWeapons.map(w => (
          <span key={w.id} className={`px-2 py-0.5 bg-slate-900/80 text-orange-400 ${getCls('itemFontSize')} font-black rounded-lg border border-orange-500/30 shadow-md`}>
            {w.isArtifact ? '✨' : '⚔️'} {w.name}
          </span>
        ))}
        {ownedWeapons.length === 0 && <span className={`${getCls('itemFontSize')} text-slate-500 italic`}>空手</span>}
      </div>
    </div>
  );
};

export default CombatStatus;