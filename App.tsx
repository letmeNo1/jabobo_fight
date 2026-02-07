
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
import { playUISound, preloadAudio, resumeAudio } from './utils/audio';
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
  weapons: ['w14', 'w20'],
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
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);

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
      jump: 1, cleave: 3, slash: 3, pierce: 4, swing: 4, throw: 3, punch: 2
    };

    const coreImages = ['character.png'];
    const animationImages: string[] = [];
    
    Object.entries(stateConfigs).forEach(([prefix, count]) => {
      for (let i = 1; i <= count; i++) {
        animationImages.push(`${prefix}${i}.png`);
        WEAPONS.forEach(w => animationImages.push(`${w.id}_${prefix}${i}.png`));
        SKILLS.forEach(s => s.module && animationImages.push(`${s.id}_${s.module.toLowerCase()}${i}.png`));
      }
    });

    WEAPONS.forEach(w => {
      animationImages.push(`${w.id}_throw.png`);
      animationImages.push(`${w.id}_throw1.png`);
      animationImages.push(`${w.id}_projectile.png`);
      animationImages.push(`${w.id}_projectile1.png`);
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
      'ui_click', 'ui_equip', 'ui_buy', 'ui_levelup', 'battle_win', 'battle_loss'
    ];

    const imagePaths = [...new Set([...coreImages, ...animationImages])].map(p => `${assetBase}${p}`);
    const soundPaths = soundIds.map(id => `${soundBase}${id}.mp3`);
    const totalResourcePaths = [...imagePaths, ...soundPaths];
    setTotalAssets(totalResourcePaths.length);

    const loadAll = async () => {
      let db = null;
      try { db = await initDB(); } catch (e) {}
      for (let i = 0; i < totalResourcePaths.length; i += 15) {
        const chunk = totalResourcePaths.slice(i, i + 15);
        await Promise.all(chunk.map(async (path) => {
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
          } catch (e) {} finally { setLoadProgress(prev => prev + 1); }
        }));
      }
      setLoading(false);
    };
    loadAll();
  }, []);

  const handleReloadAssets = async () => {
    if (confirm('确定要修复并重载所有资源吗？这将清除本地缓存并刷新页面。')) {
      playUISound('CLICK');
      try {
        await deleteDB();
        window.location.reload();
      } catch (e) {
        window.location.reload();
      }
    }
  };

  const startBattle = (opponent: FighterSnapshot) => {
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

  const onBattleFinished = () => {
    const record = activeRecord;
    if (isExplicitReplay) {
      setView('HISTORY');
      setActiveRecord(null);
      return;
    }
    if (record?.rewards) {
      const { gold, exp } = record.rewards;
      const isWin = record.winner === 'P';
      setBattleResult({ isWin, gold, exp });
      if (isWin) playUISound('WIN'); else playUISound('LOSS');
      
      let newExp = player.exp + exp;
      let nextLvlThreshold = player.level * 100;
      let tempPlayer = { ...player, gold: player.gold + gold, exp: newExp };
      if (newExp >= nextLvlThreshold) {
        playUISound('LEVEL_UP');
        tempPlayer.level += 1;
        tempPlayer.exp = 0;
        tempPlayer.maxHp = 290 + tempPlayer.level * 10;
        const stats = ['str', 'agi', 'spd'] as const;
        tempPlayer[stats[Math.floor(Math.random() * stats.length)]] += 1;
      }
      setPlayer(tempPlayer);
    }
    setActiveRecord(null);
    setView('HOME');
  };

  if (loading) return <LoadingScreen progress={loadProgress} total={totalAssets} />;

  return (
    <div className="relative min-h-screen bg-slate-950 text-gray-800 overflow-x-hidden flex flex-col items-center">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full"></div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
      </div>

      <div className={`${view === 'TEST' ? config.layout.maxWidthTest : config.layout.maxWidthHome} w-full mx-auto px-2 sm:px-4 md:p-8 relative z-10 pb-20`}>
        
        <header className="flex flex-col sm:flex-row justify-between items-center mb-6 md:mb-10 bg-white/10 backdrop-blur-2xl p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border border-white/20 gap-3 mt-2 ring-1 ring-white/10">
          <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform cursor-pointer shrink-0" onClick={() => {playUISound('CLICK'); setView('HOME');}}>
              <span className="text-xl md:text-2xl">⚔️</span>
            </div>
            <div className="flex-1">
              <h1 className="text-lg md:text-2xl font-black italic text-white uppercase tracking-tighter leading-none cursor-pointer" onClick={() => {playUISound('CLICK'); setView('HOME');}}>
                Jabobo <span className="text-orange-500">Fight</span>
              </h1>
              <span className="text-[7px] md:text-[8px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-black uppercase tracking-widest mt-1 inline-block border border-indigo-500/30">Stable V2.10</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl md:rounded-2xl border border-white/5 shadow-inner">
              <span className="text-xs font-black text-yellow-400 whitespace-nowrap">💰 {player.gold}</span>
              <button onClick={handleReloadAssets} title="修复" className="ml-2 text-white/30 hover:text-white transition-colors">🛠️</button>
            </div>
            <nav className="flex items-center gap-1">
              <button onClick={() => { playUISound('CLICK'); setView('FRIENDS'); }} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all">江湖</button>
              <button onClick={() => { playUISound('CLICK'); setView('TEST'); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg border-b-2 border-indigo-800">演武</button>
            </nav>
          </div>
        </header>

        <main>
          {view === 'HOME' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 animate-popIn">
              <div className="lg:col-span-5 flex flex-col gap-6">
                <Profile player={player} />
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => { playUISound('CLICK'); setView('DRESSING'); }} className="bg-white/90 backdrop-blur-xl p-5 md:p-6 rounded-[2rem] shadow-xl border border-white hover:scale-105 transition-all text-center group">
                    <div className="text-3xl mb-2 group-hover:rotate-12 transition-transform">👕</div>
                    <span className="text-xs md:text-sm font-black text-slate-800 uppercase italic">更换装扮</span>
                  </button>
                  <button onClick={() => { playUISound('CLICK'); setView('SKILLS'); }} className="bg-white/90 backdrop-blur-xl p-5 md:p-6 rounded-[2rem] shadow-xl border border-white hover:scale-105 transition-all text-center group">
                    <div className="text-3xl mb-2 group-hover:rotate-12 transition-transform">📜</div>
                    <span className="text-xs md:text-sm font-black text-slate-800 uppercase italic">查看武库</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-7 flex flex-col gap-6">
                <div className="bg-slate-900/40 backdrop-blur-xl p-6 md:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col items-center justify-center text-center overflow-hidden relative group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 animate-shimmer"></div>
                  <h3 className="text-3xl md:text-4xl font-black italic text-white uppercase mb-2 tracking-tighter">江湖对决</h3>
                  <p className="text-indigo-300 text-[10px] md:text-xs font-black tracking-widest uppercase mb-8 opacity-80">Quick Match Challenge</p>
                  
                  <button 
                    onClick={() => {
                      const lvl = player.level;
                      const opp = {
                        name: '江湖小虾', level: lvl, hp: 300 + lvl * 10, maxHp: 300 + lvl * 10,
                        str: 5 + lvl, agi: 5 + lvl, spd: 5 + lvl,
                        weapons: ['w14', 'w20'], skills: ['s19', 's20'],
                        dressing: { HEAD: '', BODY: '', WEAPON: '' }
                      };
                      startBattle(opp);
                    }}
                    className="w-full max-w-xs bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white py-4 md:py-6 rounded-[1.5rem] md:rounded-[2rem] font-black text-base md:text-xl uppercase tracking-widest shadow-2xl shadow-orange-500/30 transform transition-all active:scale-95 group-hover:shadow-orange-500/50 border-b-4 border-red-900"
                  >
                    寻找对手
                  </button>
                  <p className="text-white/30 text-[9px] mt-4 font-bold uppercase italic">匹配实力相当的江湖散人</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => { playUISound('CLICK'); setView('CHALLENGE'); }} className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 md:p-8 rounded-[2rem] shadow-xl hover:scale-105 transition-all group relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 text-6xl opacity-10 group-hover:scale-125 transition-transform">🏆</div>
                    <div className="text-2xl mb-2">🏅</div>
                    <span className="text-xs md:text-sm font-black text-white uppercase italic">大师挑战</span>
                  </button>
                  <button onClick={() => { playUISound('CLICK'); setView('HISTORY'); }} className="bg-white/90 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-xl border border-white hover:scale-105 transition-all group">
                    <div className="text-2xl mb-2">📜</div>
                    <span className="text-xs md:text-sm font-black text-slate-800 uppercase italic">对战历程</span>
                  </button>
                </div>
                
                <RedeemCode player={player} setPlayer={setPlayer} />
              </div>
            </div>
          )}

          {view === 'COMBAT' && activeRecord && (
            <Combat record={activeRecord} onFinish={onBattleFinished} isReplay={isExplicitReplay} />
          )}

          {view === 'DRESSING' && (
            <DressingRoom player={player} setPlayer={setPlayer} onBack={() => setView('HOME')} />
          )}

          {view === 'SKILLS' && (
            <SkillList player={player} onBack={() => setView('HOME')} />
          )}

          {view === 'TEST' && (
            <TestPanel player={player} onBack={() => setView('HOME')} />
          )}

          {view === 'FRIENDS' && (
            <FriendList 
              player={player} 
              onBack={() => setView('HOME')} 
              onChallenge={(f) => startBattle(f as any)}
              onAddFriend={(f) => setPlayer(prev => ({ ...prev, friends: [f, ...prev.friends].slice(0, 15) }))}
              onRemoveFriend={(id) => setPlayer(prev => ({ ...prev, friends: prev.friends.filter(f => f.id !== id) }))}
            />
          )}

          {view === 'HISTORY' && (
            <BattleHistory 
              history={history} 
              onBack={() => setView('HOME')} 
              onPlay={(rec) => { setIsExplicitReplay(true); setActiveRecord(rec); setView('COMBAT'); }} 
            />
          )}

          {view === 'CHALLENGE' && (
            <GrandmasterChallenge 
              playerLevel={player.level} 
              onChallenge={(m) => startBattle(m)} 
              onBack={() => setView('HOME')} 
            />
          )}
        </main>
      </div>

      {battleResult && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-10 md:p-14 max-w-sm w-full text-center shadow-2xl border-b-8 border-slate-200 animate-popIn">
            <div className={`text-6xl md:text-8xl mb-8 transform hover:scale-110 transition-transform ${battleResult.isWin ? 'animate-bounce' : 'grayscale'}`}>
              {battleResult.isWin ? '🎉' : '💀'}
            </div>
            <h2 className={`text-3xl md:text-4xl font-black italic uppercase tracking-tighter mb-2 ${battleResult.isWin ? 'text-orange-600' : 'text-slate-500'}`}>
              {battleResult.isWin ? '对决胜利！' : '惜败对手'}
            </h2>
            <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-8">Battle Result Summary</p>
            
            <div className="flex justify-center gap-6 mb-10">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase mb-1">Gold</span>
                <span className="text-xl font-black text-indigo-600">+ {battleResult.gold}</span>
              </div>
              <div className="w-px h-10 bg-slate-100"></div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase mb-1">Exp</span>
                <span className="text-xl font-black text-emerald-600">+ {battleResult.exp}</span>
              </div>
            </div>

            <button 
              onClick={() => { playUISound('CLICK'); setBattleResult(null); }}
              className="w-full bg-slate-900 text-white py-4 md:py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              继续历练
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 3s linear infinite; }
      `}} />
    </div>
  );
};

export default App;
