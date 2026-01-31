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
}

interface VisualEffect {
  id: number;
  text: string;
  isPlayer: boolean;
  color: string;
}

type AttackModule = 'MELEE_FAST' | 'MELEE_HEAVY' | 'MELEE_DASH' | 'RANGED';

const Combat: React.FC<CombatProps> = ({ player, onWin, onLoss }) => {
  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [fighters, setFighters] = useState<{ p: Fighter; n: Fighter } | null>(null);
  const [turn, setTurn] = useState<'P' | 'N' | null>(null);
  const [battleOver, setBattleOver] = useState(false);
  
  const [pVisual, setPVisual] = useState<{ state: VisualState; frame: number }>({ state: 'IDLE', frame: 1 });
  const [nVisual, setNVisual] = useState<{ state: VisualState; frame: number }>({ state: 'IDLE', frame: 1 });
  
  const [pOffset, setPOffset] = useState(0);
  const [nOffset, setNOffset] = useState(0);
  const [moveDuration, setMoveDuration] = useState(400);

  const [shaking, setShaking] = useState<'P' | 'N' | 'SCREEN' | null>(null);
  const [effects, setEffects] = useState<VisualEffect[]>([]);
  const [flash, setFlash] = useState<string | null>(null);

  const logEndRef = useRef<HTMLDivElement>(null);
  const effectCounter = useRef(0);

  // 模组名称映射
  const moduleNameMap: Record<AttackModule, string> = {
    MELEE_FAST: '轻快模组',
    MELEE_HEAVY: '重击模组',
    MELEE_DASH: '瞬步模组',
    RANGED: '远程模组'
  };

  // 动作模组映射函数
  const getModuleByAction = (type: 'WEAPON' | 'SKILL' | 'BARE', id?: string): AttackModule => {
    if (type === 'BARE') return 'MELEE_FAST';
    
    if (type === 'WEAPON' && id) {
      const w = WEAPONS.find(item => item.id === id);
      if (!w) return 'MELEE_FAST';
      if (w.type === WeaponType.LARGE) return 'MELEE_HEAVY';
      if (w.type === WeaponType.SMALL) return 'MELEE_FAST';
      if (w.type === WeaponType.MEDIUM) return 'MELEE_DASH';
      if (w.type === WeaponType.THROW) return 'RANGED';
    }

    if (type === 'SKILL' && id) {
      const rangedSkills = ['s19', 's20', 's22', 's23', 's26', 's29', 's30'];
      if (rangedSkills.includes(id)) return 'RANGED';
      const dashSkills = ['s24', 's25', 's27'];
      if (dashSkills.includes(id)) return 'MELEE_DASH';
      return 'MELEE_FAST';
    }

    return 'MELEE_FAST';
  };

  useEffect(() => {
    const npcLevel = Math.max(1, player.level + Math.floor(Math.random() * 3) - 1);
    const randomNpcWeapons = [...WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 4).map(w => w.id);
    const randomNpcSkills = [...SKILLS].sort(() => 0.5 - Math.random()).slice(0, 5).map(s => s.id);

    const npc: Fighter = {
      name: '神秘挑战者', isPlayer: false, hp: 55 + npcLevel * 12, maxHp: 55 + npcLevel * 12,
      str: 6 + npcLevel, agi: 5 + npcLevel, spd: 4 + npcLevel, level: npcLevel,
      weapons: randomNpcWeapons, skills: randomNpcSkills
    };
    const pFighter: Fighter = {
      name: '你', isPlayer: true, hp: player.maxHp, maxHp: player.maxHp, 
      str: player.str, agi: player.agi, spd: player.spd, level: player.level,
      weapons: [...player.weapons], skills: [...player.skills]
    };

    setFighters({ p: pFighter, n: npc });
    setTurn(pFighter.spd >= npc.spd ? 'P' : 'N');
    setLogs([{ attacker: '系统', text: '⚔️ 遭遇战开始！' }]);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setPVisual(v => ({ ...v, frame: v.frame + 1 }));
      setNVisual(v => ({ ...v, frame: v.frame + 1 }));
    }, 125);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (battleOver || !fighters || !turn) return;

    const combatTimer = setTimeout(async () => {
      const isP = turn === 'P';
      const atk = isP ? fighters.p : fighters.n;
      const def = isP ? fighters.n : fighters.p;

      if (atk.hp <= 0) return;

      let actionName = "普通攻击";
      let dmg = 0;
      let hitType: 'NORMAL' | 'SKILL' = 'NORMAL';
      let currentModule: AttackModule = 'MELEE_FAST';

      const roll = Math.random();
      const activeSkills = SKILLS.filter(s => atk.skills.includes(s.id) && s.category === SkillCategory.ACTIVE);
      const ownedWeapons = WEAPONS.filter(w => atk.weapons.includes(w.id));

      if (roll < 0.3 && activeSkills.length > 0) {
        const skill = activeSkills[Math.floor(Math.random() * activeSkills.length)];
        actionName = `使用了技能【${skill.name}】`;
        hitType = 'SKILL';
        dmg = 15 + atk.level * 1.5; 
        currentModule = getModuleByAction('SKILL', skill.id);
      } else if (roll < 0.7 && ownedWeapons.length > 0) {
        const weapon = ownedWeapons[Math.floor(Math.random() * ownedWeapons.length)];
        actionName = `挥动【${weapon.name}】`;
        dmg = Math.floor(weapon.baseDmg[0] + Math.random() * (weapon.baseDmg[1] - weapon.baseDmg[0]));
        currentModule = getModuleByAction('WEAPON', weapon.id);
      } else {
        actionName = "空手攻击";
        dmg = Math.floor(atk.str * (0.8 + Math.random() * 0.4));
        currentModule = getModuleByAction('BARE');
      }

      const atkSetter = isP ? setPVisual : setNVisual;
      const offsetSetter = isP ? setPOffset : setNOffset;
      const moveDistance = isP ? 340 : -340;

      // 日志输出增加模组前缀
      const moduleTag = moduleNameMap[currentModule];
      setLogs(l => [...l, { 
        attacker: atk.name, 
        text: `[${moduleTag}] ${actionName}` 
      }]);

      switch (currentModule) {
        case 'MELEE_FAST':
          setMoveDuration(250);
          atkSetter({ state: 'RUN', frame: 1 });
          offsetSetter(moveDistance);
          await new Promise(r => setTimeout(r, 250));
          atkSetter({ state: 'ATTACK', frame: 1 });
          executeHit(Math.floor(dmg), isP, hitType);
          await new Promise(r => setTimeout(r, 350));
          offsetSetter(0);
          break;

        case 'MELEE_HEAVY':
          setMoveDuration(500);
          atkSetter({ state: 'RUN', frame: 1 });
          offsetSetter(moveDistance * 0.8);
          await new Promise(r => setTimeout(r, 500));
          atkSetter({ state: 'ATTACK', frame: 1 });
          setShaking('SCREEN');
          executeHit(Math.floor(dmg * 1.25), isP, hitType);
          await new Promise(r => setTimeout(r, 500));
          setShaking(null);
          offsetSetter(0);
          break;

        case 'MELEE_DASH':
          setMoveDuration(100);
          atkSetter({ state: 'RUN', frame: 1 });
          offsetSetter(moveDistance);
          await new Promise(r => setTimeout(r, 100));
          atkSetter({ state: 'ATTACK', frame: 1 });
          executeHit(Math.floor(dmg), isP, hitType);
          await new Promise(r => setTimeout(r, 300));
          offsetSetter(0);
          break;

        case 'RANGED':
          setMoveDuration(0);
          atkSetter({ state: 'ATTACK', frame: 1 });
          setFlash(isP ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)');
          await new Promise(r => setTimeout(r, 200));
          executeHit(Math.floor(dmg), isP, 'SKILL');
          await new Promise(r => setTimeout(r, 400));
          setFlash(null);
          break;
      }

      await new Promise(r => setTimeout(r, 250));
      atkSetter({ state: 'IDLE', frame: 1 });

      if (!battleOver) {
        setTurn(prev => prev === 'P' ? 'N' : 'P');
      }
    }, 1200);

    return () => clearTimeout(combatTimer);
  }, [turn, battleOver, fighters]);

  const executeHit = (dmg: number, isPAttacking: boolean, type: string) => {
    setFighters(prev => {
      if (!prev) return prev;
      const next = { p: { ...prev.p }, n: { ...prev.n } };
      const target = isPAttacking ? next.n : next.p;

      target.hp = Math.max(0, target.hp - dmg);
      
      const defSetter = isPAttacking ? setNVisual : setPVisual;
      defSetter({ state: 'HURT', frame: 1 });
      setShaking(isPAttacking ? 'N' : 'P');
      
      const effectId = ++effectCounter.current;
      setEffects(e => [...e, { 
        id: effectId, 
        text: `-${dmg}`, 
        isPlayer: !isPAttacking,
        color: type === 'SKILL' ? '#f59e0b' : '#ef4444'
      }]);

      setTimeout(() => {
        setShaking(null);
        setEffects(e => e.filter(item => item.id !== effectId));
        if (target.hp > 0) {
            defSetter({ state: 'IDLE', frame: 1 });
        }
      }, 800);

      if (target.hp <= 0) {
        setBattleOver(true);
        setLogs(l => [...l, { attacker: '系统', text: `🏁 ${target.name} 败北了！` }]);
        setTimeout(() => isPAttacking ? onWin(prev.p.level * 20, prev.p.level * 30) : onLoss(prev.p.level * 10), 1200);
      }

      return next;
    });
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!fighters) return null;

  const renderAssets = (fighter: Fighter, align: 'left' | 'right') => {
    const ownedWeapons = WEAPONS.filter(w => fighter.weapons.includes(w.id));
    const ownedSkills = SKILLS.filter(s => fighter.skills.includes(s.id));

    return (
      <div className={`mt-2 flex flex-col gap-1 ${align === 'right' ? 'items-end' : 'items-start'}`}>
        <div className={`flex flex-wrap gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
          {ownedWeapons.map(w => (
            <span key={w.id} className="px-1 py-0.5 bg-slate-800/80 text-orange-400 text-[8px] font-bold rounded border border-orange-500/30">
              ⚔️ {w.name}
            </span>
          ))}
        </div>
        <div className={`flex flex-wrap gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
          {ownedSkills.map(s => (
            <span key={s.id} className="px-1 py-0.5 bg-slate-800/80 text-blue-400 text-[8px] font-bold rounded border border-blue-500/30">
              📜 {s.name}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center overflow-hidden transition-all ${shaking === 'SCREEN' ? 'animate-heavyShake' : ''}`}>
      {flash && <div className="absolute inset-0 z-[110] pointer-events-none animate-pulse" style={{ backgroundColor: flash }}></div>}

      <div className="relative w-full max-w-[1024px] aspect-video bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-x-4 border-slate-700 flex items-end justify-center pb-20 shadow-2xl">
        
        <div className="absolute top-6 w-full px-10 flex justify-between items-start">
          <div className="w-80">
            <div className="flex justify-between text-white text-xs font-black mb-1.5 drop-shadow-md">
              <span className="bg-orange-600 px-2 py-0.5 rounded-l italic">YOU</span>
              <span className="bg-slate-700 px-2 py-0.5 rounded-r">Lv.{fighters.p.level}</span>
              <span className="ml-auto font-mono">{Math.ceil(fighters.p.hp)}/{fighters.p.maxHp}</span>
            </div>
            <div className="h-4 bg-gray-900 rounded-full border-2 border-slate-600 shadow-inner overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500" style={{ width: `${(fighters.p.hp/fighters.p.maxHp)*100}%` }}></div>
            </div>
            {renderAssets(fighters.p, 'left')}
          </div>

          <div className="mt-1 text-white/5 font-black text-6xl italic select-none">VS</div>

          <div className="w-80 text-right">
            <div className="flex justify-between text-white text-xs font-black mb-1.5 drop-shadow-md">
              <span className="font-mono">{Math.ceil(fighters.n.hp)}/{fighters.n.maxHp}</span>
              <span className="ml-auto bg-slate-700 px-2 py-0.5 rounded-l">Lv.{fighters.n.level}</span>
              <span className="bg-red-600 px-2 py-0.5 rounded-r italic">ENEMY</span>
            </div>
            <div className="h-4 bg-gray-900 rounded-full border-2 border-slate-600 shadow-inner overflow-hidden">
              <div className="h-full bg-gradient-to-l from-red-600 to-rose-400 transition-all duration-500 ml-auto" style={{ width: `${(fighters.n.hp/fighters.n.maxHp)*100}%` }}></div>
            </div>
            {renderAssets(fighters.n, 'right')}
          </div>
        </div>

        <div className="absolute bottom-16 w-[90%] h-1 bg-white/5 blur-sm"></div>

        <div className="w-full h-64 flex justify-between px-32 relative">
          
          <div className={`relative z-10 ${shaking === 'P' ? 'animate-shake' : ''}`}
               style={{ 
                 transform: `translateX(${pOffset}px)`, 
                 transition: moveDuration === 0 ? 'none' : `transform ${moveDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` 
               }}>
            <CharacterVisual 
              state={pVisual.state} frame={pVisual.frame}
              accessory={{ head: DRESSINGS.find(d => d.id === player.dressing.HEAD)?.name }}
            />
            {effects.filter(e => e.isPlayer).map(e => (
              <div key={e.id} className="absolute -top-16 left-1/2 z-[120] pointer-events-none animate-damage">
                <div className="text-5xl font-black italic drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]" style={{ color: e.color }}>
                  {e.text}
                </div>
              </div>
            ))}
          </div>

          <div className={`relative z-10 ${shaking === 'N' ? 'animate-shake' : ''}`}
               style={{ 
                 transform: `translateX(${nOffset}px)`, 
                 transition: moveDuration === 0 ? 'none' : `transform ${moveDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` 
               }}>
            <div style={{ transform: 'scaleX(-1)' }}>
              <CharacterVisual isNpc={true} state={nVisual.state} frame={nVisual.frame} />
            </div>
            {effects.filter(e => !e.isPlayer).map(e => (
              <div key={e.id} className="absolute -top-16 left-1/2 z-[120] pointer-events-none animate-damage">
                <div className="text-5xl font-black italic drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]" style={{ color: e.color }}>
                  {e.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1024px] flex-grow bg-slate-900 border-t-2 border-slate-700 p-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-1.5">
          {logs.map((log, i) => (
            <div key={i} className={`p-2 rounded border-l-4 text-xs shadow-sm animate-popIn ${log.attacker === '你' ? 'bg-blue-900/20 border-blue-500 text-blue-200' : log.attacker === '系统' ? 'bg-orange-900/30 border-orange-500 text-orange-200 font-bold' : 'bg-red-900/20 border-red-500 text-red-200'}`}>
              <span className="font-black opacity-60 mr-2">[{log.attacker}]</span> {log.text}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes damagePop {
          0% { opacity: 0; transform: translate(-50%, 40px) scale(0.4); }
          15% { opacity: 1; transform: translate(-50%, -20px) scale(1.4); }
          80% { opacity: 1; transform: translate(-50%, -60px) scale(1.1); }
          100% { opacity: 0; transform: translate(-50%, -100px) scale(1); }
        }
        .animate-damage { animation: damagePop 0.8s cubic-bezier(0.2, 0.8, 0.2, 1.2) forwards; }
        
        @keyframes heavyShake {
          0%, 100% { transform: translate(0, 0); }
          10%, 30%, 50%, 70%, 90% { transform: translate(-5px, -5px); }
          20%, 40%, 60%, 80% { transform: translate(5px, 5px); }
        }
        .animate-heavyShake { animation: heavyShake 0.4s ease-out forwards; }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-15px); }
          40% { transform: translateX(12px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.15s ease-in-out; }
        
        @keyframes popIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-popIn { animation: popIn 0.2s ease-out forwards; }
      `}} />
    </div>
  );
};

export default Combat;