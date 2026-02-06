
import React from 'react';
import { FighterSnapshot, WeaponType } from '../types';
import { WEAPONS, SKILLS } from '../constants';
import { playUISound } from '../utils/audio';

interface GrandmasterChallengeProps {
  playerLevel: number;
  onChallenge: (master: FighterSnapshot) => void;
  onBack: () => void;
}

const GrandmasterChallenge: React.FC<GrandmasterChallengeProps> = ({ playerLevel, onChallenge, onBack }) => {
  
  const generateMaster = (type: 'PROJECTILE' | 'LARGE' | 'MEDIUM' | 'SKILL'): FighterSnapshot => {
    const lvl = Math.max(10, playerLevel + 5);
    // Added level property to baseStats to fix missing property errors in FighterSnapshot return types
    const baseStats = {
      level: lvl,
      hp: 800 + lvl * 20,
      maxHp: 800 + lvl * 20,
      str: 20 + lvl,
      agi: 20 + lvl,
      spd: 20 + lvl,
      dressing: { HEAD: 'h3', BODY: 'b3', WEAPON: 'ws1' }
    };

    switch (type) {
      case 'PROJECTILE':
        return {
          ...baseStats,
          name: '暗器至尊·唐门',
          spd: baseStats.spd + 30,
          agi: baseStats.agi + 10,
          weapons: WEAPONS.filter(w => w.type === WeaponType.SMALL || w.type === WeaponType.THROW).map(w => w.id).sort(() => 0.5 - Math.random()).slice(0, 6),
          skills: ['s3', 's9', 's15', 's25']
        };
      case 'LARGE':
        return {
          ...baseStats,
          name: '巨刃战神·雷震',
          str: baseStats.str + 40,
          hp: baseStats.hp + 200,
          maxHp: baseStats.maxHp + 200,
          weapons: WEAPONS.filter(w => w.type === WeaponType.LARGE).map(w => w.id).sort(() => 0.5 - Math.random()).slice(0, 5),
          skills: ['s1', 's14', 's12', 's20']
        };
      case 'MEDIUM':
        return {
          ...baseStats,
          name: '均衡宗师·无名',
          agi: baseStats.agi + 25,
          spd: baseStats.spd + 15,
          weapons: WEAPONS.filter(w => w.type === WeaponType.MEDIUM).map(w => w.id).sort(() => 0.5 - Math.random()).slice(0, 5),
          skills: ['s2', 's6', 's13', 's23']
        };
      case 'SKILL':
        return {
          ...baseStats,
          name: '秘籍尊者·玄难',
          weapons: ['w6', 'w17'],
          skills: ['s30', 's29', 's26', 's24', 's18', 's32']
        };
    }
  };

  const masters = [
    { id: 'PROJECTILE', title: '暗器大师', desc: '身法诡谲，指尖惊雷。', color: 'border-emerald-500 bg-emerald-50 text-emerald-700', icon: '🎯' },
    { id: 'LARGE', title: '大型武器大师', desc: '一力降十会，势如破竹。', color: 'border-orange-500 bg-orange-50 text-orange-700', icon: '🔨' },
    { id: 'MEDIUM', title: '中型武器大师', desc: '攻守兼备，滴水不漏。', color: 'border-blue-500 bg-blue-50 text-blue-700', icon: '⚔️' },
    { id: 'SKILL', title: '技能大师', desc: '通晓百家，变化莫测。', color: 'border-purple-500 bg-purple-50 text-purple-700', icon: '📜' },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[70vh] flex flex-col animate-popIn border border-slate-200">
      <div className="p-6 md:p-8 border-b flex justify-between items-center bg-slate-900 text-white">
        <div>
          <h2 className="text-2xl font-black italic tracking-tighter uppercase">🏆 大师挑战赛</h2>
          <p className="text-[10px] text-slate-400 font-black tracking-[0.3em] uppercase mt-1">Grandmaster Tournament</p>
        </div>
        <button onClick={onBack} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl font-black text-sm transition-all border border-white/10">返回主页</button>
      </div>

      <div className="p-6 md:p-10 flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50">
        {masters.map(m => (
          <div key={m.id} className={`p-8 rounded-[2rem] border-2 shadow-sm flex flex-col items-center text-center transition-all hover:shadow-xl hover:-translate-y-1 ${m.color}`}>
            <div className="text-6xl mb-4 bg-white/50 w-24 h-24 flex items-center justify-center rounded-3xl shadow-inner border border-white/20">
              {m.icon}
            </div>
            <h3 className="text-xl font-black mb-2 uppercase italic">{m.title}</h3>
            <p className="text-sm font-medium opacity-80 mb-8 max-w-[200px] leading-relaxed">
              {m.desc}
            </p>
            <button 
              onClick={() => {
                playUISound('CLICK');
                onChallenge(generateMaster(m.id as any));
              }}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-black/10 active:scale-95 transition-all"
            >
              挑战挑战
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GrandmasterChallenge;
