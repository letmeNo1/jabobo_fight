
import React, { useState, useEffect } from 'react';
import { CharacterData, Weapon, Skill, WeaponType, SkillCategory, Dressing } from './types';
import { WEAPONS, SKILLS, DRESSINGS } from './constants';
import Profile from './components/Profile';
import Combat from './components/Combat';
import DressingRoom from './components/DressingRoom';
import SkillList from './components/SkillList';

const INITIAL_DATA: CharacterData = {
  level: 1,
  exp: 0,
  gold: 500,
  str: 5,
  agi: 5,
  spd: 5,
  maxHp: 60, // 50 + 1 * 10
  weapons: [],
  skills: [],
  dressing: { HEAD: '', BODY: '', WEAPON: '' },
  unlockedDressings: [],
  isConcentrated: false
};

const App: React.FC = () => {
  const [player, setPlayer] = useState<CharacterData>(() => {
    const saved = localStorage.getItem('qfight_save');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });
  const [view, setView] = useState<'HOME' | 'COMBAT' | 'DRESSING' | 'SKILLS'>('HOME');
  const [levelUpResults, setLevelUpResults] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem('qfight_save', JSON.stringify(player));
  }, [player]);

  const handleLevelUp = (currentData: CharacterData) => {
    const nextLvl = currentData.level + 1;
    const results: string[] = [`恭喜！你升到了等级 ${nextLvl}！`];
    let newData = { ...currentData, level: nextLvl, exp: 0 };
    newData.maxHp = 50 + nextLvl * 10;

    // 基础奖励：随机属性
    const stats = ['str', 'agi', 'spd'] as const;
    const randomStat = stats[Math.floor(Math.random() * stats.length)];
    const bonus = newData.isConcentrated ? 2 : 1;
    newData[randomStat] += bonus;
    results.push(`基础属性：${randomStat === 'str' ? '力量' : randomStat === 'agi' ? '敏捷' : '速度'} +${bonus}`);

    // 技能/武器奖励
    const isNextGuaranteed = newData.isConcentrated;
    const roll = Math.random();
    
    // 保底判定
    const weaponCount = newData.weapons.length;
    let mustGetWeapon = false;
    if (nextLvl === 5 && weaponCount < 1) mustGetWeapon = true;
    if (nextLvl === 10 && weaponCount < 2) mustGetWeapon = true;
    if (nextLvl === 15 && weaponCount < 3) mustGetWeapon = true;

    if (mustGetWeapon || isNextGuaranteed || roll < 0.9) {
      // 获得新技能或武器
      const availableWeapons = WEAPONS.filter(w => !newData.weapons.includes(w.id));
      const availableSkills = SKILLS.filter(s => 
        !newData.skills.includes(s.id) && (!s.minLevel || nextLvl >= s.minLevel)
      );

      const pool = [...availableWeapons.map(w => ({ type: 'WEAPON', item: w })), 
                    ...availableSkills.map(s => ({ type: 'SKILL', item: s }))];

      if (pool.length > 0) {
        const choice = pool[Math.floor(Math.random() * pool.length)];
        if (choice.type === 'WEAPON') {
          newData.weapons.push(choice.item.id);
          results.push(`获得新武器：${choice.item.name}`);
        } else {
          newData.skills.push(choice.item.id);
          const skill = choice.item as Skill;
          results.push(`获得新技能：${skill.name}`);
          // 基础属性类技能立刻生效
          if (skill.id === 's1') newData.str += 5;
          if (skill.id === 's2') newData.agi += 5;
          if (skill.id === 's3') newData.spd += 5;
          if (skill.id === 's4') newData.maxHp += 20;
          if (skill.id === 's5') { newData.str += 2; newData.agi += 2; newData.spd += 2; }
        }
        newData.isConcentrated = false;
      }
    } else {
      // 潜心状态
      newData.isConcentrated = true;
      results.push(`进入「潜心状态」：本次无奖励，下次必出且本次属性加成翻倍！`);
    }

    setPlayer(newData);
    setLevelUpResults(results);
  };

  const handleBattleWin = (gainedGold: number, gainedExp: number) => {
    let newExp = player.exp + gainedExp;
    let nextLvlThreshold = player.level * 100;
    let tempPlayer = { ...player, gold: player.gold + gainedGold, exp: newExp };

    if (newExp >= nextLvlThreshold) {
      handleLevelUp(tempPlayer);
    } else {
      setPlayer(tempPlayer);
    }
    setView('HOME');
  };

  const handleBattleLoss = (gainedExp: number) => {
    let newExp = player.exp + gainedExp;
    let nextLvlThreshold = player.level * 100;
    let tempPlayer = { ...player, exp: newExp };
    if (newExp >= nextLvlThreshold) {
      handleLevelUp(tempPlayer);
    } else {
      setPlayer(tempPlayer);
    }
    setView('HOME');
  };

  const handleReset = () => {
    if (window.confirm('确定要重置人物吗？所有进度（等级、武器、金币、装扮）都将永久丢失，且不可恢复！')) {
      localStorage.removeItem('qfight_save');
      setPlayer(INITIAL_DATA);
      setView('HOME');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen font-sans text-gray-800">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-orange-600 cursor-pointer" onClick={() => setView('HOME')}>Q-Fight Master</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm font-medium">💰 {player.gold}</div>
          <div className="text-sm font-medium">✨ Lv.{player.level}</div>
          <button 
            onClick={handleReset}
            className="text-[10px] bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 px-2 py-1 rounded transition-colors uppercase font-bold"
          >
            重置
          </button>
        </div>
      </header>

      {levelUpResults.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-bounce-short">
            <h2 className="text-xl font-bold mb-4 text-orange-500">🎉 升级啦！</h2>
            <ul className="space-y-2 mb-6">
              {levelUpResults.map((r, i) => <li key={i} className="text-gray-700">{r}</li>)}
            </ul>
            <button 
              onClick={() => setLevelUpResults([])}
              className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold hover:bg-orange-600 transition"
            >
              太棒了
            </button>
          </div>
        </div>
      )}

      {view === 'HOME' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Profile player={player} />
          <div className="space-y-4">
            <button onClick={() => setView('COMBAT')} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl text-xl font-bold shadow-lg shadow-orange-200 transition-all flex items-center justify-center space-x-2">
              <span>⚔️</span> <span>匹配挑战 (等级 {player.level-2}~{player.level+2})</span>
            </button>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('SKILLS')} className="bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all">
                📜 技能武器
              </button>
              <button onClick={() => setView('DRESSING')} className="bg-purple-500 hover:bg-purple-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-purple-100 transition-all">
                👗 换装系统
              </button>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">成长进度</h3>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div className="bg-orange-400 h-full transition-all duration-500" style={{ width: `${(player.exp / (player.level * 100)) * 100}%` }}></div>
              </div>
              <p className="text-xs text-right mt-1 text-gray-500">{player.exp} / {player.level * 100} EXP</p>
            </div>
          </div>
        </div>
      )}

      {view === 'COMBAT' && (
        <Combat player={player} onWin={handleBattleWin} onLoss={handleBattleLoss} />
      )}

      {view === 'DRESSING' && (
        <DressingRoom player={player} setPlayer={setPlayer} onBack={() => setView('HOME')} />
      )}

      {view === 'SKILLS' && (
        <SkillList player={player} onBack={() => setView('HOME')} />
      )}
    </div>
  );
};

export default App;
