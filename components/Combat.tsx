import React, { useState, useEffect, useRef } from 'react';
import { CharacterData, BattleLog, Weapon, Skill, WeaponType, SkillCategory } from '../types';
import { WEAPONS, SKILLS, DRESSINGS } from '../constants';
import CharacterVisual, { VisualState } from './CharacterVisual';

interface CombatProps {
  player: CharacterData;
  onWin: (gold: number, exp: number) => void;
  onLoss: (exp: number) => void;
}

interface Fighter {
  name: string;
  isPlayer: boolean;
  hp: number;
  maxHp: number;
  str: number;
  agi: number;
  spd: number;
  level: number;
  weapons: string[];
  skills: string[];
  currentWeapon: Weapon | null;
  statuses: { [key: string]: number };
  passivesUsed: Set<string>;
  usedActives: Set<string>;
  blockCount: number;
  isDead: boolean;
  hasPlayedDead: boolean;
  nextHitGuaranteed: boolean;
}

interface VisualEffect {
  id: number;
  type: 'damage' | 'heal' | 'status';
  text: string;
  isPlayer: boolean;
}

const Combat: React.FC<CombatProps> = ({ player, onWin, onLoss }) => {
  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [fighters, setFighters] = useState<{ p: Fighter; n: Fighter } | null>(null);
  const [turn, setTurn] = useState<'P' | 'N'>('P');
  const [battleOver, setBattleOver] = useState(false);
  const [animating, setAnimating] = useState<'P' | 'N' | null>(null);
  
  // 视觉状态管理
  const [pState, setPState] = useState<VisualState>('IDLE');
  const [nState, setNState] = useState<VisualState>('IDLE');
  const [pFrame, setPFrame] = useState(1); 
  const [nFrame, setNFrame] = useState(1); 

  const [shaking, setShaking] = useState<'P' | 'N' | null>(null);
  const [effects, setEffects] = useState<VisualEffect[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // 帧动画循环逻辑
  useEffect(() => {
    const pTimer = setInterval(() => {
        setPFrame(prev => {
            if (pState === 'IDLE') return (prev % 2) + 1; // 待机2帧呼吸
            if (pState === 'RUN') return (prev % 5) + 1; // 奔跑5帧
            if (pState === 'ATTACK') return (prev % 4) + 1; // 攻击4帧
            return 1;
        });
    }, pState === 'IDLE' ? 600 : 100);

    const nTimer = setInterval(() => {
        setNFrame(prev => {
            if (nState === 'IDLE') return (prev % 2) + 1;
            if (nState === 'RUN') return (prev % 5) + 1;
            if (nState === 'ATTACK') return (prev % 4) + 1;
            return 1;
        });
    }, nState === 'IDLE' ? 600 : 100);

    return () => { clearInterval(pTimer); clearInterval(nTimer); };
  }, [pState, nState]);

  useEffect(() => {
    const npcLevel = Math.max(1, player.level + Math.floor(Math.random() * 5) - 2);
    const npc: Fighter = {
      name: '神秘挑战者',
      isPlayer: false,
      hp: 50 + npcLevel * 10,
      maxHp: 50 + npcLevel * 10,
      str: 5 + (npcLevel - 1),
      agi: 5 + (npcLevel - 1),
      spd: 5 + (npcLevel - 1),
      level: npcLevel,
      weapons: WEAPONS.slice(0, 3).map(w => w.id),
      skills: SKILLS.slice(0, 3).map(s => s.id),
      currentWeapon: null,
      statuses: {},
      passivesUsed: new Set(),
      usedActives: new Set(),
      blockCount: 0,
      isDead: false,
      hasPlayedDead: false,
      nextHitGuaranteed: false
    };

    const pFighter: Fighter = {
      name: '你',
      isPlayer: true,
      hp: player.maxHp,
      maxHp: player.maxHp,
      str: player.str,
      agi: player.agi,
      spd: player.spd,
      level: player.level,
      weapons: [...player.weapons],
      skills: [...player.skills],
      currentWeapon: null,
      statuses: {},
      passivesUsed: new Set(),
      usedActives: new Set(),
      blockCount: 0,
      isDead: false,
      hasPlayedDead: false,
      nextHitGuaranteed: false
    };

    setFighters({ p: pFighter, n: npc });

    let speedDecision: 'P' | 'N';
    let speedLog: string;

    if (pFighter.spd > npc.spd) {
      speedDecision = 'P';
      speedLog = `⚡ 你的速度 (${pFighter.spd}) 高于对手 (${npc.spd})，取得先手！`;
    } else if (npc.spd > pFighter.spd) {
      speedDecision = 'N';
      speedLog = `💨 对手速度 (${npc.spd}) 极快，抢占了先手位置！`;
    } else {
      const luck = Math.random() > 0.5;
      speedDecision = luck ? 'P' : 'N';
      speedLog = `⚖️ 双方速度势均力敌，最终由 ${luck ? '你' : '对手'} 获得了先手。`;
    }

    setTurn(speedDecision);
    setLogs([
      { attacker: '系统', text: `⚔️ 决斗开始！对方企鹅 Lv.${npcLevel} 已经就绪。` },
      { attacker: '系统', text: speedLog }
    ]);
  }, []);

  const triggerEffect = (text: string, isPlayer: boolean, type: 'damage' | 'heal' | 'status' = 'damage') => {
    const id = Date.now() + Math.random();
    setEffects(prev => [...prev, { id, text, isPlayer, type }]);
    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 1000);
  };

  const addLog = (log: BattleLog) => setLogs(prev => [...prev, log]);

  const processTurn = async () => {
    if (!fighters || battleOver) return;
    const currentTurn = turn;
    const attacker = currentTurn === 'P' ? fighters.p : fighters.n;
    const defender = currentTurn === 'P' ? fighters.n : fighters.p;

    if (attacker.hp <= 0) return;

    if (attacker.statuses['眩晕'] > 0 || attacker.statuses['跳过'] > 0) {
      addLog({ attacker: attacker.name, text: `正处于眩晕状态，无法动弹...` });
      triggerEffect('眩晕中', attacker.isPlayer, 'status');
      updateStatus(attacker);
      setTimeout(endTurn, 1000);
      return;
    }

    // 状态切换至 奔跑
    if (currentTurn === 'P') setPState('RUN'); else setNState('RUN');
    setAnimating(currentTurn);
    
    // 等待冲刺到一半
    await new Promise(r => setTimeout(r, 400));
    
    // 切换至 攻击
    if (currentTurn === 'P') setPState('ATTACK'); else setNState('ATTACK');

    const procRate = 0.2 + attacker.spd * 0.005;
    let actionTaken = false;

    if (Math.random() < procRate) {
      const skills = attacker.skills.filter(id => {
        const s = SKILLS.find(sk => sk.id === id);
        return s && (s.category === SkillCategory.ACTIVE || s.category === SkillCategory.SPECIAL) && !attacker.usedActives.has(id);
      });
      if (skills.length > 0) {
        executeSkill(skills[Math.floor(Math.random() * skills.length)], attacker, defender);
        actionTaken = true;
      } else if (attacker.weapons.length > 0) {
        const wp = WEAPONS.find(w => w.id === attacker.weapons[Math.floor(Math.random() * attacker.weapons.length)]);
        if (wp) { executeWeaponAttack(wp, attacker, defender); actionTaken = true; }
      }
    }

    if (!actionTaken) executeNormalAttack(attacker, defender);

    await new Promise(r => setTimeout(r, 400));
    
    // 动作结束，撤回并恢复 IDLE
    setAnimating(null);
    setPState('IDLE');
    setNState('IDLE');
    
    updateStatus(attacker);
    setTimeout(endTurn, 400);
  };

  const executeNormalAttack = (atk: Fighter, def: Fighter) => {
    addLog({ attacker: atk.name, text: `发动了一次迅猛的肉搏！` });
    performHit(atk, def, atk.str, { isMelee: true });
  };

  const executeWeaponAttack = (wp: Weapon, atk: Fighter, def: Fighter) => {
    addLog({ attacker: atk.name, text: `施展「${wp.name}」技巧进行重击！` });
    const dmg = Math.floor(Math.random() * (wp.baseDmg[1] - wp.baseDmg[0] + 1)) + wp.baseDmg[0] + Math.floor(atk.str * 0.5);
    if (performHit(atk, def, dmg, { isWeapon: true })) {
      if (wp.id === 'w20' && Math.random() < 0.1) {
        def.statuses['眩晕'] = 1;
        addLog({ attacker: '系统', text: `${def.name} 被板砖拍晕了！` });
      }
    }
  };

  const executeSkill = (sid: string, atk: Fighter, def: Fighter) => {
    const s = SKILLS.find(sk => sk.id === sid);
    if (!s) return;
    addLog({ attacker: atk.name, text: `使出秘技：【${s.name}】！` });
    atk.usedActives.add(sid);
    if (sid === 's19') performHit(atk, def, 30, { mustHit: true });
    else if (sid === 's21') {
      const heal = Math.floor(atk.maxHp * 0.2);
      atk.hp = Math.min(atk.maxHp, atk.hp + heal);
      triggerEffect(`+${heal}`, atk.isPlayer, 'heal');
      addLog({ attacker: atk.name, text: `恢复了 ${heal} 点生命！` });
    } else executeNormalAttack(atk, def);
  };

  const performHit = (atk: Fighter, def: Fighter, base: number, opts: any = {}) => {
    const dodgeChance = Math.min(0.3, def.agi * 0.01);
    if (!opts.mustHit && Math.random() < dodgeChance) {
      addLog({ attacker: def.name, text: `身轻如燕，闪过了这招！` });
      triggerEffect('MISS', def.isPlayer, 'status');
      
      // 闪避状态
      if (def.isPlayer) setPState('DODGE'); else setNState('DODGE');
      setTimeout(() => {
        if (def.isPlayer) setPState('IDLE'); else setNState('IDLE');
      }, 500);
      
      return false;
    }

    const dmg = Math.floor(base * (0.8 + Math.random() * 0.4));
    setShaking(def.isPlayer ? 'P' : 'N');
    triggerEffect(`-${dmg}`, def.isPlayer);
    
    // 受击状态
    if (def.isPlayer) setPState('HURT'); else setNState('HURT');
    setTimeout(() => {
        if (def.isPlayer) setPState('IDLE'); else setNState('IDLE');
    }, 400);

    def.hp = Math.max(0, def.hp - dmg);
    setTimeout(() => setShaking(null), 150);

    if (def.hp <= 0) {
      setBattleOver(true);
      addLog({ attacker: '系统', text: `🏳️ 胜负已分，${atk.name} 傲视全场！` });
      setTimeout(() => atk.isPlayer ? onWin(player.level * 15, player.level * 25) : onLoss(player.level * 10), 2000);
    }
    return true;
  };

  const updateStatus = (f: Fighter) => {
    Object.keys(f.statuses).forEach(k => { if (f.statuses[k] > 0) f.statuses[k]--; });
  };

  const endTurn = () => { if (!battleOver) setTurn(prev => prev === 'P' ? 'N' : 'P'); };

  useEffect(() => {
    if (!battleOver && fighters) {
      const timer = setTimeout(processTurn, 1400);
      return () => clearTimeout(timer);
    }
  }, [turn, battleOver, fighters === null]);

  const renderArsenal = (fighter: Fighter, align: 'start' | 'end') => {
    return (
      <div className={`mt-1 md:mt-2 flex flex-wrap gap-0.5 md:gap-1 ${align === 'start' ? 'justify-start' : 'justify-end'}`}>
        {fighter.weapons.map(id => {
          const w = WEAPONS.find(item => item.id === id);
          return (
            <div key={id} className="px-1 md:px-1.5 py-0.5 bg-orange-100 border border-orange-200 rounded text-[7px] md:text-[8px] font-bold text-orange-700 whitespace-nowrap" title={w?.description}>
              ⚔️ {w?.name}
            </div>
          );
        })}
        {fighter.skills.map(id => {
          const s = SKILLS.find(item => item.id === id);
          return (
            <div key={id} className="px-1 md:px-1.5 py-0.5 bg-blue-100 border border-blue-200 rounded text-[7px] md:text-[8px] font-bold text-blue-700 whitespace-nowrap" title={s?.description}>
              📜 {s?.name}
            </div>
          );
        })}
      </div>
    );
  };

  if (!fighters) return null;

  return (
    <div className="flex flex-col fixed inset-0 bg-gray-50 z-[100] overflow-hidden">
      {/* 顶部打斗区 */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-blue-50 to-white border-b-2 border-orange-500 shadow-xl pb-2 md:pb-4 min-h-[340px] md:min-h-[580px]">
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-20 lg:px-60 pt-12 md:pt-24 relative flex items-end justify-between h-[260px] md:h-[480px]">
          
          {/* 状态 UI 覆盖层 */}
          <div className="absolute top-2 left-0 w-full px-4 md:px-8 flex justify-between items-start">
             <div className="w-[45%] md:w-[38%]">
                <div className="flex justify-between items-end mb-1">
                   <div className="flex items-center space-x-1">
                     <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${turn === 'P' ? 'bg-green-500 animate-ping' : 'bg-gray-300'}`}></span>
                     <span className="text-[9px] md:text-xs font-black text-blue-700 truncate">你</span>
                   </div>
                   <span className="text-[7px] md:text-[10px] font-bold text-gray-400">{fighters.p.hp}/{fighters.p.maxHp}</span>
                </div>
                <div className="h-2 md:h-4 bg-gray-200 rounded-full border border-white shadow-inner overflow-hidden">
                   <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(fighters.p.hp/fighters.p.maxHp)*100}%` }}></div>
                </div>
                {renderArsenal(fighters.p, 'start')}
             </div>
             <div className="flex flex-col items-center">
                <div className="px-1.5 md:px-5 py-0.5 md:py-2 bg-orange-500 text-white rounded-full font-black text-[9px] md:text-lg italic shadow-lg">VS</div>
             </div>
             <div className="w-[45%] md:w-[38%] text-right">
                <div className="flex justify-between items-end mb-1">
                   <span className="text-[7px] md:text-[10px] font-bold text-gray-400">{fighters.n.hp}/{fighters.n.maxHp}</span>
                   <div className="flex items-center space-x-1 justify-end">
                     <span className="text-[9px] md:text-xs font-black text-red-700 truncate">对手</span>
                     <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${turn === 'N' ? 'bg-red-500 animate-ping' : 'bg-gray-300'}`}></span>
                   </div>
                </div>
                <div className="h-2 md:h-4 bg-gray-200 rounded-full border border-white shadow-inner overflow-hidden">
                   <div className="h-full bg-red-500 transition-all duration-500 ml-auto" style={{ width: `${(fighters.n.hp/fighters.n.maxHp)*100}%` }}></div>
                </div>
                {renderArsenal(fighters.n, 'end')}
             </div>
          </div>

          {/* 角色 1 (左) */}
          <div className={`relative transition-transform duration-500 ease-in-out mb-4 md:mb-12 scale-[0.55] md:scale-100 origin-bottom
            ${animating === 'P' ? 'translate-x-[70vw] md:translate-x-[54rem] scale-[0.65] md:scale-110 z-10' : ''} 
            ${shaking === 'P' ? 'animate-shake' : ''}`}>
             <CharacterVisual 
               isWinking={turn === 'P'} 
               isDizzy={fighters.p.statuses['眩晕']>0} 
               state={pState}
               frame={pFrame}
               accessory={{
                 head: DRESSINGS.find(d => d.id === player.dressing.HEAD)?.name,
                 body: DRESSINGS.find(d => d.id === player.dressing.BODY)?.name
               }}
             />
             {effects.filter(e => e.isPlayer).map(e => (
               <div key={e.id} className="absolute -top-20 left-1/2 -translate-x-1/2 font-black text-2xl md:text-3xl animate-float-up pointer-events-none drop-shadow-md">
                 <span className={e.type==='damage'?'text-red-500':e.type==='heal'?'text-green-500':'text-blue-500'}>{e.text}</span>
               </div>
             ))}
          </div>

          {/* 角色 2 (右) */}
          <div className={`relative transition-transform duration-500 ease-in-out mb-4 md:mb-12 scale-[0.55] md:scale-100 origin-bottom
            ${animating === 'N' ? '-translate-x-[70vw] md:-translate-x-[54rem] scale-[0.65] md:scale-110 z-10' : ''} 
            ${shaking === 'N' ? 'animate-shake' : ''}`}>
             <div className="scale-x-[-1]">
               <CharacterVisual 
                 isNpc={true} 
                 isDizzy={fighters.n.statuses['眩晕']>0} 
                 state={nState}
                 frame={nFrame}
                />
             </div>
             {effects.filter(e => !e.isPlayer).map(e => (
               <div key={e.id} className="absolute -top-20 left-1/2 -translate-x-1/2 font-black text-2xl md:text-3xl animate-float-up pointer-events-none drop-shadow-md">
                 <span className={e.type==='damage'?'text-red-500':e.type==='heal'?'text-green-500':'text-blue-500'}>{e.text}</span>
               </div>
             ))}
          </div>

          <div className="absolute bottom-4 md:bottom-10 left-0 w-full flex justify-around px-8 md:px-72">
            <div className="w-16 md:w-36 h-4 md:h-9 bg-black/5 rounded-[100%] blur-lg md:blur-2xl"></div>
            <div className="w-16 md:w-36 h-4 md:h-9 bg-black/5 rounded-[100%] blur-lg md:blur-2xl"></div>
          </div>
        </div>
      </div>

      {/* 底部日志区 */}
      <div className="flex-grow overflow-y-auto bg-white/95 p-3 md:p-6 shadow-inner">
        <div className="max-w-2xl mx-auto space-y-2 pb-24">
          <div className="flex items-center justify-between mb-2 border-b border-gray-100 pb-1.5">
             <h3 className="text-[9px] md:text-xs font-black text-gray-400 uppercase flex items-center">
               <span className="w-1 h-1 bg-orange-400 rounded-full mr-2"></span>
               战斗记录
             </h3>
             {battleOver && <span className="text-[7px] md:text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-bold">战斗终结</span>}
          </div>
          {logs.map((log, i) => (
            <div key={i} className={`p-2 rounded-lg border border-gray-50 animate-fade-in ${log.attacker === '你' ? 'bg-blue-50/40 border-blue-100' : log.attacker === '系统' ? 'bg-orange-50/20 border-orange-100' : 'bg-red-50/40 border-red-100'}`}>
              <div className="flex items-start space-x-2">
                 <span className={`mt-0.5 text-[7px] md:text-[9px] px-1 py-0.5 rounded font-black text-white shrink-0 ${log.attacker === '你' ? 'bg-blue-400' : log.attacker === '系统' ? 'bg-orange-400' : 'bg-red-400'}`}>
                    {log.attacker}
                 </span>
                 <p className="text-[11px] md:text-sm font-medium text-gray-600 leading-tight">{log.text}</p>
              </div>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      {battleOver && (
        <div className="fixed bottom-4 md:bottom-10 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white px-5 md:px-8 py-2.5 md:py-4 rounded-xl font-black text-sm md:text-xl shadow-2xl animate-bounce backdrop-blur-md">
           决战结束，数据结算中...
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.1s ease-in-out infinite; }
        
        @keyframes float-up {
          0% { transform: translate(-50%, 0); opacity: 0; scale: 0.5; }
          20% { opacity: 1; scale: 1.4; }
          100% { transform: translate(-50%, -100px); opacity: 0; scale: 0.7; }
        }
        .animate-float-up { animation: float-up 0.8s forwards ease-out; }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s forwards; }
      `}} />
    </div>
  );
};

export default Combat;