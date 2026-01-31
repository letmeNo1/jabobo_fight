import React, { useState, useEffect } from 'react';
import { CharacterData, Weapon, Skill, WeaponType, SkillCategory, Dressing } from './types';
import { WEAPONS, SKILLS, DRESSINGS } from './constants';
import Profile from './components/Profile';
import Combat from './components/Combat';
import DressingRoom from './components/DressingRoom';
import SkillList from './components/SkillList';
import TestPanel from './components/TestPanel';

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
  const [view, setView] = useState<'HOME' | 'COMBAT' | 'DRESSING' | 'SKILLS' | 'TEST'>('HOME');
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
    
    const pool = [...WEAPONS.filter(w => !newData.weapons.includes(w.id)).map(w => ({ type: 'WEAPON', item: w })), 
                  ...SKILLS.filter(s => !newData.skills.includes(s.id) && (!s.minLevel || nextLvl >= s.minLevel)).map(s => ({ type: 'SKILL', item: s }))];

    if (isNextGuaranteed || roll < 0.9) {
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
    if (newExp >= nextLvlThreshold) handleLevelUp(tempPlayer);
    else setPlayer(tempPlayer);
  };

  const handleBattleLoss = (gainedExp: number) => {
    setBattleResult({ isWin: false, gold: 0, exp: gainedExp });
    let newExp = player.exp + gainedExp;
    let nextLvlThreshold = player.level * 100;
    let tempPlayer = { ...player, exp: newExp };
    if (newExp >= nextLvlThreshold) handleLevelUp(tempPlayer);
    else setPlayer(tempPlayer);
  };

  return (
    <div className={`${view === 'TEST' ? 'max-w-[1440px]' : view === 'COMBAT' ? 'max-w-6xl' : 'max-w-4xl'} mx-auto p-4 md:p-8 min-h-screen font-sans text-gray-800 transition-all duration-700`}>
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-orange-600 cursor-pointer" onClick={() => setView('HOME')}>Q-Fight Master</h1>
        <div className="flex items-center space-x-4">
          <button onClick={() => setView('TEST')} className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-500 px-3 py-1 rounded-full font-black uppercase tracking-tighter transition-colors">实验室</button>
          <div className="flex space-x-3 text-sm font-medium">
            <span>💰 {player.gold}</span>
            <span>✨ Lv.{player.level}</span>
          </div>
        </div>
      </header>

      {battleResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] p-4 backdrop-blur-md">
          <div className={`bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] border-t-[12px] transform animate-popIn ${battleResult.isWin ? 'border-orange-500' : 'border-slate-500'}`}>
            <div className="text-center mb-8">
              <div className={`text-7xl mb-4 filter drop-shadow-xl ${battleResult.isWin ? 'animate-bounce' : 'grayscale brightness-50'}`}>{battleResult.isWin ? '🏆' : '💀'}</div>
              <h2 className={`text-4xl font-black italic tracking-tighter uppercase ${battleResult.isWin ? 'text-orange-500' : 'text-slate-600'}`}>{battleResult.isWin ? 'Victory' : 'Defeat'}</h2>
              <p className="text-slate-400 text-xs font-bold tracking-[0.2em] mt-1 uppercase">{battleResult.isWin ? '大获全胜' : '惜败离场'}</p>
            </div>
            <div className="space-y-4 mb-10">
              <div className="flex justify-between items-center bg-slate-50 p-5 rounded-3xl border border-slate-100 shadow-inner">
                <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Gained Gold</span>
                <span className="text-2xl font-black text-yellow-600">+{battleResult.gold}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-5 rounded-3xl border border-slate-100 shadow-inner">
                <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Gained Exp</span>
                <span className="text-2xl font-black text-blue-600">+{battleResult.exp}</span>
              </div>
            </div>
            <button onClick={() => {setBattleResult(null); setView('HOME');}} className={`w-full py-5 rounded-3xl font-black text-white text-lg shadow-xl transition-all active:scale-95 ${battleResult.isWin ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 shadow-orange-200' : 'bg-gradient-to-r from-slate-700 to-slate-800 hover:brightness-110 shadow-slate-200'}`}>打扫战场</button>
          </div>
        </div>
      )}

      {levelUpResults.length > 0 && !battleResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[310] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border-b-8 border-blue-500 animate-popIn">
            <h2 className="text-2xl font-black mb-6 text-blue-600 text-center italic tracking-tight">✨ Level Up Bonus!</h2>
            <ul className="space-y-2 mb-8 text-sm">
              {levelUpResults.map((r, i) => (
                <li key={i} className="text-slate-700 bg-blue-50/50 p-3 rounded-2xl border border-blue-100 font-medium">
                  {r.startsWith('获得新') ? <span className="text-orange-600 font-bold">🎁 {r}</span> : r}
                </li>
              ))}
            </ul>
            <button onClick={() => setLevelUpResults([])} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200">收下了！</button>
          </div>
        </div>
      )}

      {view === 'HOME' && (
        <div className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-8">
          <Profile player={player} />
          <div className="space-y-4">
            <button onClick={() => setView('COMBAT')} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-5 rounded-xl text-lg md:text-xl font-black shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center space-x-2"><span>⚔️</span> <span>开启对决</span></button>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <button onClick={() => setView('SKILLS')} className="bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95">📜 秘籍</button>
              <button onClick={() => setView('DRESSING')} className="bg-purple-500 hover:bg-purple-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-purple-100 transition-all active:scale-95">👗 装扮</button>
            </div>
          </div>
        </div>
      )}

      {view === 'COMBAT' && <Combat player={player} onWin={handleBattleWin} onLoss={handleBattleLoss} />}
      {view === 'DRESSING' && <DressingRoom player={player} setPlayer={setPlayer} onBack={() => setView('HOME')} />}
      {view === 'SKILLS' && <SkillList player={player} onBack={() => setView('HOME')} />}
      {view === 'TEST' && <TestPanel player={player} onBack={() => setView('HOME')} />}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-popIn { animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}} />
    </div>
  );
};

export default App;