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
  maxHp: 60,
  weapons: [],
  skills: [],
  dressing: { HEAD: '', BODY: '', WEAPON: '' },
  unlockedDressings: [],
  isConcentrated: false
};

interface BattleResult {
  isWin: boolean;
  gold: number;
  exp: number;
}

const App: React.FC = () => {
  const [player, setPlayer] = useState<CharacterData>(() => {
    const saved = localStorage.getItem('qfight_save');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });
  const [view, setView] = useState<'HOME' | 'COMBAT' | 'DRESSING' | 'SKILLS'>('HOME');
  const [levelUpResults, setLevelUpResults] = useState<string[]>([]);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

  useEffect(() => {
    localStorage.setItem('qfight_save', JSON.stringify(player));
  }, [player]);

  const handleLevelUp = (currentData: CharacterData) => {
    const nextLvl = currentData.level + 1;
    const results: string[] = [`恭喜！你升到了等级 ${nextLvl}！`];
    let newData = { ...currentData, level: nextLvl, exp: 0 };
    newData.maxHp = 50 + nextLvl * 10;

    const stats = ['str', 'agi', 'spd'] as const;
    const randomStat = stats[Math.floor(Math.random() * stats.length)];
    const bonus = newData.isConcentrated ? 2 : 1;
    newData[randomStat] += bonus;
    results.push(`基础属性：${randomStat === 'str' ? '力量' : randomStat === 'agi' ? '敏捷' : '速度'} +${bonus}`);

    const isNextGuaranteed = newData.isConcentrated;
    const roll = Math.random();
    
    const weaponCount = newData.weapons.length;
    let mustGetWeapon = false;
    if (nextLvl === 5 && weaponCount < 1) mustGetWeapon = true;
    if (nextLvl === 10 && weaponCount < 2) mustGetWeapon = true;
    if (nextLvl === 15 && weaponCount < 3) mustGetWeapon = true;

    if (mustGetWeapon || isNextGuaranteed || roll < 0.9) {
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
          if (skill.id === 's1') newData.str += 5;
          if (skill.id === 's2') newData.agi += 5;
          if (skill.id === 's3') newData.spd += 5;
          if (skill.id === 's4') newData.maxHp += 20;
          if (skill.id === 's5') { newData.str += 2; newData.agi += 2; newData.spd += 2; }
        }
        newData.isConcentrated = false;
      }
    } else {
      newData.isConcentrated = true;
      results.push(`进入「潜心状态」：本次无奖励，下次必出且本次属性加成翻倍！`);
    }

    setPlayer(newData);
    setLevelUpResults(results);
  };

  const handleBattleWin = (gainedGold: number, gainedExp: number) => {
    setBattleResult({ isWin: true, gold: gainedGold, exp: gainedExp });
    let newExp = player.exp + gainedExp;
    let nextLvlThreshold = player.level * 100;
    let tempPlayer = { ...player, gold: player.gold + gainedGold, exp: newExp };
    
    if (newExp >= nextLvlThreshold) {
      handleLevelUp(tempPlayer);
    } else {
      setPlayer(tempPlayer);
    }
  };

  const handleBattleLoss = (gainedExp: number) => {
    setBattleResult({ isWin: false, gold: 0, exp: gainedExp });
    let newExp = player.exp + gainedExp;
    let nextLvlThreshold = player.level * 100;
    let tempPlayer = { ...player, exp: newExp };
    
    if (newExp >= nextLvlThreshold) {
      handleLevelUp(tempPlayer);
    } else {
      setPlayer(tempPlayer);
    }
  };

  const closeResult = () => {
    setBattleResult(null);
    setView('HOME');
  };

  const handleReset = () => {
    if (window.confirm('确定要重置人物吗？')) {
      localStorage.removeItem('qfight_save');
      setPlayer(INITIAL_DATA);
      setView('HOME');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen font-sans text-gray-800">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-orange-600 cursor-pointer" onClick={() => setView('HOME')}>Q-Fight Master</h1>
        <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex space-x-3 text-sm font-medium">
            <span>💰 {player.gold}</span>
            <span>✨ Lv.{player.level}</span>
          </div>
          <button 
            onClick={handleReset}
            className="text-[10px] bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 px-2 py-1 rounded transition-colors uppercase font-bold"
          >
            重置
          </button>
        </div>
      </header>

      {/* 战斗结算界面弹窗 */}
      {battleResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
          <div className={`bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border-t-8 transform animate-popIn ${battleResult.isWin ? 'border-orange-500' : 'border-gray-500'}`}>
            <div className="text-center mb-6">
              <div className={`text-6xl mb-4 ${battleResult.isWin ? 'animate-bounce' : 'grayscale'}`}>
                {battleResult.isWin ? '🏆' : '💀'}
              </div>
              <h2 className={`text-3xl font-black italic tracking-tighter ${battleResult.isWin ? 'text-orange-500' : 'text-gray-500'}`}>
                {battleResult.isWin ? '大 获 全 胜' : '惜 败 离 场'}
              </h2>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <span className="text-gray-400 font-bold text-sm">获得金币</span>
                <span className="text-xl font-black text-yellow-600">+{battleResult.gold}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <span className="text-gray-400 font-bold text-sm">获得经验</span>
                <span className="text-xl font-black text-blue-600">+{battleResult.exp}</span>
              </div>
            </div>

            {/* 如果同时升级了，在这里合并显示简略信息 */}
            {levelUpResults.length > 0 && (
              <div className="mb-6 p-4 bg-orange-50 rounded-2xl border border-orange-100 text-center">
                <p className="text-orange-600 font-black text-sm animate-pulse">✨ 等级提升至 Lv.{player.level} ✨</p>
              </div>
            )}

            <button 
              onClick={closeResult}
              className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-transform active:scale-95 ${battleResult.isWin ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-gray-700 hover:bg-gray-800 shadow-gray-200'}`}
            >
              确 定
            </button>
          </div>
        </div>
      )}

      {/* 升级详细面板（仅在关闭战斗结算且有升级结果时显示） */}
      {levelUpResults.length > 0 && !battleResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-orange-500 text-center">🎉 升级奖励详情</h2>
            <ul className="space-y-2 mb-6 text-sm">
              {levelUpResults.map((r, i) => <li key={i} className="text-gray-700 bg-gray-50 p-2 rounded">{r}</li>)}
            </ul>
            <button 
              onClick={() => setLevelUpResults([])}
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition"
            >
              太棒了
            </button>
          </div>
        </div>
      )}

      {view === 'HOME' && (
        <div className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-8">
          <Profile player={player} />
          <div className="space-y-4">
            <button onClick={() => setView('COMBAT')} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-5 rounded-xl text-lg md:text-xl font-black shadow-lg shadow-orange-200 transition-all flex items-center justify-center space-x-2 active:scale-95">
              <span>⚔️</span> <span>开启对决</span>
            </button>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <button onClick={() => setView('SKILLS')} className="bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95">
                📜 秘籍
              </button>
              <button onClick={() => setView('DRESSING')} className="bg-purple-500 hover:bg-purple-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-purple-100 transition-all active:scale-95">
                👗 装扮
              </button>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">成长进度</h3>
                <span className="text-[10px] text-gray-500">{player.exp} / {player.level * 100} EXP</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div className="bg-orange-400 h-full transition-all duration-500" style={{ width: `${(player.exp / (player.level * 100)) * 100}%` }}></div>
              </div>
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

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-popIn { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}} />
    </div>
  );
};

export default App;