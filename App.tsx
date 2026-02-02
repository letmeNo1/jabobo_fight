import React, { useState, useEffect } from 'react';
import { CharacterData, Weapon, Skill, WeaponType, SkillCategory, Dressing } from './types';
import { WEAPONS, SKILLS, DRESSINGS } from './constants';
import Profile from './components/Profile';
import Combat, { SpecialCombatMode } from './components/Combat';
import DressingRoom from './components/DressingRoom';
import SkillList from './components/SkillList';
import TestPanel from './components/TestPanel';
import LoadingScreen from './components/LoadingScreen';

// 定义全局资源缓存映射
declare global {
  interface Window {
    assetMap: Map<string, string>;
  }
}

const INITIAL_DATA: CharacterData = {
  level: 1,
  exp: 0,
  gold: 500,
  str: 5,
  agi: 5,
  spd: 5,
  maxHp: 300,
  weapons: [],
  skills: [],
  dressing: { HEAD: '', BODY: '', WEAPON: '' },
  unlockedDressings: [],
  isConcentrated: false
};

// IndexedDB 配置
const DB_NAME = 'QFightAssetsDB';
const STORE_NAME = 'images';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getCachedAsset = async (db: IDBDatabase, key: string): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
};

const cacheAsset = async (db: IDBDatabase, key: string, blob: Blob): Promise<void> => {
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(blob, key);
    transaction.oncomplete = () => resolve();
  });
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
  const [combatMode, setCombatMode] = useState<SpecialCombatMode>('NORMAL');
  const [levelUpResults, setLevelUpResults] = useState<string[]>([]);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);

  useEffect(() => {
    window.assetMap = new Map<string, string>();
    const assetBase = 'Images/';
    const stateConfigs: Record<string, number> = {
      home: 2, idle: 2, run: 5, atk: 4, hurt: 1, dodge: 1,
      jump: 1, cleave: 3, slash: 3, pierce: 4, swing: 4, throw: 3, punch: 2
    };

    const coreImages = ['character.png'];
    const animationImages: string[] = [];
    
    const commonStates = ['home', 'idle', 'run', 'hurt', 'dodge'];

    Object.entries(stateConfigs).forEach(([prefix, count]) => {
      for (let i = 1; i <= count; i++) {
        animationImages.push(`${prefix}${i}.png`);
        WEAPONS.forEach(w => {
          const weaponModule = w.module.toLowerCase();
          // 加载动作帧
          if (commonStates.includes(prefix) || prefix === weaponModule) {
            animationImages.push(`${w.id}_${prefix}${i}.png`);
          }
        });
        SKILLS.forEach(s => {
          if (s.module) {
            const skillModule = s.module.toLowerCase();
            if (prefix === skillModule) {
              animationImages.push(`${s.id}_${prefix}${i}.png`);
            }
          }
        });
      }
    });

    // 额外扫描：加载武器的投掷贴图 (wID_throw.png)
    WEAPONS.forEach(w => {
      animationImages.push(`${w.id}_throw.png`);
    });

    const allPaths = [...new Set([...coreImages, ...animationImages])].map(p => `${assetBase}${p}`);
    setTotalAssets(allPaths.length);

    const loadAll = async () => {
      let db: IDBDatabase | null = null;
      try {
        db = await initDB();
      } catch (e) {
        console.warn("IndexedDB init failed", e);
      }

      let loadedCount = 0;
      const CHUNK_SIZE = 25;

      for (let i = 0; i < allPaths.length; i += CHUNK_SIZE) {
        const chunk = allPaths.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (path) => {
          try {
            let blob: Blob | null = null;
            if (db) {
              blob = await getCachedAsset(db, path);
            }

            if (!blob) {
              const response = await fetch(path);
              if (response.ok) {
                blob = await response.blob();
                if (db) await cacheAsset(db, path, blob);
              }
            }

            if (blob) {
              const blobUrl = URL.createObjectURL(blob);
              window.assetMap.set(path, blobUrl);
            }
          } catch (err) {
            // Silently ignore 404s for non-existent optional textures
          } finally {
            loadedCount++;
            setLoadProgress(prev => prev + 1);
          }
        }));
      }
      setTimeout(() => setLoading(false), 800);
    };

    loadAll();

    return () => {
      window.assetMap.forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
      window.assetMap.clear();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('qfight_save', JSON.stringify(player));
  }, [player]);

  const resetProgress = () => {
    if (window.confirm('确定要重置所有进度吗？此操作不可撤销，您的等级、金币和装备将被清空。')) {
      setPlayer(INITIAL_DATA);
      localStorage.removeItem('qfight_save');
      setView('HOME');
    }
  };

  const clearAssetCache = () => {
    if (window.confirm('确定要清除所有本地素材缓存并重新下载吗？')) {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => {
        window.location.reload();
      };
      request.onerror = () => {
        alert('清除失败，请手动清理浏览器数据库。');
      };
    }
  };

  const handleLevelUp = (currentData: CharacterData) => {
    const nextLvl = currentData.level + 1;
    const results: string[] = [`恭喜！你升到了等级 ${nextLvl}！`];
    let newData = { ...currentData, level: nextLvl, exp: 0 };
    newData.maxHp = 290 + nextLvl * 10;
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

  const startCombat = (mode: SpecialCombatMode) => {
    setCombatMode(mode);
    setView('COMBAT');
  };

  if (loading) {
    return <LoadingScreen progress={loadProgress} total={totalAssets} />;
  }

  return (
    <div className={`${view === 'TEST' ? 'max-w-[1440px]' : view === 'COMBAT' ? 'max-w-6xl' : 'max-w-4xl'} mx-auto p-3 md:p-8 min-h-screen font-sans text-gray-800 transition-all duration-700`}>
      <header className="relative z-[100] flex flex-col sm:flex-row justify-between items-center mb-4 md:mb-6 bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 gap-3">
        <h1 className="text-lg md:text-2xl font-bold text-orange-600 cursor-pointer" onClick={() => setView('HOME')}>Q-Fight Master</h1>
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 md:px-3 py-1 rounded-full border border-slate-200">
            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase">调试</span>
            <button 
              onClick={() => setIsDebugMode(!isDebugMode)}
              className={`w-7 h-3.5 md:w-8 md:h-4 rounded-full relative transition-colors ${isDebugMode ? 'bg-orange-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-0.5 w-2.5 h-2.5 md:w-3 md:h-3 bg-white rounded-full transition-transform ${isDebugMode ? 'translate-x-3 md:translate-x-4.5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <button onClick={clearAssetCache} className="text-[9px] md:text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-2.5 md:px-3 py-1 rounded-full font-black uppercase tracking-tighter transition-colors active:scale-95 border border-emerald-100">重装素材</button>
          <button onClick={resetProgress} className="text-[9px] md:text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-500 px-2.5 md:px-3 py-1 rounded-full font-black uppercase tracking-tighter transition-colors active:scale-95 border border-rose-100">重置</button>
          <button onClick={() => setView('TEST')} className="text-[9px] md:text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-500 px-2.5 md:px-3 py-1 rounded-full font-black uppercase tracking-tighter transition-colors active:scale-95 border border-indigo-100">实验室</button>
          <div className="flex space-x-2 md:space-x-3 text-xs md:text-sm font-black text-slate-600">
            <span>💰 {player.gold}</span>
            <span>✨ Lv.{player.level}</span>
          </div>
        </div>
      </header>

      {battleResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] p-4 backdrop-blur-md">
          <div className={`bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-sm shadow-2xl border-t-[10px] md:border-t-[12px] transform animate-popIn ${battleResult.isWin ? 'border-orange-500' : 'border-slate-500'}`}>
            <div className="text-center mb-6 md:mb-8">
              <div className={`text-6xl md:text-7xl mb-4 filter drop-shadow-xl ${battleResult.isWin ? 'animate-bounce' : 'grayscale brightness-50'}`}>{battleResult.isWin ? '🏆' : '💀'}</div>
              <h2 className={`text-3xl md:text-4xl font-black italic tracking-tighter uppercase ${battleResult.isWin ? 'text-orange-500' : 'text-slate-600'}`}>{battleResult.isWin ? 'Victory' : 'Defeat'}</h2>
              <p className="text-slate-400 text-xs font-bold tracking-[0.2em] mt-1 uppercase">{battleResult.isWin ? '大获全胜' : '惜败离场'}</p>
            </div>
            <div className="space-y-3 md:space-y-4 mb-8 md:mb-10">
              <div className="flex justify-between items-center bg-slate-50 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-100 shadow-inner">
                <span className="text-slate-400 font-black text-[9px] md:text-[10px] uppercase tracking-widest">Gained Gold</span>
                <span className="text-xl md:text-2xl font-black text-yellow-600">+{battleResult.gold}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-100 shadow-inner">
                <span className="text-slate-400 font-black text-[9px] md:text-[10px] uppercase tracking-widest">Gained Exp</span>
                <span className="text-xl md:text-2xl font-black text-blue-600">+{battleResult.exp}</span>
              </div>
            </div>
            <button onClick={() => {setBattleResult(null); setView('HOME');}} className={`w-full py-4 md:py-5 rounded-2xl md:rounded-3xl font-black text-white text-base md:text-lg shadow-xl transition-all active:scale-95 ${battleResult.isWin ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 shadow-orange-200' : 'bg-gradient-to-r from-slate-700 to-slate-800 hover:brightness-110 shadow-slate-200'}`}>确定</button>
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
        <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-8">
          <Profile player={player} isDebugMode={isDebugMode} />
          <div className="space-y-3 md:space-y-4">
            <button onClick={() => startCombat('NORMAL')} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 md:py-5 rounded-xl text-lg md:text-xl font-black shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center space-x-2"><span>⚔️</span> <span>开启对决</span></button>
            <button onClick={() => startCombat('ELITE')} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 md:py-4 rounded-xl text-base md:text-lg font-black shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center space-x-2 border-b-4 border-indigo-900/30"><span>🔱</span> <span>精英挑战 (综合武艺)</span></button>
            <button onClick={() => startCombat('PROJECTILE')} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 md:py-4 rounded-xl text-base md:text-lg font-black shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center space-x-2 border-b-4 border-emerald-900/30"><span>🎯</span> <span>暗器大师挑战 (纯飞行道具)</span></button>
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <button onClick={() => setView('SKILLS')} className="bg-blue-500 hover:bg-blue-600 text-white py-3 md:py-4 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95">📜 秘籍</button>
              <button onClick={() => setView('DRESSING')} className="bg-purple-500 hover:bg-purple-600 text-white py-3 md:py-4 rounded-xl font-bold shadow-lg shadow-purple-100 transition-all active:scale-95">👗 装扮</button>
            </div>
          </div>
        </div>
      )}

      {view === 'COMBAT' && <Combat player={player} specialMode={combatMode} isDebugMode={isDebugMode} onWin={handleBattleWin} onLoss={handleBattleLoss} />}
      {view === 'DRESSING' && <DressingRoom player={player} setPlayer={setPlayer} onBack={() => setView('HOME')} />}
      {view === 'SKILLS' && <SkillList player={player} onBack={() => setView('HOME')} />}
      {view === 'TEST' && <TestPanel player={player} isDebugMode={isDebugMode} onBack={() => setView('HOME')} />}

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