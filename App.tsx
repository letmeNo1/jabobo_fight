
import React, { useState, useEffect } from 'react';
import { CharacterData, Weapon, Skill, WeaponType, SkillCategory, Dressing, Friend, BattleRecord, FighterSnapshot } from './types';
import { WEAPONS, SKILLS, DRESSINGS } from './constants';
import Profile from './components/Profile';
import Combat from './components/Combat';
import DressingRoom from './components/DressingRoom';
import SkillList from './components/SkillList';
import TestPanel from './components/TestPanel';
import LoadingScreen from './components/LoadingScreen';
import FriendList from './components/FriendList';
import RedeemCode from './components/RedeemCode';
import BattleHistory from './components/BattleHistory';
import GrandmasterChallenge from './components/GrandmasterChallenge';
import { initDB, getCachedAsset, cacheAsset, deleteDB } from './utils/db';
import { playSFX, playUISound, preloadAudio, resumeAudio } from './utils/audio';
import { calculateTotalCP } from './utils/combatPower';
import { simulateBattle } from './utils/combatEngine';
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

const App: React.FC = () => {
  const [player, setPlayer] = useState<CharacterData>(() => {
    const saved = localStorage.getItem('qfight_save');
    const data = saved ? JSON.parse(saved) : INITIAL_DATA;
    if (!data.name) data.name = INITIAL_DATA.name;
    if (!data.friends) data.friends = [];
    return data;
  });

  const [history, setHistory] = useState<BattleRecord[]>(() => {
    const saved = localStorage.getItem('qfight_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [view, setView] = useState<'HOME' | 'COMBAT' | 'DRESSING' | 'SKILLS' | 'TEST' | 'FRIENDS' | 'HISTORY' | 'CHALLENGE'>('HOME');
  const [activeRecord, setActiveRecord] = useState<BattleRecord | null>(null);
  const [isExplicitReplay, setIsExplicitReplay] = useState(false);
  const [battleResult, setBattleResult] = useState<{ isWin: boolean; gold: number; exp: number } | null>(null);
  const [levelUpResults, setLevelUpResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);

  const totalCP = calculateTotalCP(player);

  useEffect(() => {
    localStorage.setItem('qfight_save', JSON.stringify(player));
  }, [player]);

  useEffect(() => {
    localStorage.setItem('qfight_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    window.assetMap = new Map<string, string>();
    const assetBase = 'Images/';
    const soundBase = 'Sounds/';
    const stateConfigs: Record<string, number> = {
      home: 2, idle: 2, run: 5, atk: 4, hurt: 1, dodge: 1,
      jump: 1, cleave: 3, slash: 3, pierce: 4, swing: 4, throw: 4, punch: 2, kick: 3, spike:4
    };

    const coreImages = ['character.png'];
    const animationImages: string[] = [];
    
    // 生成全量动画帧列表
    Object.entries(stateConfigs).forEach(([prefix, count]) => {
      for (let i = 1; i <= count; i++) {
        animationImages.push(`${prefix}${i}.png`);
        WEAPONS.forEach(w => animationImages.push(`${w.id}_${prefix}${i}.png`));
        SKILLS.forEach(s => s.module && animationImages.push(`${s.id}_${s.module.toLowerCase()}${i}.png`));
      }
    });

    // 预加载所有飞行道具
    WEAPONS.forEach(w => {
      animationImages.push(`${w.id}_throw.png`); 
      animationImages.push(`${w.id}_projectile.png`); 
    });
    SKILLS.forEach(s => {
      if (s.module) {
        animationImages.push(`${s.id}_projectile.png`); 
        animationImages.push(`${s.id}_throw.png`);
      }
    });

    const soundIds = [
      'heavy_swing', 'heavy_hit', 'toy_hit', 'slash', 'blunt_hit', 'pierce', 'bow_shot', 
      'pan_hit', 'slash_light', 'pierce_light', 'swing_light', 'squeak', 'throw_knife', 
      'throw_light', 'bottle_break', 'throw_hit', 'punch', 'hurt', 'skill_cast',
      'thunder', 'wind_storm', 'drink', 'sticky', 'wing_flap', 'kick_combo', 
      'rapid_throw', 'roar', 'scratch', 'master_arrive', 'dragon_roar', 'buddha_palm', 'blood_drain',
      'ui_click', 'ui_equip', 'ui_buy', 'ui_levelup', 'battle_win', 'battle_loss',"draw_knife","draw_knife_hit"
    ];

    const imagePaths = [...new Set([...coreImages, ...animationImages])].map(p => `${assetBase}${p}`);
    const soundPaths = soundIds.map(id => `${soundBase}${id}.mp3`);
    const totalResourcePaths = [...imagePaths, ...soundPaths];
    setTotalAssets(totalResourcePaths.length);

    const loadAll = async () => {
      let db = null;
      try { db = await initDB(); } catch (e) {}
      
      // 取消分批次加载，改为全量并发加载，确保一次性就绪
      await Promise.all(totalResourcePaths.map(async (path) => {
        try {
          const isSound = path.endsWith('.mp3');
          const assetName = isSound ? path.split('/').pop()?.replace('.mp3', '') : path;
          let cached = db ? await getCachedAsset(db, path) : null;
          
          if (cached) {
            if (isSound) await preloadAudio(assetName!, await cached.arrayBuffer());
            else window.assetMap.set(path, URL.createObjectURL(cached));
          } else {
            const res = await fetch(path);
            if (res.ok) {
              const blob = await res.blob();
              if (db) await cacheAsset(db, path, blob);
              if (isSound) await preloadAudio(assetName!, await blob.arrayBuffer());
              else window.assetMap.set(path, URL.createObjectURL(blob));
            }
          }
        } catch (e) {
          console.warn(`Failed to load asset: ${path}`, e);
        } finally { 
          setLoadProgress(prev => prev + 1); 
        }
      }));
      
      setLoading(false);
    };
    loadAll();
  }, []);

  const resetProgress = () => {
    if (window.confirm('确定要重置所有进度吗？')) {
      resumeAudio();
      playUISound('CLICK');
      setPlayer(INITIAL_DATA);
      localStorage.removeItem('qfight_save');
      localStorage.removeItem('qfight_history');
      setHistory([]);
      setView('HOME');
    }
  };

  const clearAssetCache = () => {
    if (window.confirm('确定要清除素材缓存并重新下载吗？')) {
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
    newData[randomStat] += 1;
    results.push(`基础属性加成已应用。`);
    setPlayer(newData);
    setLevelUpResults(results);
  };

  const startBattle = (opponent: FighterSnapshot, modeName: string) => {
    resumeAudio();
    playUISound('CLICK');
    const record = simulateBattle(player, opponent);
    const isWin = record.winner === 'P';
    const gainedGold = isWin ? Math.floor(opponent.level * 25) : 0;
    const gainedExp = isWin ? Math.floor(opponent.level * 35) : 20;
    record.rewards = { gold: gainedGold, exp: gainedExp };
    setHistory(prev => [record, ...prev].slice(0, 10));
    setIsExplicitReplay(false);
    setActiveRecord(record);
    setView('COMBAT');
  };

  const generateEliteOpponent = (): FighterSnapshot => {
    const lvl = player.level + 2;
    return {
      name: '精英教头', level: lvl, hp: 500 + lvl * 20, maxHp: 500 + lvl * 20,
      str: 15 + lvl, agi: 15 + lvl, spd: 15 + lvl,
      weapons: ['w1', 'w5', 'w9'], skills: ['s15', 's17', 's18'],
      dressing: { HEAD: '', BODY: '', WEAPON: '' }
    };
  };

  const generateNormalOpponent = (): FighterSnapshot => {
    const lvl = player.level;
    return {
      name: '江湖小虾', level: lvl, hp: 300 + lvl * 10, maxHp: 300 + lvl * 10,
      str: 5 + lvl, agi: 5 + lvl, spd: 5 + lvl,
      weapons: ['w14', 'w20'], skills: ['s19', 's20'],
      dressing: { HEAD: '', BODY: '', WEAPON: '' }
    };
  };

  const onBattleFinished = (record: BattleRecord) => {
    if (isExplicitReplay) {
      setView('HISTORY');
      return;
    }
    if (record.rewards) {
      const { gold, exp } = record.rewards;
      const isWin = record.winner === 'P';
      setBattleResult({ isWin, gold, exp });
      let newExp = player.exp + exp;
      let nextLvlThreshold = player.level * 100;
      let tempPlayer = { ...player, gold: player.gold + gold, exp: newExp };
      if (newExp >= nextLvlThreshold) handleLevelUp(tempPlayer);
      else setPlayer(tempPlayer);
    }
  };

  if (loading) return <LoadingScreen progress={loadProgress} total={totalAssets} />;

  return (
    <div className={`${view === 'TEST' ? config.layout.maxWidthTest : config.layout.maxWidthHome} mx-auto ${config.layout.paddingMobile} ${config.layout.paddingPC} min-h-screen font-sans text-gray-800 transition-all duration-500`}>
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-3">
        <h1 className="text-2xl font-bold text-orange-600 cursor-pointer" onClick={() => {playUISound('CLICK'); setView('HOME');}}>Q-Fight Master</h1>
        
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button onClick={clearAssetCache} className="text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-black uppercase border border-emerald-100 hover:bg-emerald-100 transition-colors">重装素材</button>
          <button onClick={resetProgress} className="text-[10px] bg-rose-50 text-rose-500 px-3 py-1 rounded-full font-black uppercase border border-rose-100 hover:bg-rose-100 transition-colors">重置</button>
          <button onClick={() => {playUISound('CLICK'); setView('TEST');}} className="text-[10px] bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full font-black uppercase border border-indigo-100 hover:bg-indigo-100 transition-colors">实验室</button>
          <div className="flex items-center space-x-3 text-sm font-black ml-2">
            <span className="text-slate-600">💰 {player.gold}</span>
            <span className="text-slate-600">✨ Lv.{player.level}</span>
            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 italic">⚡ {totalCP}</span>
          </div>
        </div>
      </header>

      {battleResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] p-4 backdrop-blur-md">
          <div className={`bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl border-t-[10px] animate-popIn ${battleResult.isWin ? 'border-orange-500' : 'border-slate-50'}`}>
            <h2 className="text-3xl font-black italic uppercase text-center mb-6">{battleResult.isWin ? '🏆 Victory' : '💀 Defeat'}</h2>
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
            <button onClick={() => {playUISound('CLICK'); setBattleResult(null); setView('HOME');}} className="w-full py-4 rounded-2xl font-black text-white text-lg bg-orange-500">确定</button>
          </div>
        </div>
      )}

      {view === 'HOME' && (
        <div className="flex flex-col md:grid md:grid-cols-2 gap-8 animate-popIn">
          <Profile player={player} />
          <div className="space-y-4">
            <button onClick={() => startBattle(generateNormalOpponent(), 'NORMAL')} className="w-full bg-orange-500 text-white py-5 rounded-xl text-xl font-black shadow-lg hover:bg-orange-600 transition-all active:scale-95">⚔️ 开启对决</button>
            <button onClick={() => {playUISound('CLICK'); setView('CHALLENGE');}} className="w-full bg-red-600 text-white py-4 rounded-xl text-lg font-black shadow-lg hover:bg-red-700 transition-all active:scale-95 border-b-4 border-red-800">🏆 大师挑战赛</button>
            <button onClick={() => {playUISound('CLICK'); setView('FRIENDS');}} className="w-full bg-emerald-500 text-white py-4 rounded-xl text-lg font-black hover:bg-emerald-600 transition-all active:scale-95">👥 江湖好友</button>
            <button onClick={() => startBattle(generateEliteOpponent(), 'ELITE')} className="w-full bg-slate-800 text-white py-4 rounded-xl text-lg font-black hover:bg-slate-900 transition-all active:scale-95">🔱 精英挑战</button>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => {playUISound('CLICK'); setView('SKILLS');}} className="bg-blue-500 text-white py-4 rounded-xl font-bold hover:bg-blue-600 transition-all active:scale-95">📜 秘籍仓库</button>
              <button onClick={() => {playUISound('CLICK'); setView('DRESSING');}} className="bg-purple-500 text-white py-4 rounded-xl font-bold hover:bg-purple-600 transition-all active:scale-95">👗 个性装扮</button>
            </div>
            <button onClick={() => {playUISound('CLICK'); setView('HISTORY');}} className="w-full bg-indigo-500 text-white py-4 rounded-xl text-lg font-black italic tracking-widest hover:bg-indigo-600 transition-all active:scale-95">📜 战报回放</button>
          </div>
          <RedeemCode player={player} setPlayer={setPlayer} />
        </div>
      )}

      {view === 'COMBAT' && activeRecord && (
        <Combat record={activeRecord} isReplay={isExplicitReplay} onFinish={(rec) => onBattleFinished(rec)} />
      )}
      
      {view === 'HISTORY' && (
        <BattleHistory history={history} onPlay={(rec) => { setIsExplicitReplay(true); setActiveRecord(rec); setView('COMBAT'); }} onBack={() => {playUISound('CLICK'); setView('HOME');}} />
      )}

      {view === 'CHALLENGE' && (
        <GrandmasterChallenge 
          playerLevel={player.level} 
          onChallenge={(m) => startBattle(m, 'MASTER')} 
          onBack={() => {playUISound('CLICK'); setView('HOME');}} 
        />
      )}

      {view === 'TEST' && <TestPanel player={player} onBack={() => {playUISound('CLICK'); setView('HOME');}} />}
      {view === 'FRIENDS' && <FriendList player={player} onBack={() => {playUISound('CLICK'); setView('HOME');}} onChallenge={(f) => startBattle({ ...f, hp: f.hp, maxHp: f.hp }, 'DUEL')} onAddFriend={(f) => setPlayer(p => ({...p, friends: [f, ...p.friends]}))} onRemoveFriend={(id) => setPlayer(p => ({...p, friends: p.friends.filter(f => f.id !== id)}))} />}
      {view === 'DRESSING' && <DressingRoom player={player} setPlayer={setPlayer} onBack={() => {playUISound('CLICK'); setView('HOME');}} />}
      {view === 'SKILLS' && <SkillList player={player} onBack={() => {playUISound('CLICK'); setView('HOME');}} />}
    </div>
  );
};

export default App;
