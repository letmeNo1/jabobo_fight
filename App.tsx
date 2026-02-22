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
import LoginScreen from './components/LoginScreen';
import AdminPanel from './components/AdminPanel'; // 管理员面板

import { initDB, getCachedAsset, cacheAsset, deleteDB } from './utils/db';
import { playSFX, playUISound, preloadAudio, resumeAudio } from './utils/audio';
import { calculateTotalCP } from './utils/combatPower';
import { simulateBattle } from './utils/combatEngine';

import { 
  loadUserData, saveUserData, loadUserHistory, saveUserHistory, 
  INITIAL_DATA, login, register, getCurrentUser, logout 
} from './utils/storage';
import config from './config';

declare global {
  interface Window {
    assetMap: Map<string, string>;
  }
}

const App: React.FC = () => {
  // 登录加载状态
  const [authLoading, setAuthLoading] = useState(false);
  // 用户信息
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentAccountId, setCurrentAccountId] = useState<number | null>(null);
  // 玩家数据
  const [player, setPlayer] = useState<CharacterData>(INITIAL_DATA || {} as any);
  const [history, setHistory] = useState<BattleRecord[]>([]);
  // 页面视图（🌟 保留 ADMIN 类型）
  const [view, setView] = useState<'LOGIN' | 'HOME' | 'COMBAT' | 'DRESSING' | 'SKILLS' | 'TEST' | 'FRIENDS' | 'HISTORY' | 'CHALLENGE' | 'ADMIN'>('LOGIN');
  // 战斗相关
  const [activeRecord, setActiveRecord] = useState<BattleRecord | null>(null);
  const [isExplicitReplay, setIsExplicitReplay] = useState(false);
  const [battleResult, setBattleResult] = useState<{ isWin: boolean; gold: number; exp: number } | null>(null);
  const [levelUpResults, setLevelUpResults] = useState<string[]>([]);
  // 资源加载
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);
  
  // 🌟 修复：正确判断管理员权限（基于登录用户的 role，而非 player 数据）
  const userInfo = getCurrentUser();
  const isAdmin = userInfo?.role === 'Admin';

  const totalCP = player ? calculateTotalCP(player) : 0;

  // 🌟 核心修复1：移除 player 变化自动保存（避免打开界面就更新数据）
  // 改为：只有主动修改数据时才调用 saveUserData

  // 🌟 核心修复2：history 变化仅本地暂存，主动保存时才同步到后端
  useEffect(() => {
    const saveHistoryData = async () => {
      if (currentUser && history.length > 0) {
        await saveUserHistory(currentUser, history);
      }
    };
    // 仅在 history 有数据且用户登录时，延迟保存（避免频繁请求）
    const timer = setTimeout(() => saveHistoryData(), 1000);
    return () => clearTimeout(timer);
  }, [history, currentUser]);

  // 🌟 核心修复3：页面加载/登录后，只执行「获取数据」逻辑，不执行更新
  useEffect(() => {
    const restoreLoginState = async () => {
      const userInfo = getCurrentUser();
      if (userInfo) {
        setCurrentUser(userInfo.username);
        setCurrentAccountId(userInfo.account_id);
        // 仅获取数据，不修改、不更新
        const playerData = await loadUserData(userInfo.account_id);
        setPlayer(playerData);
        const historyData = await loadUserHistory(userInfo.username);
        setHistory(historyData);
        setView('HOME');
      }
    };
    restoreLoginState();
  }, []);

  // 资源预加载逻辑（保留不变）
  useEffect(() => {
    window.assetMap = new Map<string, string>();
    const assetBase = 'Images/';
    const soundBase = 'Sounds/';
    const stateConfigs: Record<string, number> = {
      home: 2, idle: 2, run: 5, atk: 4, hurt: 1, dodge: 1,
      jump: 1, cleave: 3, slash: 3, pierce: 4, swing: 4, throw: 4, punch: 2, kick: 3
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
      'ui_click', 'ui_equip', 'ui_buy', 'ui_levelup', 'battle_win', 'battle_loss'
    ];

    const imagePaths = [...new Set([...coreImages, ...animationImages])].map(p => `${assetBase}${p}`);
    const soundPaths = soundIds.map(id => `${soundBase}${id}.mp3`);
    const totalResourcePaths = [...imagePaths, ...soundPaths];
    setTotalAssets(totalResourcePaths.length);

    const loadAll = async () => {
      const timeoutId = setTimeout(() => {
        console.warn("Asset loading timed out");
        setLoading(false);
      }, 60000);

      let db = null;
      try { db = await initDB(); } catch (e) {}
      
      const CHUNK_SIZE = 32;
      for (let i = 0; i < totalResourcePaths.length; i += CHUNK_SIZE) {
        const chunk = totalResourcePaths.slice(i, i + CHUNK_SIZE);
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
          } catch (e) {
            console.warn(`Failed to load asset: ${path}`, e);
          } finally { 
            setLoadProgress(prev => prev + 1); 
          }
        }));
      }
      
      clearTimeout(timeoutId);
      setLoading(false);
    };
    loadAll();
  }, []);

  // 🌟 新增：主动保存玩家数据的函数（只有修改数据时才调用）
  const savePlayerData = async (newPlayerData: CharacterData) => {
    if (currentUser && currentAccountId) {
      await saveUserData(newPlayerData, currentAccountId);
    }
    setPlayer(newPlayerData);
  };

  // 登录逻辑（仅获取数据，不更新）
  const handleLogin = async (username: string, password: string) => {
    setAuthLoading(true);
    try {
      const loginRes = await login({ username, password });
      setCurrentUser(username);
      setCurrentAccountId(loginRes.account_id);
      // 仅获取数据
      const playerData = await loadUserData(loginRes.account_id);
      setPlayer(playerData);
      const historyData = await loadUserHistory(username);
      setHistory(historyData);
      setView('HOME');
    } catch (error) {
      alert((error as Error).message || '登录失败，请检查账号密码');
    } finally {
      setAuthLoading(false);
    }
  };

  // 注册逻辑（仅初始化数据，不重复更新）
  const handleRegister = async (username: string, password: string) => {
    setAuthLoading(true);
    try {
      const registerRes = await register({ 
        username, 
        password, 
        player_name: username,
        role: 'Player'
      });
      setCurrentUser(username);
      setCurrentAccountId(registerRes.account_id);
      // 仅获取初始化数据
      const playerData = await loadUserData(registerRes.account_id);
      setPlayer(playerData);
      setHistory([]);
      setView('HOME');
    } catch (error) {
      alert((error as Error).message || '注册失败，账号已存在');
    } finally {
      setAuthLoading(false);
    }
  };

  // 重置进度（主动修改数据时才保存）
  const resetProgress = async () => {
    if (window.confirm('确定要重置当前角色的进度吗？')) {
      resumeAudio();
      playUISound('CLICK');
      if (currentUser && currentAccountId) {
        const newData = { ...INITIAL_DATA, name: currentUser };
        // 主动保存修改后的数据
        await savePlayerData(newData);
        await saveUserHistory(currentUser, []);
        setHistory([]);
      }
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

  // 升级逻辑（主动修改数据，调用保存函数）
  const handleLevelUp = (currentData: CharacterData) => {
    playUISound('LEVEL_UP');
    const nextLvl = currentData.level + 1;
    const results: string[] = [`恭喜！你升到了等级 ${nextLvl}！`];
    
    let hpGain = 10;
    if (currentData.skills.includes('s4')) hpGain = Math.floor(hpGain * 1.3);
    if (currentData.skills.includes('s5')) hpGain = Math.floor(hpGain * 1.3);
    
    let newData = { ...currentData, level: nextLvl, exp: 0, maxHp: currentData.maxHp + hpGain };
    results.push(`生命上限 +${hpGain}`);

    const stats = ['str', 'agi', 'spd'] as const;
    const statNames = { str: '力量', agi: '敏捷', spd: '速度' };
    const randomStat = stats[Math.floor(Math.random() * stats.length)];
    
    let statGain = 1;
    let extraChance = 0;
    
    if (randomStat === 'str' && currentData.skills.includes('s1')) extraChance += 0.3;
    if (randomStat === 'agi' && currentData.skills.includes('s2')) extraChance += 0.3;
    if (randomStat === 'spd' && currentData.skills.includes('s3')) extraChance += 0.3;
    if (currentData.skills.includes('s5')) extraChance += 0.3;

    if (Math.random() < extraChance) {
      statGain += 1;
      results.push(`天赋触发！额外获得属性点！`);
    }
    
    newData[randomStat] += statGain;
    results.push(`${statNames[randomStat]} +${statGain}`);
    
    // 主动保存升级后的数据
    savePlayerData(newData);
    setLevelUpResults(results);
  };

  // 开始战斗逻辑
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

  // 生成对手
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

  // 战斗结束逻辑（主动保存战斗后的数据）
  const onBattleFinished = (record: BattleRecord) => {
    if (isExplicitReplay) {
      setView('HISTORY');
      return;
    }
    if (record.rewards) {
      const { gold, exp } = record.rewards;
      const isWin = record.winner === 'P';
      
      playSFX(isWin ? 'battle_win' : 'battle_loss');
      
      setBattleResult({ isWin, gold, exp });
      let newExp = player.exp + exp;
      let nextLvlThreshold = player.level * 100;
      let tempPlayer = { ...player, gold: player.gold + gold, exp: newExp };
      
      if (newExp >= nextLvlThreshold) {
        handleLevelUp(tempPlayer);
      } else {
        // 主动保存战斗后的数据
        savePlayerData(tempPlayer);
      }
    }
  };

  // 退出登录
  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？')) {
      logout();
      setCurrentUser(null);
      setCurrentAccountId(null);
      setPlayer(INITIAL_DATA);
      setView('LOGIN');
    }
  };

  if (loading) return <LoadingScreen progress={loadProgress} total={totalAssets} />;

  if (view === 'LOGIN') {
    return <LoginScreen 
      onLogin={handleLogin} 
      onRegister={handleRegister} 
      loading={authLoading} 
    />;
  }

  return (
    <div className={`${view === 'TEST' ? config.layout.maxWidthTest : config.layout.maxWidthHome} mx-auto ${config.layout.paddingMobile} ${config.layout.paddingPC} min-h-screen font-sans text-gray-800 transition-all duration-500`}>
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-orange-600 cursor-pointer" onClick={() => {playUISound('CLICK'); setView('HOME');}}>Q-Fight Master</h1>
          {currentUser && <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">User: {currentUser}</span>}
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button onClick={handleLogout} className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-black uppercase border border-slate-200 hover:bg-slate-200 transition-colors">退出</button>
          <button onClick={clearAssetCache} className="text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-black uppercase border border-emerald-100 hover:bg-emerald-100 transition-colors">重装素材</button>
          <button onClick={resetProgress} className="text-[10px] bg-rose-50 text-rose-500 px-3 py-1 rounded-full font-black uppercase border border-rose-100 hover:bg-rose-100 transition-colors">重置</button>
          <button onClick={() => {playUISound('CLICK'); setView('TEST');}} className="text-[10px] bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-black uppercase border border-indigo-100 hover:bg-indigo-100 transition-colors">实验室</button>
          {/* 🌟 管理员专属按钮（仅 Admin 可见） */}
          {isAdmin && (
            <button 
              onClick={() => {
                playUISound('CLICK');
                setView('ADMIN'); // 切换到管理员视图
                console.log('切换到管理员面板，当前用户:', userInfo); // 调试日志
              }}
              className="text-[10px] bg-red-50 text-red-600 px-3 py-1 rounded-full font-black uppercase border border-red-100 hover:bg-red-200 transition-colors"
            >
              管理员控制台
            </button>
          )}
          <div className="flex items-center space-x-3 text-sm font-black ml-2">
            <span className="text-slate-600">💰 {player.gold}</span>
            <span className="text-slate-600">✨ Lv.{player.level}</span>
            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 italic">⚡ {totalCP}</span>
          </div>
        </div>
      </header>

      {/* 战斗结果弹窗 */}
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

      {/* 🌟 核心修复：添加 ADMIN 视图渲染逻辑 */}
      {view === 'ADMIN' && (
        <AdminPanel 
          onBack={() => {
            playUISound('CLICK');
            setView('HOME'); // 返回首页
          }} 
          currentAccountId={currentAccountId}
        />
      )}

      {/* 首页视图 */}
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
          <RedeemCode player={player} setPlayer={savePlayerData} />
        </div>
      )}

      {/* 战斗视图 */}
      {view === 'COMBAT' && activeRecord && (
        <Combat record={activeRecord} isReplay={isExplicitReplay} onFinish={(rec) => onBattleFinished(rec)} />
      )}
      
      {/* 战斗记录视图 */}
      {view === 'HISTORY' && (
        <BattleHistory history={history} onPlay={(rec) => { setIsExplicitReplay(true); setActiveRecord(rec); setView('COMBAT'); }} onBack={() => {playUISound('CLICK'); setView('HOME');}} />
      )}

      {/* 大师挑战赛视图 */}
      {view === 'CHALLENGE' && (
        <GrandmasterChallenge 
          playerLevel={player.level} 
          onChallenge={(m) => startBattle(m, 'MASTER')} 
          onBack={() => {playUISound('CLICK'); setView('HOME');}} 
        />
      )}

      {/* 其他视图 */}
      {view === 'TEST' && <TestPanel player={player} onBack={() => {playUISound('CLICK'); setView('HOME');}} />}
      {view === 'FRIENDS' && <FriendList 
        player={player} 
        onBack={() => {playUISound('CLICK'); setView('HOME');}} 
        onChallenge={(f) => startBattle({ ...f, hp: f.hp, maxHp: f.hp }, 'DUEL')} 
        onAddFriend={(f) => savePlayerData({...player, friends: [f, ...player.friends]})} 
        onRemoveFriend={(id) => savePlayerData({...player, friends: player.friends.filter(f => f.id !== id)})} 
      />}
      {view === 'DRESSING' && <DressingRoom player={player} setPlayer={savePlayerData} onBack={() => {playUISound('CLICK'); setView('HOME');}} />}
      {view === 'SKILLS' && <SkillList player={player} onBack={() => {playUISound('CLICK'); setView('HOME');}} />}
    </div>
  );
};

export default App;