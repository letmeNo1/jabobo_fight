
import React from 'react';
import { CharacterData } from '../types';
import { WEAPONS, SKILLS } from '../constants';
import { calculateWeaponCP, calculateSkillCP } from '../utils/combatPower';

interface SkillListProps {
  player: CharacterData;
  onBack: () => void;
}

const SkillList: React.FC<SkillListProps> = ({ player, onBack }) => {
  const ownedWeapons = WEAPONS.filter(w => player.weapons.includes(w.id));
  const ownedSkills = SKILLS.filter(s => player.skills.includes(s.id));

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[60vh] animate-popIn">
      <div className="p-6 border-b flex justify-between items-center bg-blue-50">
        <div>
          <h2 className="text-xl font-bold text-blue-700">我的武库 & 秘籍</h2>
          <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Mastery Collection</p>
        </div>
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 font-bold">返回主页</button>
      </div>

      <div className="p-6">
        <section className="mb-10">
          <h3 className="text-xs font-black text-gray-400 uppercase mb-4 tracking-widest flex items-center gap-2">
            已掌握武器 <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">{ownedWeapons.length}</span>
          </h3>
          {ownedWeapons.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ownedWeapons.map(w => {
                const cp = calculateWeaponCP(w);
                return (
                  <div key={w.id} className={`p-4 rounded-xl border transition-all relative overflow-hidden ${w.isArtifact ? 'bg-amber-50 border-amber-200 shadow-sm shadow-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                    {w.isArtifact && (
                      <div className="absolute top-0 right-0">
                        <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[9px] font-black px-3 py-1 italic uppercase shadow-sm">神器</div>
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-lg ${w.isArtifact ? 'text-amber-800' : 'text-slate-700'}`}>{w.name}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${w.isArtifact ? 'bg-amber-200 text-amber-700' : 'bg-gray-200 text-gray-500'}`}>{w.type}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] text-slate-400 font-black uppercase leading-none">Power Score</div>
                        <div className={`text-sm font-black italic ${w.isArtifact ? 'text-orange-600' : 'text-slate-500'}`}>{cp}</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 pr-8 leading-relaxed">{w.description}</p>
                    <div className="flex justify-between items-center mt-auto border-t border-black/5 pt-2">
                      <span className="text-[10px] text-orange-500 font-black italic">ATK: {w.baseDmg[0]}-{w.baseDmg[1]}</span>
                      <span className="text-[9px] text-slate-300 font-bold uppercase">{w.module} MOD</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
              <p className="text-slate-300 italic text-sm font-bold">空手入白刃？目前还赤手空拳...</p>
            </div>
          )}
        </section>

        <section>
          <h3 className="text-xs font-black text-gray-400 uppercase mb-4 tracking-widest flex items-center gap-2">
            领悟技能 <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">{ownedSkills.length}</span>
          </h3>
          {ownedSkills.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ownedSkills.map(s => {
                const cp = calculateSkillCP(s);
                return (
                  <div key={s.id} className="p-4 rounded-xl border border-blue-50 bg-blue-50/20 group hover:border-blue-200 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-700">{s.name}</span>
                        <span className="text-[9px] bg-blue-100 px-2 py-0.5 rounded-full text-blue-600 font-black uppercase">{s.category}</span>
                      </div>
                      <span className="text-xs font-black text-blue-400/50 italic">+{cp} CP</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed italic pr-4">{s.description}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
              <p className="text-slate-300 italic text-sm font-bold">暂未领悟任何江湖绝学。</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SkillList;
