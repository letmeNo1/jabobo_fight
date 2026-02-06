
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
    });
    SKILLS.forEach(s => {
      if (s.module) {
        animationImages.push(`${s.id}_projectile.png`);
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
      for (let i = 0; i < totalResourcePaths.length; i += 10) {
        const chunk = totalResourcePaths.slice(i, i + 10);
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
      if (newExp >= nextLvlThreshold) {
        // handleLevelUp integrated logic
        playUISound('LEVEL_UP');
        tempPlayer.level += 1;
        tempPlayer.exp = 0;
        tempPlayer.maxHp = 290 + tempPlayer.level * 10;
        const stats = ['str', 'agi', 'spd'] as const;
        tempPlayer[stats[Math.floor(Math.random() * stats.length)]] += 1;
      }
      setPlayer(tempPlayer);
    }
  };

  if (loading) return <LoadingScreen progress={loadProgress} total={totalAssets} />;

  return (
    <div className="relative min-h-screen bg-slate-950 text-gray-800 overflow-x-hidden selection:bg-orange-500 selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full"></div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
      </div>

      <div className={`${view === 'TEST' ? config.layout.maxWidthTest : config.layout.maxWidthHome} mx-auto ${config.layout.paddingMobile} ${config.layout.paddingPC} relative z-10`}>
        
        {/* HUD Navigation */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-10 bg-white/10 backdrop-blur-2xl p-4 md:p-6 rounded-[2rem] shadow-2xl border border-white/20 gap-4 mt-4 ring-1 ring-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 transform hover:rotate-12 transition-transform cursor-pointer" onClick={() => {playUISound('CLICK'); setView('HOME');}}>
              <span className="text-2xl">⚔️</span>
            </div>
            <div>
              <h1 className="text-2xl font-black italic text-white uppercase tracking-tighter leading-none cursor-pointer" onClick={() => {playUISound('CLICK'); setView('HOME');}}>
                Jabobo <span className="text-orange-500">Fight</span>
              </h1>
              <div className="flex gap-2 mt-1">
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-indigo-500/30">Stable V2.10</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center bg-black/30 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5 shadow-inner group transition-all hover:bg-black/50">
              <span className="text-sm mr-2 filter drop-shadow-sm">💰</span>
              <span className="text-sm font-black text-yellow-400">{player.gold}</span>
            </div>
            
            <div className="h-8 w-px bg-white/10 hidden sm:block mx-1"></div>
            
            <button onClick={() => {playUISound('CLICK'); deleteDB(); window.location.reload();}} className="text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 border border-white/5">Refresh</button>
            <button onClick={() => {playUISound('CLICK'); setView('TEST');}} className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/20">Lab</button>
          </div>
        </header>

        {battleResult && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[500] p-4 backdrop-blur-xl animate-fadeIn">
            <div className={`bg-white rounded-[3.5rem] p-10 w-full max-w-sm shadow-[0_0_100px_rgba(0,0,0,0.5)] border-t-[12px] animate-popIn ${battleResult.isWin ? 'border-orange-500' : 'border-slate-300'}`}>
              <div className="flex justify-center mb-6">
                 <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-2xl ${battleResult.isWin ? 'bg-orange-100' : 'bg-slate-100'}`}>
                    {battleResult.isWin ? '🏆' : '💀'}
                 </div>
              </div>
              <h2 className="text-4xl font-black italic uppercase text-center mb-2 tracking-tighter">
                {battleResult.isWin ? 'Victory!' : 'Defeat'}
              </h2>
              <p className="text-center text-slate-400 text-xs font-black uppercase tracking-[0.3em] mb-8">Battle Result</p>
              
              <div className="space-y-4 mb-10">
                <div className="flex justify-between items-center bg-slate-50 p-5 rounded-3xl border border-slate-100">
                  <span className="text-slate-400 font-black text-[11px] uppercase tracking-widest">Rewards</span>
                  <span className="text-2xl font-black text-yellow-600">+{battleResult.gold}G</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-5 rounded-3xl border border-slate-100">
                  <span className="text-slate-400 font-black text-[11px] uppercase tracking-widest">Mastery</span>
                  <span className="text-2xl font-black text-blue-600">+{battleResult.exp}XP</span>
                </div>
              </div>
              <button onClick={() => {playUISound('CLICK'); setBattleResult(null); setView('HOME');}} className="w-full py-6 rounded-[2rem] font-black text-white text-xl bg-slate-900 shadow-2xl shadow-slate-900/40 hover:scale-[1.02] transition-transform active:scale-95">Return to Hub</button>
            </div>
          </div>
        )}

        {view === 'HOME' && (
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 animate-popIn">
            <div className="lg:col-span-5">
              <Profile player={player} />
            </div>
            
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Main Battle Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => startBattle(generateNormalOpponent(), 'NORMAL')} className="group relative overflow-hidden bg-gradient-to-br from-orange-400 to-red-600 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-95 border-b-8 border-red-800">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                      <span className="text-8xl">⚔️</span>
                   </div>
                   <div className="relative z-10 text-left">
                      <span className="text-[11px] font-black uppercase tracking-[0.4em] opacity-80">Quick Duel</span>
                      <h3 className="text-3xl font-black italic uppercase mt-1">开启对决</h3>
                      <p className="text-[10px] mt-2 font-bold opacity-60">Challenge local fighters for XP & Gold</p>
                   </div>
                </button>
                
                <button onClick={() => {playUISound('CLICK'); setView('CHALLENGE');}} className="group relative overflow-hidden bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl transition-all active:scale-95 border-b-8 border-black">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                      <span className="text-8xl">🏆</span>
                   </div>
                   <div className="relative z-10 text-left">
                      <span className="text-[11px] font-black uppercase tracking-[0.4em] opacity-80 text-orange-500">Special Event</span>
                      <h3 className="text-3xl font-black italic uppercase mt-1">大师挑战</h3>
                      <p className="text-[10px] mt-2 font-bold opacity-40">Compete against legendary masters</p>
                   </div>
                </button>
              </div>

              {/* Navigation Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={() => {playUISound('CLICK'); setView('FRIENDS');}} className="flex flex-col items-center justify-center bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-xl hover:bg-white transition-all group active:scale-95 border-b-4 border-slate-200">
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">👥</span>
                  <span className="text-[11px] font-black text-slate-800 uppercase">Friends</span>
                </button>
                <button onClick={() => {playUISound('CLICK'); setView('SKILLS');}} className="flex flex-col items-center justify-center bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-xl hover:bg-white transition-all group active:scale-95 border-b-4 border-slate-200">
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📜</span>
                  <span className="text-[11px] font-black text-slate-800 uppercase">Vault</span>
                </button>
                <button onClick={() => {playUISound('CLICK'); setView('DRESSING');}} className="flex flex-col items-center justify-center bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-xl hover:bg-white transition-all group active:scale-95 border-b-4 border-slate-200">
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">👗</span>
                  <span className="text-[11px] font-black text-slate-800 uppercase">Style</span>
                </button>
                <button onClick={() => {playUISound('CLICK'); setView('HISTORY');}} className="flex flex-col items-center justify-center bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-xl hover:bg-white transition-all group active:scale-95 border-b-4 border-slate-200">
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">🎞️</span>
                  <span className="text-[11px] font-black text-slate-800 uppercase">Replay</span>
                </button>
              </div>

              <div className="flex-grow flex flex-col justify-end">
                 <RedeemCode player={player} setPlayer={setPlayer} />
              </div>
            </div>
          </div>
        )}

        {view === 'COMBAT' && activeRecord && (
          <Combat record={activeRecord} isReplay={isExplicitReplay} onFinish={() => onBattleFinished(activeRecord)} />
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
        {view === 'DRESSING' && < DressingRoom player={player} setPlayer={setPlayer} onBack={() => {playUISound('CLICK'); setView('HOME');}} />}
        {view === 'SKILLS' && <SkillList player={player} onBack={() => {playUISound('CLICK'); setView('HOME');}} />}
        
        {/* Footer Marquee */}
        <footer className="mt-12 py-4 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden">
           <div className="flex whitespace-nowrap animate-marquee">
              {[1,2,3].map(i => (
                <span key={i} className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] px-8">
                  Welcome to the Arena • Level up to unlock Epic Skills • Battle Masters for Legendary Loot • Customize your Fighter in the Style Shop • Join the Discord for Community Events •
                </span>
              ))}
           </div>
        </footer>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-popIn {
          animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}} />
    </div>
  );
};

export default App;
