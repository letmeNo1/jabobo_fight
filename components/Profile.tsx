
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

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-black italic text-slate-800 uppercase">我的大乐斗</h3>
          <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Combat Profile</p>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">Combat Power</div>
          <div className="text-2xl font-black text-indigo-700 italic">⚡ {totalCP}</div>
        </div>
      </div>

      <div className="relative w-full h-56 flex items-center justify-center mb-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.05),transparent)]"></div>
        <div className="absolute top-2 right-2 z-20">
          <span className="text-xs font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-100 shadow-sm">
            Lv. {player.level}
          </span>
        </div>
        <CharacterVisual 
          name={player.name}
          state="HOME"
          frame={frame}
          weaponId={player.dressing.WEAPON}
          debug={isDebugMode}
          accessory={{
            head: getDressingName('HEAD'),
            body: getDressingName('BODY'),
            weapon: getDressingName('WEAPON')
          }}
        />
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-1 px-1">
          <span className="text-[10px] font-black text-slate-400 uppercase">经验值 EXP</span>
          <span className="text-[10px] font-mono text-slate-600 font-bold">{player.exp} / {expToNext}</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-[1px]">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000"
            style={{ width: `${expPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 group hover:bg-rose-100 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-rose-400 font-black uppercase">生命值 HP</span>
            <span className="text-xs">❤️</span>
          </div>
          <p className="text-xl font-black text-rose-700">{player.maxHp}</p>
        </div>
        <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 group hover:bg-orange-100 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-orange-400 font-black uppercase">力量 STR</span>
            <span className="text-xs">⚔️</span>
          </div>
          <p className="text-xl font-black text-orange-700">{player.str}</p>
        </div>
        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 group hover:bg-emerald-100 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-emerald-400 font-black uppercase">敏捷 AGI</span>
            <span className="text-xs">💨</span>
          </div>
          <p className="text-xl font-black text-emerald-700">{player.agi}</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 group hover:bg-blue-100 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-blue-400 font-black uppercase">速度 SPD</span>
            <span className="text-xs">⚡</span>
          </div>
          <p className="text-xl font-black text-blue-700">{player.spd}</p>
        </div>
      </div>
      
      <div className="text-[10px] text-slate-400 font-bold text-center italic mt-auto">
        当前闪避率: <span className="text-emerald-500">{Math.min(30, player.agi + (player.skills.includes('s13') ? 7 : 0))}%</span>
        {player.isConcentrated && <span className="ml-2 text-indigo-500">✨ 潜心状态中</span>}
      </div>
    </div>
  );
};

export default Profile;
