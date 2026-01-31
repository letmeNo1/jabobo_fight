
import React from 'react';
import { CharacterData } from '../types';
import { WEAPONS, SKILLS } from '../constants';

interface SkillListProps {
  player: CharacterData;
  onBack: () => void;
}

const SkillList: React.FC<SkillListProps> = ({ player, onBack }) => {
  const ownedWeapons = WEAPONS.filter(w => player.weapons.includes(w.id));
  const ownedSkills = SKILLS.filter(s => player.skills.includes(s.id));

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[60vh]">
      <div className="p-6 border-b flex justify-between items-center bg-blue-50">
        <h2 className="text-xl font-bold text-blue-700">我的武库 & 秘籍</h2>
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 font-bold">返回主页</button>
      </div>

      <div className="p-6">
        <section className="mb-8">
          <h3 className="text-xs font-black text-gray-400 uppercase mb-4 tracking-widest">已掌握武器 ({ownedWeapons.length})</h3>
          {ownedWeapons.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ownedWeapons.map(w => (
                <div key={w.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-700">{w.name}</span>
                    <span className="text-[10px] bg-gray-200 px-1.5 rounded text-gray-500 font-bold">{w.type}</span>
                  </div>
                  <p className="text-xs text-gray-400">{w.description}</p>
                  <p className="text-[10px] mt-1 text-orange-500 font-bold">基础伤害: {w.baseDmg[0]}-{w.baseDmg[1]}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 italic text-sm">你目前还赤手空拳...</p>
          )}
        </section>

        <section>
          <h3 className="text-xs font-black text-gray-400 uppercase mb-4 tracking-widest">领悟技能 ({ownedSkills.length})</h3>
          {ownedSkills.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ownedSkills.map(s => (
                <div key={s.id} className="p-3 rounded-lg border border-gray-100 bg-orange-50/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-700">{s.name}</span>
                    <span className="text-[10px] bg-blue-100 px-1.5 rounded text-blue-500 font-bold">{s.category}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{s.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 italic text-sm">暂未领悟任何江湖绝学。</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default SkillList;
