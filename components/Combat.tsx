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
  statuses: { [key: string]: number };
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
  const [pVisual, setPVisual] = useState<{ state: VisualState; frame: number }>({ state: 'IDLE', frame: 1 });
  const [nVisual, setNVisual] = useState<{ state: VisualState; frame: number }>({ state: 'IDLE', frame: 1 });
  
  const [shaking, setShaking] = useState<'P' | 'N' | null>(null);
  const [effects, setEffects] = useState<VisualEffect[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // 全局待机帧循环
  useEffect(() => {
    const idleTimer = setInterval(() => {
      setPVisual(prev => prev.state === 'IDLE' ? { ...prev, frame: (prev.frame % 2) + 1 } : prev);
      setNVisual(prev => prev.state === 'IDLE' ? { ...prev, frame: (prev.frame % 2) + 1 } : prev);
    }, 600);
    return () => clearInterval(idleTimer);
  }, []);

  // 动作帧循环逻辑
  useEffect(() => {
    let interval: number | null = null;
    if (animating) {
      const isP = animating === 'P';
      const setter = isP ? setPVisual : setNVisual;
      
      // 先进入 RUN 状态
      setter({ state: 'RUN', frame: 1 });
      let currentFrame = 1;
      
      interval = window.setInterval(() => {
        currentFrame = (currentFrame % 5) + 1;
        setter({ state: 'RUN', frame: currentFrame });
      }, 80);
      
      // 0.4s 后切换到攻击姿态
      setTimeout(() => {
        if (interval) clearInterval(interval);
        setter({ state: 'ATTACK', frame: 1 });
        let atkFrame = 1;
        const atkInterval = setInterval(() => {
           atkFrame++;
           if (atkFrame > 4) {
             clearInterval(atkInterval);
             setter({ state: 'IDLE', frame: 1 });
           } else {
             setter({ state: 'ATTACK', frame: atkFrame });
           }
        }, 80);
      }, 400);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [animating]);

  useEffect(() => {
    const npcLevel = Math.max(1, player.level + Math.floor(Math.random() * 5) - 2);
    const npc: Fighter = {
      name: '神秘挑战者', isPlayer: false, hp: 50 + npcLevel * 10, maxHp: 50 + npcLevel * 10,
      str: 5 + (npcLevel - 1), agi: 5 + (npcLevel - 1), spd: 5 + (npcLevel - 1), level: npcLevel,
      weapons: WEAPONS.slice(0, 3).map(w => w.id), skills: SKILLS.slice(0, 3).map(s => s.id),
      statuses: {}
    };

    const pFighter: Fighter = {
      name: '你', isPlayer: true, hp: player.maxHp, maxHp: player.maxHp, str: player.str, agi: player.agi, spd: player.spd,
      level: player.level, weapons: [...player.weapons], skills: [...player.skills], statuses: {}
    };

    setFighters({ p: pFighter, n: npc });
    setTurn(pFighter.spd >= npc.spd ? 'P' : 'N');
    setLogs([{ attacker: '系统', text: `⚔️ 决斗开始！对手 Lv.${npcLevel} 已在此候教多时。` }]);
  }, []);

  const triggerEffect = (text: string, isPlayer: boolean, type: 'damage' | 'heal' | 'status' = 'damage') => {
    const id = Date.now() + Math.random();
    setEffects(prev => [...prev, { id, text, isPlayer, type }]);
    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 1000);
  };

  const processTurn = async () => {
    if (!fighters || battleOver) return;
    const currentTurn = turn;
    const attacker = currentTurn === 'P' ? fighters.p : fighters.n;
    const defender = currentTurn === 'P' ? fighters.n : fighters.p;

    if (attacker.hp <= 0) return;

    setAnimating(currentTurn);
    await new Promise(r => setTimeout(r, 600));

    const dmg = Math.floor(attacker.str * (0.8 + Math.random() * 0.4));
    executeHit(attacker, defender, dmg);

    setAnimating(null);
    setTimeout(() => {
        if (!battleOver) setTurn(prev => prev === 'P' ? 'N' : 'P');
    }, 400);
  };

  const executeHit = (atk: Fighter, def: Fighter, dmg: number) => {
    const isPlayerDef = def.isPlayer;
    const defSetter = isPlayerDef ? setPVisual : setNVisual;

    defSetter({ state: 'HURT', frame: 1 });
    setShaking(isPlayerDef ? 'P' : 'N');
    triggerEffect(`-${dmg}`, isPlayerDef);
    def.hp = Math.max(0, def.hp - dmg);

    setLogs(prev => [...prev, { attacker: atk.name, text: `发起一记猛攻，带走了对方 ${dmg} 点血量！` }]);

    setTimeout(() => {
      setShaking(null);
      if (def.hp > 0) defSetter({ state: 'IDLE', frame: 1 });
    }, 300);

    if (def.hp <= 0) {
      setBattleOver(true);
      setLogs(prev => [...prev, { attacker: '系统', text: `🏳️ ${def.name} 败北，${atk.name} 获得全胜！` }]);
      setTimeout(() => atk.isPlayer ? onWin(player.level * 15, player.level * 25) : onLoss(player.level * 10), 1500);
    }
  };

  useEffect(() => {
    if (!battleOver && fighters) {
      const timer = setTimeout(processTurn, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, battleOver, fighters === null]);

  if (!fighters) return null;

  return (
    <div className="flex flex-col fixed inset-0 bg-gray-100 z-[100] overflow-hidden">
      <div className="sticky top-0 z-20 bg-white border-b-2 border-orange-500 shadow-xl min-h-[340px] md:min-h-[500px]">
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-20 lg:px-60 pt-12 md:pt-24 relative flex items-end justify-between h-[280px] md:h-[400px]">
          
          <div className="absolute top-2 left-0 w-full px-4 md:px-8 flex justify-between items-start">
             <div className="w-[45%] md:w-[38%]">
                <div className="flex justify-between items-end mb-1">
                   <span className="text-[10px] font-black text-blue-700">你 (Lv.{fighters.p.level})</span>
                   <span className="text-[8px] font-bold text-gray-400">{fighters.p.hp}/{fighters.p.maxHp}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden border border-white">
                   <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(fighters.p.hp/fighters.p.maxHp)*100}%` }}></div>
                </div>
             </div>
             
             <div className="px-4 py-1 bg-orange-500 text-white rounded-full font-black italic shadow-lg">VS</div>

             <div className="w-[45%] md:w-[38%] text-right">
                <div className="flex justify-between items-end mb-1">
                   <span className="text-[8px] font-bold text-gray-400">{fighters.n.hp}/{fighters.n.maxHp}</span>
                   <span className="text-[10px] font-black text-red-700">对手 (Lv.{fighters.n.level})</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden border border-white">
                   <div className="h-full bg-red-500 transition-all duration-500 ml-auto" style={{ width: `${(fighters.n.hp/fighters.n.maxHp)*100}%` }}></div>
                </div>
             </div>
          </div>

          <div className={`relative transition-transform duration-500 ease-in-out mb-4 md:mb-12 scale-[0.6] md:scale-100 origin-bottom
            ${animating === 'P' ? 'translate-x-[65vw] md:translate-x-[45rem] z-10' : ''} 
            ${shaking === 'P' ? 'animate-shake' : ''}`}>
             <CharacterVisual 
               state={pVisual.state}
               frame={pVisual.frame}
               accessory={{
                 head: DRESSINGS.find(d => d.id === player.dressing.HEAD)?.name,
                 body: DRESSINGS.find(d => d.id === player.dressing.BODY)?.name
               }}
             />
             {effects.filter(e => e.isPlayer).map(e => (
               <div key={e.id} className="absolute -top-20 left-1/2 -translate-x-1/2 font-black text-2xl text-red-500 animate-float-up pointer-events-none drop-shadow-md">
                 {e.text}
               </div>
             ))}
          </div>

          <div className={`relative transition-transform duration-500 ease-in-out mb-4 md:mb-12 scale-[0.6] md:scale-100 origin-bottom
            ${animating === 'N' ? '-translate-x-[65vw] md:-translate-x-[45rem] z-10' : ''} 
            ${shaking === 'N' ? 'animate-shake' : ''}`}>
             <div className="scale-x-[-1]">
               <CharacterVisual 
                 isNpc={true} 
                 state={nVisual.state}
                 frame={nVisual.frame}
                />
             </div>
             {effects.filter(e => !e.isPlayer).map(e => (
               <div key={e.id} className="absolute -top-20 left-1/2 -translate-x-1/2 font-black text-2xl text-red-500 animate-float-up pointer-events-none drop-shadow-md">
                 {e.text}
               </div>
             ))}
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto bg-white p-4">
        <div className="max-w-2xl mx-auto space-y-2 pb-20">
          {logs.map((log, i) => (
            <div key={i} className={`p-2 rounded-lg text-xs md:text-sm border ${log.attacker === '你' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
              <span className="font-bold mr-2">[{log.attacker}]</span> {log.text}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.1s infinite; }
        @keyframes float-up {
          0% { transform: translate(-50%, 0); opacity: 1; }
          100% { transform: translate(-50%, -80px); opacity: 0; }
        }
        .animate-float-up { animation: float-up 0.8s forwards; }
      `}} />
    </div>
  );
};

export default Combat;