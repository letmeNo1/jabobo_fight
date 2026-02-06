
import React, { useState, useEffect } from 'react';
import { CharacterData, Weapon, Skill, WeaponType, SkillCategory, Dressing, Friend } from './types';
import { WEAPONS, SKILLS, DRESSINGS } from './constants';
import Profile from './components/Profile';
import Combat, { SpecialCombatMode } from './components/Combat';
import DressingRoom from './components/DressingRoom';
import SkillList from './components/SkillList';
import TestPanel from './components/TestPanel';
import LoadingScreen from './components/LoadingScreen';
import FriendList from './components/FriendList';
import RedeemCode from './components/RedeemCode';
import { initDB, getCachedAsset, cacheAsset, deleteDB } from './utils/db';
import { playUISound, preloadAudio, resumeAudio } from './utils/audio';
import { calculateTotalCP } from './utils/combatPower';
import config from './config';

declare global {
  interface Window {
    assetMap: Map<string, string>;
  }
}

const INITIAL_DATA: CharacterData = {
  name: '乐斗小豆',
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
  isConcentrated: false,
  friends: []
};

interface BattleResult {
  isWin: boolean;
  gold: number;
  exp: number;
}

const App: React.FC = () => {
  const [player, setPlayer] = useState<CharacterData>(() => {
    const saved = localStorage.getItem('qfight_save');
    const data = saved ? JSON.parse(saved) : INITIAL_DATA;
    if (!data.name) data.name = INITIAL_DATA.name;
    if (!data.friends) data.friends = [];
    return data;
  });
  const [view, setView] = useState<'HOME' | 'COMBAT' | 'DRESSING' | 'SKILLS' | 'TEST' | 'FRIENDS'>('HOME');
  const [combatMode, setCombatMode] = useState<SpecialCombatMode>('NORMAL');
  const [targetFriend, setTargetFriend] = useState<Friend | null>(null);
  const [levelUpResults, setLevelUpResults] = useState<string[]>([]);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);

  const totalCP = calculateTotalCP(player);

  useEffect(() => {
    window.assetMap = new Map<string, string>();
    const assetBase = 'Images/';
    const soundBase = 'Sounds/';
    const stateConfigs: Record<string, number> = {
      home: 2, idle: 2, run: 5, atk: 4, hurt: 1, dodge: 1,
      jump: 1, cleave: 3, slash: 3, pierce: 4, swing: 4, throw: 3, punch: 2, wave: 3
    };

    const coreImages = ['character.png'];
    const animationImages: string[] = [];
    const commonStates = ['home', 'idle', 'run', 'hurt', 'dodge'];

    Object.entries(stateConfigs).forEach(([prefix, count]) => {
      for (let i = 1; i <= count; i++) {
        // 1. 基础动作图片 (wave1.png 等)
        animationImages.push(`${prefix}${i}.png`);
        
        // 2. 武器/皮肤关联的特效图片 (s29_wave1.png 等)
        WEAPONS.forEach(w => {
          animationImages.push(`${w.id}_${prefix}${i}.png`);
        });
        SKILLS.forEach(s => {
          animationImages.push(`${s.id}_${prefix}${i}.png`);
        });
      }
    });

    // 3. 飞行物图片 (s29_projectile.png 等)
    WEAPONS.forEach(w => {
      animationImages.push(`${w.id}_throw.png`);
      animationImages.push(`${w.id}_projectile.png`);
    });
    SKILLS.forEach(s => {
      animationImages.push(`${s.id}_throw.png`);
      animationImages.push(`${s.id}_projectile.png`);
    });

    const soundIds = [
      'heavy_swing', 'heavy_hit', 'toy_hit', 'slash', 'blunt_hit', 'pierce', 'bow_shot', 
      'pan_hit', 'slash_light', 'pierce_light', 'swing_light', 'squeak', 'throw_knife', 
      'throw_light', 'bottle_break', 'throw_hit', 'punch', 'hurt', 'skill_cast',
      'thunder', 'wind_storm', 'drink', 'sticky', 'wing_flap', 'kick_combo', 
      'rapid_throw', 'roar', 'scratch', 'master_arrive', 'dragon_roar', 'buddha_palm', 'blood_drain',
      'ui_click', 'ui_equip', 'ui_buy', 'ui_levelup', 'battle_win', 'battle_loss'
    ];

    const imagePaths = [...new Set([...coreImages, ...animationImages])].map(p => `${assetBase}${p}`);
    const soundPaths = soundIds.map(id => `${soundBase}${id}.mp3`);
    const totalResourcePaths = [...imagePaths, ...soundPaths];
    
    setTotalAssets(totalResourcePaths.length);

    const loadAll = async () => {
      const loadingTimeout = setTimeout(() => {
        if (loading) {
          setLoading(false);
        }
      }, 15000);

      let db: IDBDatabase | null = null;
      try { db = await initDB(); } catch (e) { console.warn("IndexedDB init failed", e); }
      let loadedCount = 0;
      const CHUNK_SIZE = 10; 

      for (let i = 0; i < totalResourcePaths.length; i += CHUNK_SIZE) {
        const chunk = totalResourcePaths.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (path) => {
          try {
            const isSound = path.endsWith('.mp3');
            const assetName = isSound ? path.split('/').pop()?.replace('.mp3', '') : path;
            
            let cachedBlob: Blob | null = db ? await getCachedAsset(db, path) : null;
            
            if (cachedBlob) {
              if (isSound) {
                const arrayBuffer = await cachedBlob.arrayBuffer();
                await preloadAudio(assetName!, arrayBuffer);
              } else {
                window.assetMap.set(path, URL.createObjectURL(cachedBlob));
              }
            } else {
              const controller = new AbortController();
              const id = setTimeout(() => controller.abort(), 8000);
              const response = await fetch(path, { signal: controller.signal });
              clearTimeout(id);
              if (response.ok) {
                const blob = await response.blob();
                if (db) await cacheAsset(db, path, blob);
                if (isSound) {
                  const arrayBuffer = await blob.arrayBuffer();
                  await preloadAudio(assetName!, arrayBuffer);
                } else {
                  window.assetMap.set(path, URL.createObjectURL(blob));
                }
              }
            }
          } catch (err) {} finally {
            loadedCount++;
            setLoadProgress(prev => prev + 1);
          }
        }));
      }
      clearTimeout(loadingTimeout);
      setTimeout(() => setLoading(false), 500);
    };
    loadAll();
    return () => {
      window.assetMap.forEach(url => url.startsWith('blob:') && URL.revokeObjectURL(url));
      window.assetMap.clear();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('qfight_save', JSON.stringify(player));
  }, [player]);

  const resetProgress = () => {
    if (window.confirm('确定要重置所有进度吗？')) {
      resumeAudio();
      playUISound('CLICK');
      setPlayer(INITIAL_DATA);
      localStorage.removeItem('qfight_save');
      setView('HOME');
    }
  };

  const clearAssetCache = () => {
    if (window.confirm('确定要清除所有本地素材缓存并重新下载吗？')) {
      resumeAudio();
      playUISound('CLICK');
      deleteDB();
      window.location.reload();
    }
  };

  const handleLevelUp = (currentData: CharacterData) => {
    playUISound('LEVEL_UP');
    const nextLvl = currentData.level + 1;
    const results: string[] = [`恭喜！你升到了等级 ${nextLvl}！`];
    let newData = { ...currentData, level: nextLvl, exp: 0, maxHp: 290 + nextLvl * 10 };
    const stats = ['str', 'agi', 'spd'] as const;
    const randomStat = stats[Math.floor(Math.random() * stats.length)];
    const bonus = newData.isConcentrated ? 2 : 1;
    newData[randomStat] += bonus;
    results.push(`基础属性：${randomStat === 'str' ? '力量' : randomStat === 'agi' ? '敏捷' : '速度'} +${bonus}`);
    
    if (newData.isConcentrated || Math.random() < 0.9) {
      const pool = [
        ...WEAPONS.filter(w => !newData.weapons.includes(w.id) && w.id !== 'w21').map(w => ({ type: 'WEAPON', item: w })), 
        ...SKILLS.filter(s => !newData.skills.includes(s.id) && s.id !== 's29' && (!s.minLevel || nextLvl >= s.minLevel)).map(s => ({ type: 'SKILL', item: s }))
      ];
      
      if (pool.length > 0) {
        const choice = pool[Math.floor(Math.random() * pool.length)];
        if (choice.type === 'WEAPON') {
          newData.weapons.push(choice.item.id);
          results.push(`获得新武器：${choice.item.name}`);
        } else {
          newData.skills.push(choice.item.id);
          results.push(`获得新技能：${choice.item.name}`);
          if (choice.item.id === 's1') newData.str += 5;
          if (choice.item.id === 's2') newData.agi += 5;
          if (choice.item.id === 's3') newData.spd += 5;
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
    playUISound('WIN');
    setBattleResult({ isWin: true, gold: gainedGold, exp: gainedExp });
    let newExp = player.exp + gainedExp;
    let nextLvlThreshold = player.level * 100;
    let tempPlayer = { ...player, gold: player.gold + gainedGold, exp: newExp };
    if (newExp >= nextLvlThreshold) handleLevelUp(tempPlayer);
    else setPlayer(tempPlayer);
  };

  const handleBattleLoss = (gainedExp: number) => {
    playUISound('LOSS');
    setBattleResult({ isWin: false, gold: 0, exp: gainedExp });
    let newExp = player.exp + gainedExp;
    let nextLvlThreshold = player.level * 100;
    let tempPlayer = { ...player, exp: newExp };
    if (newExp >= nextLvlThreshold) handleLevelUp(tempPlayer);
    else setPlayer(tempPlayer);
  };

  const startCombat = (mode: SpecialCombatMode) => {
    resumeAudio();
    playUISound('CLICK');
    setCombatMode(mode);
    setTargetFriend(null);
    setView('COMBAT');
  };

  const challengeFriend = (friend: Friend) => {
    resumeAudio();
    playUISound('CLICK');
    setTargetFriend(friend);
    setCombatMode('NORMAL');
    setView('COMBAT');
  };

  const getViewMaxWidth = () => {
    if (view === 'TEST') return config.layout.maxWidthTest;
    if (view === 'COMBAT') return config.layout.maxWidthCombat;
    return config.layout.maxWidthHome;
  };

  if (loading) return <LoadingScreen progress={loadProgress} total={totalAssets} />;

  return (
    <div 
      className={`${getViewMaxWidth()} mx-auto ${config.layout.paddingMobile} ${config.layout.paddingPC} min-h-screen font-sans text-gray-800 transition-all duration-700`}
      onClick={resumeAudio}
    >
      <header className="relative z-[100] flex flex-col sm:flex-row justify-between items-center mb-4 md:mb-6 bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 gap-3">
        <h1 className="text-lg md:text-2xl font-bold text-orange-600 cursor-pointer" onClick={() => {playUISound('CLICK'); setView('HOME');}}>Q-Fight Master</h1>
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
          <button onClick={clearAssetCache} className="text-[9px] md:text-[10px] bg-emerald-50 text-emerald-600 px-2.5 md:px-3 py-1 rounded-full font-black uppercase border border-emerald-100">重装素材</button>
          <button onClick={resetProgress} className="text-[9px] md:text-[10px] bg-rose-50 text-rose-500 px-2.5 md:px-3 py-1 rounded-full font-black uppercase border border-rose-100">重置</button>
          <button onClick={() => {playUISound('CLICK'); setView('TEST');}} className="text-[9px] md:text-[10px] bg-indigo-50 text-indigo-500 px-2.5 md:px-3 py-1 rounded-full font-black uppercase border border-indigo-100">实验室</button>
          <div className="flex items-center space-x-2 md:space-x-4 text-xs md:text-sm font-black">
            <span className="text-slate-600">💰 {player.gold}</span>
            <span className="text-slate-600">✨ Lv.{player.level}</span>
            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 italic">⚡ {totalCP}</span>
          </div>
        </div>
      </header>

      {battleResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] p-4 backdrop-blur-md">
          <div className={`bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-sm shadow-2xl border-t-[10px] animate-popIn ${battleResult.isWin ? 'border-orange-500' : 'border-slate-50'}`}>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">{battleResult.isWin ? '🏆' : '💀'}</div>
              <h2 className="text-3xl font-black italic uppercase">{battleResult.isWin ? 'Victory' : 'Defeat'}</h2>
            </div>
            <div className="space-y-3 mb-8">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                <span className="text-slate-400 font-black text-[10px] uppercase">Gained Gold</span>
                <span className="text-xl font-black text-yellow-600">+{battleResult.gold}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                <span className="text-slate-400 font-black text-[10px] uppercase">Gained Exp</span>
                <span className="text-xl font-black text-blue-600">+{battleResult.exp}</span>
              </div>
            </div>
            <button onClick={() => {playUISound('CLICK'); setBattleResult(null); setView('HOME');}} className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-xl active:scale-95 ${battleResult.isWin ? 'bg-orange-500 shadow-orange-100' : 'bg-slate-700 shadow-slate-100'}`}>确定</button>
          </div>
        </div>
      )}

      {levelUpResults.length > 0 && !battleResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[310] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border-b-8 border-blue-500 animate-popIn">
            <h2 className="text-2xl font-black mb-6 text-blue-600 text-center italic">✨ Level Up!</h2>
            <ul className="space-y-2 mb-8 text-sm">
              {levelUpResults.map((r, i) => <li key={i} className="bg-blue-50 p-3 rounded-xl border border-blue-100">{r}</li>)}
            </ul>
            <button onClick={() => {playUISound('CLICK'); setLevelUpResults([]);}} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black">收下了</button>
          </div>
        </div>
      )}

      {view === 'HOME' && (
        <>
          <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-8 animate-popIn mb-8">
            <Profile player={player} isDebugMode={isDebugMode} />
            <div className="space-y-3 md:space-y-4">
              <button onClick={() => startCombat('NORMAL')} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 md:py-5 rounded-xl text-lg md:text-xl font-black shadow-lg shadow-orange-100 transition-all active:scale-95 flex items-center justify-center space-x-2"><span>⚔️</span> <span>开启对决</span></button>
              <button onClick={() => {resumeAudio(); playUISound('CLICK'); setView('FRIENDS');}} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl text-base md:text-lg font-black shadow-lg shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center space-x-2"><span>👥</span> <span>江湖好友</span></button>
              <button onClick={() => startCombat('ELITE')} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 md:py-4 rounded-xl text-base md:text-lg font-black shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2"><span>🔱</span> <span>精英挑战</span></button>
              <button onClick={() => startCombat('PROJECTILE')} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 md:py-4 rounded-xl text-base md:text-lg font-black shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2"><span>🎯</span> <span>暗器大师挑战</span></button>
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                <button onClick={() => {resumeAudio(); playUISound('CLICK'); setView('SKILLS');}} className="bg-blue-500 hover:bg-blue-600 text-white py-3 md:py-4 rounded-xl font-bold shadow-lg shadow-blue-100 active:scale-95">📜 秘籍</button>
                <button onClick={() => {resumeAudio(); playUISound('CLICK'); setView('DRESSING');}} className="bg-purple-500 hover:bg-purple-600 text-white py-3 md:py-4 rounded-xl font-bold shadow-lg shadow-purple-100 active:scale-95">👗 装扮</button>
              </div>
            </div>
          </div>
          <RedeemCode player={player} setPlayer={setPlayer} />
        </>
      )}

      {view === 'COMBAT' && (
        <Combat 
          player={player} 
          specialMode={combatMode} 
          customOpponent={targetFriend}
          isDebugMode={isDebugMode} 
          onWin={handleBattleWin} 
          onLoss={handleBattleLoss} 
        />
      )}
      {view === 'DRESSING' && <DressingRoom player={player} setPlayer={setPlayer} onBack={() => {playUISound('CLICK'); setView('HOME');}} />}
      {view === 'SKILLS' && <SkillList player={player} onBack={() => {playUISound('CLICK'); setView('HOME');}} />}
      {view === 'TEST' && <TestPanel player={player} isDebugMode={isDebugMode} onBack={() => {playUISound('CLICK'); setView('HOME');}} />}
      {view === 'FRIENDS' && (
        <FriendList 
          player={player} 
          onBack={() => {playUISound('CLICK'); setView('HOME');}} 
          onChallenge={challengeFriend}
          onAddFriend={(f) => setPlayer(p => ({...p, friends: [f, ...p.friends]}))}
          onRemoveFriend={(id) => setPlayer(p => ({...p, friends: p.friends.filter(f => f.id !== id)}))}
        />
      )}
    </div>
  );
};

export default App;
