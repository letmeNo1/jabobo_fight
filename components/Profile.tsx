
import React, { useState, useEffect } from 'react';
import { CharacterData } from '../types';
import { DRESSINGS } from '../constants';
import CharacterVisual from './CharacterVisual';
import { calculateTotalCP } from '../utils/combatPower';

interface ProfileProps {
  player: CharacterData;
  isDebugMode?: boolean;
}

const Profile: React.FC<ProfileProps> = ({ player, isDebugMode = false }) => {
  const [frame, setFrame] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(prev => (prev % 2) + 1);
    }, 800);
    return () => clearInterval(timer);
  }, []);

  const getDressingName = (part: 'HEAD' | 'BODY' | 'WEAPON') => {
    const id = player.dressing[part];
    return DRESSINGS.find(d => d.id === id)?.name;
  };

  const expToNext = player.level * 100;
  const expPercentage = Math.min(100, (player.exp / expToNext) * 100);
  const totalCP = calculateTotalCP(player);

  const getPowerRank = (cp: number) => {
    if (cp < 500) return { title: '初入江湖', color: 'text-slate-400', glow: 'shadow-slate-500/20' };
    if (cp < 1000) return { title: '略有小成', color: 'text-emerald-500', glow: 'shadow-emerald-500/20' };
    if (cp < 2000) return { title: '炉火纯青', color: 'text-blue-500', glow: 'shadow-blue-500/20' };
    if (cp < 4000) return { title: '出类拔萃', color: 'text-purple-500', glow: 'shadow-purple-500/20' };
    if (cp < 7000) return { title: '傲视群雄', color: 'text-orange-500', glow: 'shadow-orange-500/20' };
    return { title: '武圣降世', color: 'text-red-600', glow: 'shadow-red-500/40' };
  };

  const rank = getPowerRank(totalCP);

  return (
    <div className="relative group overflow-visible">
      {/* Decorative Outer Glow */}
      <div className={`absolute -inset-4 bg-gradient-to-br from-orange-500/10 to-indigo-500/10 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-700`}></div>
      
      <div className="relative bg-white/90 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-2xl border border-white/50 flex flex-col h-full ring-1 ring-black/5">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <h3 className="text-3xl font-black italic text-slate-900 uppercase leading-none tracking-tighter">
              {player.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Fighter</span>
               <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
               <span className={`text-[10px] font-black uppercase tracking-widest ${rank.color}`}>{rank.title}</span>
            </div>
          </div>
          <div className="relative flex flex-col items-end">
            <div className="absolute -top-1 -right-1 w-12 h-12 bg-indigo-500/10 rounded-full blur-xl"></div>
            <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Power Score</div>
            <div className="text-4xl font-black text-indigo-700 italic drop-shadow-md leading-none">
              ⚡ {totalCP}
            </div>
          </div>
        </div>

        {/* Hero Stage */}
        <div className="relative w-full h-72 flex items-center justify-center mb-6 bg-slate-100/30 rounded-[2rem] border border-slate-200/50 overflow-hidden shadow-inner">
          {/* Animated Pedestal */}
          <div className="absolute bottom-[10%] w-48 h-12 bg-gradient-to-t from-orange-500/20 to-transparent rounded-[100%] blur-xl animate-pulse"></div>
          <div className="absolute bottom-[14%] w-40 h-1 bg-orange-500/40 rounded-full blur-[2px] shadow-[0_0_20px_rgba(249,115,22,0.6)]"></div>
          
          <div className="absolute top-4 right-4 z-20">
            <div className="flex flex-col items-center bg-white/80 backdrop-blur-md px-3 py-2 rounded-2xl border border-white shadow-lg">
              <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Level</span>
              <span className="text-lg font-black text-orange-600 leading-none">{player.level}</span>
            </div>
          </div>

          <div className="scale-110 md:scale-125 transform transition-transform duration-500 hover:scale-135">
            <CharacterVisual 
              name={player.name}
              state="HOME"
              frame={frame}
              weaponId={player.dressing.WEAPON}
              // Fixed: isDebugMode prop was changed to debug to match CharacterVisualProps
              debug={isDebugMode}
              accessory={{
                head: getDressingName('HEAD'),
                body: getDressingName('BODY'),
                weapon: getDressingName('WEAPON')
              }}
            />
          </div>
        </div>

        {/* Exp Bar */}
        <div className="mb-8 px-2">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Experience Progress</span>
            <span className="text-[10px] font-mono text-indigo-600 font-black">{player.exp} / {expToNext}</span>
          </div>
          <div className="w-full h-3 bg-slate-200/50 rounded-full overflow-hidden border border-white shadow-inner p-[2px]">
            <div 
              className="h-full bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400 rounded-full transition-all duration-1000 relative shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              style={{ width: `${expPercentage}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div className="bg-gradient-to-br from-rose-50 to-white p-4 rounded-3xl border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-rose-400 font-black uppercase">Health</span>
              <span className="text-xs filter drop-shadow-sm">❤️</span>
            </div>
            <p className="text-2xl font-black text-rose-700 leading-none">{player.maxHp}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-white p-4 rounded-3xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-orange-400 font-black uppercase">Strength</span>
              <span className="text-xs filter drop-shadow-sm">⚔️</span>
            </div>
            <p className="text-2xl font-black text-orange-700 leading-none">{player.str}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-white p-4 rounded-3xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-emerald-400 font-black uppercase">Agility</span>
              <span className="text-xs filter drop-shadow-sm">💨</span>
            </div>
            <p className="text-2xl font-black text-emerald-700 leading-none">{player.agi}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-3xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-blue-400 font-black uppercase">Speed</span>
              <span className="text-xs filter drop-shadow-sm">⚡</span>
            </div>
            <p className="text-2xl font-black text-blue-700 leading-none">{player.spd}</p>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s linear infinite;
        }
      `}} />
    </div>
  );
};

export default Profile;
