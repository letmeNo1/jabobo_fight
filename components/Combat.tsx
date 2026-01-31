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

type AttackModule = 'CLEAVE' | 'SLASH' | 'PIERCE' | 'SWING' | 'THROW';

const Combat: React.FC<CombatProps> = ({ player, onWin, onLoss }) => {
  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [fighters, setFighters] = useState<{ p: Fighter; n: Fighter } | null>(null);
  const [turn, setTurn] = useState<'P' | 'N' | null>(null);
  const [battleOver, setBattleOver] = useState(false);
  
  const [pVisual, setPVisual] = useState<{ state: VisualState; frame: number }>({ state: 'IDLE', frame: 1 });
  const [nVisual, setNVisual] = useState<{ state: VisualState; frame: number }>({ state: 'IDLE', frame: 1 });
  
  const [pOffset, setPOffset] = useState({ x: 0, y: 0 });
  const [nOffset, setNOffset] = useState({ x: 0, y: 0 });
  const [moveDuration, setMoveDuration] = useState(400);

  const [shaking, setShaking] = useState<'P' | 'N' | 'SCREEN' | null>(null);
  const [effects, setEffects] = useState<VisualEffect[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [uiScale, setUiScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const effectCounter = useRef(0);

  const moduleNameMap: Record<AttackModule, string> = {
    CLEAVE: '劈',
    SLASH: '砍',
    PIERCE: '刺',
    SWING: '挥舞',
    THROW: '投掷'
  };

  useEffect(() => {
    const handleResize = () => {
      const cw = window.innerWidth;
      const mobile = cw < 768;
      setIsMobile(mobile);
      const targetW = 1000;
      setUiScale(Math.min(cw / targetW, 1));
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, []);

  const getModuleByAction = (type: 'WEAPON' | 'SKILL' | 'BARE', id?: string): AttackModule => {
    if (type === 'BARE') return 'SLASH';
    if (type === 'WEAPON' && id) {
      if (['w2', 'w3', 'w4', 'w8'].includes(id)) return 'CLEAVE';
      if (['w1', 'w9', 'w16', 'w17'].includes(id)) return 'PIERCE';
      if (['w7', 'w11', 'w13', 'w18'].includes(id)) return 'SWING';
      if (['w12', 'w19', 'w20', 'w21', 'w22', 'w23', 'w24'].includes(id)) return 'THROW';
      if (['w5', 'w6', 'w10', 'w14', 'w15'].includes(id)) return 'SLASH';
    }
    if (type === 'SKILL' && id) {
      if (['s19', 's22', 's25', 's26', 's29'].includes(id)) return 'THROW';
      if (['s20', 's30'].includes(id)) return 'CLEAVE';
      if (['s24'].includes(id)) return 'PIERCE';
      if (['s23', 's27'].includes(id)) return 'SLASH';
    }
    return 'SLASH';
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
      setPVisual(v => (v.state === 'IDLE' || v.state === 'RUN' || v.state === 'HOME') ? { ...v, frame: v.frame + 1 } : v);
      setNVisual(v => (v.state === 'IDLE' || v.state === 'RUN' || v.state === 'HOME') ? { ...v, frame: v.frame + 1 } : v);
    }, 125);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (battleOver || !fighters || !turn) return;

    const combatTimer = setTimeout(async () => {
      const isP = turn === 'P';
      const atk = isP ? fighters.p : fighters.n;
      if (atk.hp <= 0) return;

      let actionDesc = "普通攻击";
      let dmg = 0;
      let hitType: 'NORMAL' | 'SKILL' = 'NORMAL';
      let currentModule: AttackModule = 'SLASH';

      const roll = Math.random();
      const activeSkills = SKILLS.filter(s => atk.skills.includes(s.id) && s.category === SkillCategory.ACTIVE);
      const ownedWeapons = WEAPONS.filter(w => atk.weapons.includes(w.id));

      if (roll < 0.3 && activeSkills.length > 0) {
        const skill = activeSkills[Math.floor(Math.random() * activeSkills.length)];
        actionDesc = `使用了技能【${skill.name}】`;
        hitType = 'SKILL';
        dmg = 15 + atk.level * 1.5; 
        currentModule = getModuleByAction('SKILL', skill.id);
      } else if (roll < 0.7 && ownedWeapons.length > 0) {
        const weapon = ownedWeapons[Math.floor(Math.random() * ownedWeapons.length)];
        actionDesc = `挥动了【${weapon.name}】`;
        dmg = Math.floor(weapon.baseDmg[0] + Math.random() * (weapon.baseDmg[1] - weapon.baseDmg[0]));
        currentModule = getModuleByAction('WEAPON', weapon.id);
      } else {
        actionDesc = "空手挥了一拳";
        dmg = Math.floor(atk.str * (0.8 + Math.random() * 0.4));
        currentModule = getModuleByAction('BARE');
      }

      const atkSetter = isP ? setPVisual : setNVisual;
      const offsetSetter = isP ? setPOffset : setNOffset;
      const dir = isP ? 1 : -1;
      const meleeDistance = 440 * dir; 

      setLogs(l => [...l, { attacker: atk.name, text: `[${moduleNameMap[currentModule]}模组] ${actionDesc}` }]);

      switch (currentModule) {
        case 'CLEAVE': 
          setMoveDuration(200);
          atkSetter({ state: 'RUN', frame: 1 });
          offsetSetter({ x: 80 * dir, y: 0 });
          await new Promise(r => setTimeout(r, 200));

          setMoveDuration(450);
          atkSetter({ state: 'JUMP', frame: 1 });
          offsetSetter({ x: meleeDistance, y: -200 }); 
          await new Promise(r => setTimeout(r, 450));

          setMoveDuration(80);
          offsetSetter({ x: meleeDistance, y: 0 });
          await new Promise(r => setTimeout(r, 80));
          
          atkSetter({ state: 'CLEAVE', frame: 1 });
          setShaking('SCREEN'); 
          executeHit(Math.floor(dmg * 1.15), isP, hitType);
          await new Promise(r => setTimeout(r, 800)); 
          setShaking(null);
          break;

        case 'PIERCE': 
          setMoveDuration(250);
          atkSetter({ state: 'RUN', frame: 1 });
          offsetSetter({ x: meleeDistance, y: 0 });
          await new Promise(r => setTimeout(r, 250));
          for (let loop = 0; loop < 2; loop++) {
            for (let i = 1; i <= 4; i++) {
              atkSetter({ state: 'PIERCE', frame: i });
              if (loop === 0 && i === 2) executeHit(Math.floor(dmg), isP, hitType);
              await new Promise(r => setTimeout(r, 100));
            }
          }
          break;

        case 'SWING': 
          // 阶段 1：蓄力（帧 1-3）
          // 角色缓慢向前挪动一小步，同时播放前三帧动作
          setMoveDuration(600); 
          offsetSetter({ x: 120 * dir, y: 0 });
          for(let i=1; i<=3; i++) {
            atkSetter({ state: 'SWING', frame: i });
            await new Promise(r => setTimeout(r, 200)); 
          }
          
          // 阶段 2：爆发冲击（帧 4）
          // 极速闪现至对手面前
          setMoveDuration(80); 
          offsetSetter({ x: meleeDistance, y: 0 });
          atkSetter({ state: 'SWING', frame: 4 });
          await new Promise(r => setTimeout(r, 80));
          
          // 打击点判定 + 屏幕震动
          executeHit(Math.floor(dmg), isP, hitType);
          setShaking('SCREEN');
          setTimeout(() => setShaking(null), 150);
          
          await new Promise(r => setTimeout(r, 400));
          break;

        case 'THROW': 
          setMoveDuration(0);
          setFlash(isP ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)');
          for (let loop = 0; loop < 2; loop++) {
            for(let i = 1; i <= 3; i++) {
              atkSetter({ state: 'THROW', frame: i });
              if (loop === 0 && i === 2) executeHit(Math.floor(dmg), isP, 'SKILL');
              await new Promise(r => setTimeout(r, 120));
            }
          }
          setFlash(null);
          break;

        case 'SLASH': 
          setMoveDuration(300);
          atkSetter({ state: 'RUN', frame: 1 });
          offsetSetter({ x: meleeDistance, y: 0 });
          await new Promise(r => setTimeout(r, 300));
          for(let i=1; i<=4; i++) {
            atkSetter({ state: 'SLASH', frame: i });
            if (i === 2) executeHit(Math.floor(dmg), isP, hitType);
            await new Promise(r => setTimeout(r, 110));
          }
          await new Promise(r => setTimeout(r, 300));
          break;
      }

      await new Promise(r => setTimeout(r, 100));
      setMoveDuration(500);
      atkSetter({ state: 'IDLE', frame: 1 });
      offsetSetter({ x: 0, y: 0 });
      await new Promise(r => setTimeout(r, 500));

      if (!battleOver) { setTurn(prev => prev === 'P' ? 'N' : 'P'); }
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
      setEffects(e => [...e, { id: effectId, text: `-${dmg}`, isPlayer: !isPAttacking, color: type === 'SKILL' ? '#f59e0b' : '#ef4444' }]);
      setTimeout(() => {
        setShaking(null);
        setEffects(e => e.filter(item => item.id !== effectId));
        if (target.hp > 0) { defSetter({ state: 'IDLE', frame: 1 }); }
      }, 800);
      if (target.hp <= 0) {
        setBattleOver(true);
        setLogs(l => [...l, { attacker: '系统', text: `🏁 ${target.name} 倒下了！` }]);
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
      <div className={`mt-3 flex flex-col gap-1.5 ${align === 'right' ? 'items-end' : 'items-start'}`}>
        <div className={`flex flex-wrap gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
          {ownedWeapons.map(w => (
            <span key={w.id} className="px-2 py-0.5 bg-slate-800/95 text-orange-400 text-[10px] font-black rounded border border-orange-500/40 shadow-sm">⚔️ {w.name}</span>
          ))}
        </div>
        <div className={`flex flex-wrap gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
          {ownedSkills.map(s => (
            <span key={s.id} className="px-2 py-0.5 bg-slate-800/95 text-blue-400 text-[10px] font-black rounded border border-blue-500/40 shadow-sm">📜 {s.name}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`fixed inset-0 z-[200] bg-black flex flex-col h-screen w-screen overflow-hidden ${shaking === 'SCREEN' ? 'animate-heavyShake' : ''}`}>
      {flash && <div className="absolute inset-0 z-[160] pointer-events-none animate-pulse" style={{ backgroundColor: flash }}></div>}
      <div className="relative w-full flex-grow flex flex-col items-center justify-end bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 overflow-hidden shadow-inner">
           <div className="absolute top-4 w-full px-12 flex justify-between items-start z-[250] pointer-events-none" style={{ transform: `scale(${uiScale})`, transformOrigin: 'top center' }}>
              <div className="w-[380px] pointer-events-auto">
                <div className="flex justify-between items-end text-white text-xs font-black mb-1.5 drop-shadow-lg uppercase tracking-tight">
                  <div className="flex items-center gap-2"><span className="bg-orange-600 px-4 py-1 rounded-l italic text-sm">Player</span><span className="bg-slate-700/80 px-3 py-1 rounded-r border-r border-slate-500/30">Lv.{fighters.p.level}</span></div>
                  <span className="ml-auto font-mono text-xl text-emerald-400">{Math.ceil(fighters.p.hp)}</span>
                </div>
                <div className="h-6 bg-black/60 rounded-full border border-slate-500/40 overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                  <div className="h-full bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-400 transition-all duration-500 relative" style={{ width: `${(fighters.p.hp/fighters.p.maxHp)*100}%` }}><div className="absolute inset-0 bg-white/10 animate-pulse"></div></div>
                </div>
                {!isMobile && renderAssets(fighters.p, 'left')}
              </div>
              <div className="w-[380px] text-right pointer-events-auto">
                <div className="flex justify-between items-end text-white text-xs font-black mb-1.5 drop-shadow-lg uppercase tracking-tight">
                  <span className="font-mono text-xl text-rose-400">{Math.ceil(fighters.n.hp)}</span>
                  <div className="flex items-center gap-2 ml-auto"><span className="bg-slate-700/80 px-3 py-1 rounded-l border-l border-slate-500/30">Lv.{fighters.n.level}</span><span className="bg-red-600 px-4 py-1 rounded-r italic text-sm">Enemy</span></div>
                </div>
                <div className="h-6 bg-black/60 rounded-full border border-slate-500/40 overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                  <div className="h-full bg-gradient-to-l from-red-700 via-rose-600 to-red-500 transition-all duration-500 ml-auto relative" style={{ width: `${(fighters.n.hp/fighters.n.maxHp)*100}%` }}><div className="absolute inset-0 bg-white/10 animate-pulse"></div></div>
                </div>
                {!isMobile && renderAssets(fighters.n, 'right')}
              </div>
           </div>
           <div className="absolute top-[20%] text-white/10 font-black text-[12rem] italic select-none pointer-events-none uppercase tracking-widest drop-shadow-2xl z-10">VS</div>
           <div className="relative flex flex-col items-center justify-end transition-transform duration-300" style={{ width: '1000px', height: '450px', transform: `scale(${uiScale})`, transformOrigin: 'bottom center' }}>
              <div className="relative w-full h-full flex items-end justify-center pb-0">
                <div className="w-full h-72 flex justify-between px-32 relative">
                  
                  {/* PLAYER CONTAINER */}
                  <div className="relative z-20" style={{ transform: `translate(${pOffset.x}px, ${pOffset.y}px)`, transition: moveDuration === 0 ? 'none' : `transform ${moveDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` }}>
                    <div className={`${shaking === 'P' ? 'animate-shake' : ''} ${pVisual.state === 'CLEAVE' ? 'animate-vibrate' : ''}`}>
                      <CharacterVisual state={pVisual.state} frame={pVisual.frame} accessory={{ head: DRESSINGS.find(d => d.id === player.dressing.HEAD)?.name }} />
                    </div>
                    {effects.filter(e => e.isPlayer).map(e => (
                      <div key={e.id} className="absolute -top-32 left-0 w-full z-[170] pointer-events-none animate-damage text-center"><div className="text-7xl font-black italic drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)] whitespace-nowrap" style={{ color: e.color }}>{e.text}</div></div>
                    ))}
                  </div>

                  {/* NPC CONTAINER */}
                  <div className="relative z-20" style={{ transform: `translate(${nOffset.x}px, ${nOffset.y}px)`, transition: moveDuration === 0 ? 'none' : `transform ${moveDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` }}>
                    <div className={`${shaking === 'N' ? 'animate-shake' : ''} ${nVisual.state === 'CLEAVE' ? 'animate-vibrate' : ''}`}>
                      <div style={{ transform: 'scaleX(-1)' }}><CharacterVisual isNpc={true} state={nVisual.state} frame={nVisual.frame} /></div>
                    </div>
                    {effects.filter(e => !e.isPlayer).map(e => (
                      <div key={e.id} className="absolute -top-32 left-0 w-full z-[170] pointer-events-none animate-damage text-center"><div className="text-7xl font-black italic drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)] whitespace-nowrap" style={{ color: e.color }}>{e.text}</div></div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-0 w-3/4 h-[4px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>
           </div>
      </div>
      <div className="w-full bg-slate-950 p-4 md:p-6 overflow-y-auto custom-scrollbar border-t border-slate-800 shrink-0 z-[260]" style={{ height: isMobile ? '125px' : '30vh', maxHeight: '350px' }}>
        <div className="max-w-2xl mx-auto space-y-2">
          {logs.map((log, i) => (
            <div key={i} className={`px-4 py-2.5 rounded-xl border-l-4 text-sm shadow-md animate-popIn ${log.attacker === '你' ? 'bg-blue-950/20 border-blue-500 text-blue-100' : log.attacker === '系统' ? 'bg-orange-900/20 border-orange-500 text-orange-100 font-bold' : 'bg-red-950/20 border-red-500 text-red-100'}`}>
              <div className="flex items-center"><span className="font-black opacity-30 mr-3 uppercase text-[10px] shrink-0">[{log.attacker}]</span><span className="tracking-tight font-medium truncate md:whitespace-normal">{log.text}</span></div>
            </div>
          ))}
          <div ref={logEndRef} className="h-1" />
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes damagePop { 0% { opacity: 0; transform: translateY(20px) scale(0.4); } 15% { opacity: 1; transform: translateY(-40px) scale(1.3); } 80% { opacity: 1; transform: translateY(-100px) scale(1); } 100% { opacity: 0; transform: translateY(-160px) scale(0.7); } }
        .animate-damage { animation: damagePop 0.8s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards; }
        @keyframes heavyShake { 0%, 100% { transform: translate(0, 0); } 10%, 30%, 50%, 70%, 90% { transform: translate(-6px, -6px); } 20%, 40%, 60%, 80% { transform: translate(6px, 6px); } }
        .animate-heavyShake { animation: heavyShake 0.4s ease-out; }
        @keyframes shake { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(-15px, 5px); } 50% { transform: translate(12px, -4px); } 75% { transform: translate(-8px, 3px); } }
        .animate-shake { animation: shake 0.2s ease-in-out; }
        @keyframes vibrate { 0% { transform: translate(0,0); } 10% { transform: translate(-2px, -2px); } 20% { transform: translate(2px, -2px); } 30% { transform: translate(-2px, 2px); } 40% { transform: translate(2px, 2px); } 50% { transform: translate(-2px, -2px); } 60% { transform: translate(2px, -2px); } 70% { transform: translate(-2px, 2px); } 80% { transform: translate(2px, 2px); } 90% { transform: translate(-2px, -2px); } 100% { transform: translate(0,0); } }
        .animate-vibrate { animation: vibrate 0.1s linear infinite; }
        @keyframes popIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-popIn { animation: popIn 0.3s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
      `}} />
    </div>
  );
};

export default Combat;