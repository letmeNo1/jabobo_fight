import React, { useState, useEffect, useRef } from 'react';
import { CharacterData, BattleLog, Weapon, Skill, WeaponType, SkillCategory, AttackModule } from '../types';
import { WEAPONS, SKILLS, DRESSINGS } from '../constants';
import CharacterVisual, { VisualState } from './CharacterVisual';

interface CombatProps {
  player: CharacterData;
  isDebugMode?: boolean;
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
  weaponSkin?: string; // 装扮中的武器外观ID
}

interface VisualEffect {
  id: number;
  text: string;
  isPlayer: boolean;
  color: string;
}

interface Projectile {
  id: number;
  isPlayer: boolean;
  startX: number;
  targetX: number;
}

const Combat: React.FC<CombatProps> = ({ player, isDebugMode = false, onWin, onLoss }) => {
  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [fighters, setFighters] = useState<{ p: Fighter; n: Fighter } | null>(null);
  const [turn, setTurn] = useState<'P' | 'N' | null>(null);
  const [battleOver, setBattleOver] = useState(false);
  
  const [pVisual, setPVisual] = useState<{ state: VisualState; frame: number; weaponId?: string }>({ state: 'IDLE', frame: 1, weaponId: player.dressing.WEAPON });
  const [nVisual, setNVisual] = useState<{ state: VisualState; frame: number; weaponId?: string }>({ state: 'IDLE', frame: 1 });
  
  const [pOffset, setPOffset] = useState({ x: 0, y: 0 });
  const [nOffset, setNOffset] = useState({ x: 0, y: 0 });
  const [moveDuration, setMoveDuration] = useState(400);

  const [shaking, setShaking] = useState<'P' | 'N' | 'SCREEN' | null>(null);
  const [effects, setEffects] = useState<VisualEffect[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [uiScale, setUiScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pRef = useRef<HTMLDivElement>(null);
  const nRef = useRef<HTMLDivElement>(null);
  const effectCounter = useRef(0);
  const projectileCounter = useRef(0);

  const moduleNameMap: Record<AttackModule, string> = {
    CLEAVE: '劈',
    SLASH: '砍',
    PIERCE: '刺',
    SWING: '挥舞',
    THROW: '发劲',
    PUNCH: '重拳'
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

  useEffect(() => {
    const npcLevel = Math.max(1, player.level + Math.floor(Math.random() * 3) - 1);
    const randomNpcWeapons = [...WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 4).map(w => w.id);
    const randomNpcSkills = [...SKILLS].sort(() => 0.5 - Math.random()).slice(0, 5).map(s => s.id);

    const npc: Fighter = {
      name: '神秘挑战者', isPlayer: false, hp: 55 + npcLevel * 12, maxHp: 55 + npcLevel * 12,
      str: 6 + npcLevel, agi: 5 + npcLevel, spd: 4 + npcLevel, level: npcLevel,
      weapons: randomNpcWeapons, skills: randomNpcSkills,
      weaponSkin: ''
    };
    const pFighter: Fighter = {
      name: '你', isPlayer: true, hp: player.maxHp, maxHp: player.maxHp, 
      str: player.str, agi: player.agi, spd: player.spd, level: player.level,
      weapons: [...player.weapons], skills: [...player.skills],
      weaponSkin: player.dressing.WEAPON
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
      let activeWeaponId = atk.weaponSkin;

      const roll = Math.random();
      const activeSkills = SKILLS.filter(s => atk.skills.includes(s.id) && s.category === SkillCategory.ACTIVE);
      const ownedWeapons = WEAPONS.filter(w => atk.weapons.includes(w.id));

      if (roll < 0.3 && activeSkills.length > 0) {
        const skill = activeSkills[Math.floor(Math.random() * activeSkills.length)];
        actionDesc = `使用了技能【${skill.name}】`;
        hitType = 'SKILL';
        dmg = 15 + atk.level * 1.5; 
        currentModule = skill.module || 'PUNCH';
        activeWeaponId = skill.id;
      } else if (roll < 0.7 && ownedWeapons.length > 0) {
        const weapon = ownedWeapons[Math.floor(Math.random() * ownedWeapons.length)];
        actionDesc = `挥动了【${weapon.name}】`;
        dmg = Math.floor(weapon.baseDmg[0] + Math.random() * (weapon.baseDmg[1] - weapon.baseDmg[0]));
        currentModule = weapon.module;
        activeWeaponId = weapon.id;
      } else {
        actionDesc = "打出一记正拳";
        dmg = Math.floor(atk.str * (0.8 + Math.random() * 0.4));
        currentModule = 'PUNCH';
        activeWeaponId = undefined;
      }

      const atkSetter = isP ? setPVisual : setNVisual;
      const offsetSetter = isP ? setPOffset : setNOffset;
      const dir = isP ? 1 : -1;
      
      const meleeDistance = 576 * dir; 

      setLogs(l => [...l, { attacker: atk.name, text: `[${moduleNameMap[currentModule]}] ${actionDesc}` }]);

      switch (currentModule) {
        case 'CLEAVE': 
          setMoveDuration(200);
          atkSetter({ state: 'RUN', frame: 1, weaponId: activeWeaponId });
          offsetSetter({ x: 64 * dir, y: 0 });
          await new Promise(r => setTimeout(r, 200));
          
          setMoveDuration(450);
          atkSetter({ state: 'JUMP', frame: 1, weaponId: activeWeaponId });
          offsetSetter({ x: meleeDistance, y: -200 }); 
          await new Promise(r => setTimeout(r, 450));
          
          setMoveDuration(80);
          offsetSetter({ x: meleeDistance, y: 0 });
          await new Promise(r => setTimeout(r, 80));
          
          atkSetter({ state: 'CLEAVE', frame: 1, weaponId: activeWeaponId });
          setShaking('SCREEN'); 
          executeHit(Math.floor(dmg * 1.15), isP, hitType);
          await new Promise(r => setTimeout(r, 800));
          setShaking(null);
          break;

        case 'PIERCE': 
          setMoveDuration(250);
          atkSetter({ state: 'RUN', frame: 1, weaponId: activeWeaponId });
          offsetSetter({ x: meleeDistance, y: 0 });
          await new Promise(r => setTimeout(r, 250));
          for (let loop = 0; loop < 2; loop++) {
            for (let i = 1; i <= 4; i++) {
              atkSetter({ state: 'PIERCE', frame: i, weaponId: activeWeaponId });
              if (loop === 0 && i === 2) executeHit(Math.floor(dmg), isP, hitType);
              await new Promise(r => setTimeout(r, 100));
            }
          }
          break;

        case 'SWING': 
          setMoveDuration(600); 
          offsetSetter({ x: 96 * dir, y: 0 });
          for(let i=1; i<=3; i++) {
            atkSetter({ state: 'SWING', frame: i, weaponId: activeWeaponId });
            await new Promise(r => setTimeout(r, 200)); 
          }
          setMoveDuration(80); 
          offsetSetter({ x: meleeDistance, y: 0 });
          atkSetter({ state: 'SWING', frame: 4, weaponId: activeWeaponId });
          await new Promise(r => setTimeout(r, 80));
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
              atkSetter({ state: 'THROW', frame: i, weaponId: activeWeaponId });
              if (i === 2) {
                const containerRect = containerRef.current?.getBoundingClientRect();
                const pRect = pRef.current?.getBoundingClientRect();
                if (containerRect && pRect && nRef.current) {
                  const nRect = nRef.current.getBoundingClientRect();
                  const pCenterX = (pRect.left - containerRect.left + pRect.width / 2) / uiScale;
                  const nCenterX = (nRect.left - containerRect.left + nRect.width / 2) / uiScale;
                  const startX = isP ? pCenterX : nCenterX;
                  const targetX = isP ? nCenterX : pCenterX;
                  const p1Id = ++projectileCounter.current;
                  const p2Id = ++projectileCounter.current;
                  setProjectiles(prev => [
                    ...prev, 
                    { id: p1Id, isPlayer: isP, startX, targetX },
                    { id: p2Id, isPlayer: isP, startX, targetX }
                  ]);
                  setTimeout(() => { executeHit(Math.floor(dmg/2), isP, 'SKILL'); }, 400); 
                  setTimeout(() => { executeHit(Math.ceil(dmg/2), isP, 'SKILL'); }, 550);
                  setTimeout(() => {
                    setProjectiles(prev => prev.filter(p => p.id !== p1Id && p.id !== p2Id));
                  }, 1000);
                }
              }
              await new Promise(r => setTimeout(r, 120));
            }
          }
          setFlash(null);
          break;

        case 'SLASH': 
          setMoveDuration(300);
          atkSetter({ state: 'RUN', frame: 1, weaponId: activeWeaponId });
          offsetSetter({ x: meleeDistance, y: 0 });
          await new Promise(r => setTimeout(r, 300));
          for(let i=1; i<=3; i++) { 
            atkSetter({ state: 'SLASH', frame: i, weaponId: activeWeaponId });
            if (i === 2) executeHit(Math.floor(dmg), isP, hitType);
            await new Promise(r => setTimeout(r, 110));
          }
          break;

        case 'PUNCH':
          setMoveDuration(250);
          atkSetter({ state: 'RUN', frame: 1, weaponId: undefined });
          offsetSetter({ x: meleeDistance, y: 0 });
          await new Promise(r => setTimeout(r, 250));
          for(let i=1; i<=2; i++) {
            atkSetter({ state: 'PUNCH', frame: i, weaponId: undefined });
            if (i === 2) executeHit(Math.floor(dmg), isP, hitType);
            await new Promise(r => setTimeout(r, 150));
          }
          break;
      }

      await new Promise(r => setTimeout(r, 100));
      setMoveDuration(500);
      atkSetter({ state: 'IDLE', frame: 1, weaponId: atk.weaponSkin }); 
      offsetSetter({ x: 0, y: 0 });
      await new Promise(r => setTimeout(r, 500));

      if (!battleOver) { setTurn(prev => prev === 'P' ? 'N' : 'P'); }
    }, 1200);

    return () => clearTimeout(combatTimer);
  }, [turn, battleOver, fighters, uiScale]);

  const executeHit = (dmg: number, isPAttacking: boolean, type: string) => {
    setFighters(prev => {
      if (!prev) return prev;
      const next = { p: { ...prev.p }, n: { ...prev.n } };
      const target = isPAttacking ? next.n : next.p;
      target.hp = Math.max(0, target.hp - dmg);
      const defSetter = isPAttacking ? setNVisual : setPVisual;
      defSetter(v => ({ ...v, state: 'HURT', frame: 1 }));
      setShaking(isPAttacking ? 'N' : 'P');
      const effectId = ++effectCounter.current;
      setEffects(e => [...e, { id: effectId, text: `-${dmg}`, isPlayer: !isPAttacking, color: type === 'SKILL' ? '#f59e0b' : '#ef4444' }]);
      setTimeout(() => {
        setShaking(null);
        setEffects(e => e.filter(item => item.id !== effectId));
        if (target.hp > 0) { defSetter(v => ({ ...v, state: 'IDLE', frame: 1 })); }
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
      <div className={`mt-1 md:mt-3 flex flex-col gap-0.5 md:gap-1.5 ${align === 'right' ? 'items-end' : 'items-start'}`}>
        <div className={`flex flex-wrap gap-0.5 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
          {ownedWeapons.map(w => (
            <span key={w.id} className="px-1 md:px-2 py-0.5 bg-slate-800/90 text-orange-400 text-[7px] md:text-[10px] font-black rounded border border-orange-500/30 shadow-sm whitespace-nowrap">⚔️ {w.name}</span>
          ))}
        </div>
        <div className={`flex flex-wrap gap-0.5 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
          {ownedSkills.map(s => (
            <span key={s.id} className="px-1 md:px-2 py-0.5 bg-slate-800/90 text-blue-400 text-[7px] md:text-[10px] font-black rounded border border-blue-500/30 shadow-sm whitespace-nowrap">📜 {s.name}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`fixed inset-0 z-[200] bg-black flex flex-col h-screen w-screen overflow-hidden ${shaking === 'SCREEN' ? 'animate-heavyShake' : ''}`}>
      {flash && <div className="absolute inset-0 z-[160] pointer-events-none animate-pulse" style={{ backgroundColor: flash }}></div>}
      <div className="relative w-full flex-grow flex flex-col items-center justify-end bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 overflow-hidden shadow-inner">
           
           {/* 顶部状态栏区域 */}
           <div className="absolute top-2 md:top-4 inset-x-0 z-[250] pointer-events-none px-0 md:px-8">
              <div 
                className="absolute left-0 top-0 w-[43%] md:w-[48%] max-w-[380px] pointer-events-auto"
                style={{ transform: `scale(${uiScale})`, transformOrigin: 'top left' }}
              >
                <div className="flex justify-between items-end text-white text-[8px] md:text-xs font-black mb-0.5 md:mb-1.5 drop-shadow-lg uppercase tracking-tight pl-1 md:pl-4">
                  <div className="flex items-center gap-0.5 md:gap-2">
                    <span className="bg-orange-600 px-1 md:px-4 py-0.5 md:py-1 rounded-l italic text-[8px] md:text-sm">PLAYER</span>
                    <span className="bg-slate-700/80 px-1 md:px-3 py-0.5 md:py-1 rounded-r border-r border-slate-500/30">Lv.{fighters.p.level}</span>
                  </div>
                  <span className="ml-auto font-mono text-[10px] md:text-xl text-emerald-400 pr-1">{Math.ceil(fighters.p.hp)}</span>
                </div>
                <div className="h-2 md:h-6 bg-black/60 rounded-r-full border-y border-r border-slate-500/40 overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                  <div className="h-full bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-400 transition-all duration-500 relative" style={{ width: `${(fighters.p.hp/fighters.p.maxHp)*100}%` }}><div className="absolute inset-0 bg-white/10 animate-pulse"></div></div>
                </div>
                <div className="pl-1 md:pl-4">{renderAssets(fighters.p, 'left')}</div>
              </div>

              <div 
                className="absolute right-0 top-0 w-[43%] md:w-[48%] max-w-[380px] pointer-events-auto text-right"
                style={{ transform: `scale(${uiScale})`, transformOrigin: 'top right' }}
              >
                <div className="flex justify-between items-end text-white text-[8px] md:text-xs font-black mb-0.5 md:mb-1.5 drop-shadow-lg uppercase tracking-tight pr-1 md:pr-4">
                  <span className="font-mono text-[10px] md:text-xl text-rose-400 pl-1">{Math.ceil(fighters.n.hp)}</span>
                  <div className="flex items-center gap-0.5 md:gap-2 ml-auto">
                    <span className="bg-slate-700/80 px-1 md:px-3 py-0.5 md:py-1 rounded-l border-l border-slate-500/30">Lv.{fighters.n.level}</span>
                    <span className="bg-red-600 px-1 md:px-4 py-0.5 md:py-1 rounded-r italic text-[8px] md:text-sm">ENEMY</span>
                  </div>
                </div>
                <div className="h-2 md:h-6 bg-black/60 rounded-l-full border-y border-l border-slate-500/40 overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                  <div className="h-full bg-gradient-to-l from-red-700 via-rose-600 to-red-500 transition-all duration-500 ml-auto relative" style={{ width: `${(fighters.n.hp/fighters.n.maxHp)*100}%` }}><div className="absolute inset-0 bg-white/10 animate-pulse"></div></div>
                </div>
                <div className="pr-1 md:pr-4">{renderAssets(fighters.n, 'right')}</div>
              </div>
           </div>
           
           <div className="absolute top-[22%] text-white/[0.02] md:text-white/10 font-black text-[2.5rem] md:text-[12rem] italic select-none pointer-events-none uppercase tracking-widest drop-shadow-2xl z-10">VS</div>
           
           <div className="absolute inset-0 z-[150] pointer-events-none overflow-hidden" style={{ transform: `scale(${uiScale})`, transformOrigin: 'bottom center' }}>
              {projectiles.map((p, idx) => (
                <div 
                  key={p.id}
                  className="absolute bottom-[192px] w-5 h-5 md:w-6 md:h-6 bg-red-600 rounded-full shadow-[0_0_20px_#ef4444,0_0_5px_white] flex items-center justify-center animate-projectile"
                  style={{
                    left: `${p.startX}px`,
                    '--tx': `${p.targetX - p.startX}px`,
                    '--delay': `${idx % 2 === 0 ? '0s' : '0.15s'}`
                  } as any}
                >
                  <div className="w-full h-full bg-white/40 rounded-full blur-[2px]"></div>
                  <div className="absolute right-full w-12 h-3 bg-gradient-to-l from-red-500/80 to-transparent rounded-full -mr-1"></div>
                </div>
              ))}
           </div>
           <div className="relative flex flex-col items-center justify-end transition-transform duration-300" style={{ width: '1000px', height: '450px', transform: `scale(${uiScale})`, transformOrigin: 'bottom center' }}>
              <div className="relative w-full h-full flex items-end justify-center pb-0">
                <div className="w-full h-72 flex justify-between px-12 relative">
                  <div ref={pRef} className="relative z-20" style={{ transform: `translate(${pOffset.x}px, ${pOffset.y}px)`, transition: moveDuration === 0 ? 'none' : `transform ${moveDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` }}>
                    <div className={`${shaking === 'P' ? 'animate-shake' : ''} ${['CLEAVE', 'PUNCH'].includes(pVisual.state) ? 'animate-vibrate' : ''}`}>
                      <CharacterVisual 
                        state={pVisual.state} 
                        frame={pVisual.frame} 
                        weaponId={pVisual.weaponId}
                        debug={isDebugMode}
                        accessory={{ head: DRESSINGS.find(d => d.id === player.dressing.HEAD)?.name }} 
                        isMobile={isMobile}
                      />
                    </div>
                    {effects.filter(e => e.isPlayer).map(e => (
                      <div key={e.id} className="absolute -top-32 left-0 w-full z-[170] pointer-events-none animate-damage text-center"><div className="text-5xl md:text-7xl font-black italic drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)] whitespace-nowrap" style={{ color: e.color }}>{e.text}</div></div>
                    ))}
                  </div>
                  <div ref={nRef} className="relative z-20" style={{ transform: `translate(${nOffset.x}px, ${nOffset.y}px)`, transition: moveDuration === 0 ? 'none' : `transform ${moveDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` }}>
                    <div className={`${shaking === 'N' ? 'animate-shake' : ''} ${['CLEAVE', 'PUNCH'].includes(nVisual.state) ? 'animate-vibrate' : ''}`}>
                      <div style={{ transform: 'scaleX(-1)' }}>
                        <CharacterVisual 
                          isNpc={true} 
                          state={nVisual.state} 
                          frame={nVisual.frame} 
                          weaponId={nVisual.weaponId}
                          debug={isDebugMode}
                          isMobile={isMobile}
                        />
                      </div>
                    </div>
                    {effects.filter(e => !e.isPlayer).map(e => (
                      <div key={e.id} className="absolute -top-32 left-0 w-full z-[170] pointer-events-none animate-damage text-center"><div className="text-5xl md:text-7xl font-black italic drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)] whitespace-nowrap" style={{ color: e.color }}>{e.text}</div></div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-0 w-3/4 h-[4px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>
           </div>
      </div>
      
      {/* 底部日志系统：移动端提升至 50vh */}
      <div className="w-full bg-slate-950 p-2.5 md:p-6 overflow-y-auto custom-scrollbar border-t border-slate-800 shrink-0 z-[260]" style={{ height: isMobile ? '50vh' : '30vh', maxHeight: isMobile ? 'none' : '350px' }}>
        <div className="max-w-2xl mx-auto space-y-2 md:space-y-3">
          {logs.map((log, i) => (
            <div key={i} className={`px-3 md:px-5 py-2 md:py-3.5 rounded-lg md:rounded-2xl border-l-4 text-[11px] md:text-sm shadow-lg animate-popIn ${log.attacker === '你' ? 'bg-blue-950/30 border-blue-500 text-blue-100' : log.attacker === '系统' ? 'bg-orange-900/30 border-orange-500 text-orange-100 font-bold' : 'bg-red-950/30 border-red-500 text-red-100'}`}>
              <div className="flex items-center"><span className="font-black opacity-30 mr-2 md:mr-4 uppercase text-[8px] md:text-[11px] shrink-0 tracking-widest">[{log.attacker}]</span><span className="tracking-tight font-medium leading-tight">{log.text}</span></div>
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
        @keyframes projectile-fly {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translate(var(--tx), -20px) rotate(360deg); opacity: 1; }
        }
        .animate-projectile {
          animation: projectile-fly 0.4s cubic-bezier(0.21, 0.61, 0.35, 1) var(--delay) forwards;
        }
      `}} />
    </div>
  );
};

export default Combat;