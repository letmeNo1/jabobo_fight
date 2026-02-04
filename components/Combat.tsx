
import React, { useState, useEffect, useRef } from 'react';
import { CharacterData, BattleLog, Weapon, Skill, WeaponType, SkillCategory, AttackModule, Friend } from '../types';
import { WEAPONS, SKILLS, DRESSINGS } from '../constants';
import CharacterVisual, { VisualState } from './CharacterVisual';
import CombatStatus from './CombatStatus';
import CombatLog from './CombatLog';
import { playSFX } from '../utils/audio';
import config, { AttackStep } from '../config';

export type SpecialCombatMode = 'NORMAL' | 'ELITE' | 'PROJECTILE';

interface CombatProps {
  player: CharacterData;
  specialMode?: SpecialCombatMode;
  customOpponent?: Friend | null;
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
  weaponSkin?: string;
  status: {
    stunned: number;
    sticky: number;
    disarmed: boolean;
    undeadUsed: boolean;
    buffs: { id: string; duration: number }[];
  };
}

interface VisualEffect {
  id: number;
  text: string;
  isPlayer: boolean;
  color: string;
  isCrit?: boolean;
}

interface Projectile {
  id: number;
  isPlayer: boolean;
  startX: number;
  targetX: number;
  weaponId?: string;
}

const Combat: React.FC<CombatProps> = ({ player, specialMode = 'NORMAL', customOpponent = null, isDebugMode = false, onWin, onLoss }) => {
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

  useEffect(() => {
    const handleResize = () => {
      const cw = window.innerWidth;
      setIsMobile(cw < 768);
      setUiScale(Math.min(cw / config.combat.uiScale.baseWidth, config.combat.uiScale.maxScale));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let npc: Fighter;
    const initialStatus = () => ({ stunned: 0, sticky: 0, disarmed: false, undeadUsed: false, buffs: [] });

    if (customOpponent) {
      npc = {
        name: customOpponent.name, isPlayer: false, hp: customOpponent.hp, maxHp: customOpponent.hp,
        str: customOpponent.str, agi: customOpponent.agi, spd: customOpponent.spd,
        level: customOpponent.level, weapons: customOpponent.weapons, skills: customOpponent.skills,
        weaponSkin: customOpponent.dressing.WEAPON, status: initialStatus()
      };
      setNVisual(v => ({ ...v, weaponId: customOpponent.dressing.WEAPON }));
    } else {
      const isSpecial = specialMode !== 'NORMAL';
      const npcLevel = Math.max(1, player.level + (isSpecial ? 2 : Math.floor(Math.random() * 3) - 1));
      let npcWeapons: string[] = [];
      let npcSkills: string[] = [];
      let npcName = '神秘挑战者';
      if (specialMode === 'ELITE') {
        npcName = '精英武学大师';
        npcWeapons = ['w1', 'w5', 'w9', 'w14', 'w21'];
        npcSkills = ['s12', 's10', 's32'];
      } else if (specialMode === 'PROJECTILE') {
        npcName = '千手观音·暗器大师';
        npcWeapons = WEAPONS.filter(w => w.module === 'THROW').map(w => w.id);
        npcSkills = ['s19', 's22', 's25'];
      } else {
        npcWeapons = [...WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 4).map(w => w.id);
        npcSkills = [...SKILLS].sort(() => 0.5 - Math.random()).slice(0, 5).map(s => s.id);
      }
      npc = {
        name: npcName, isPlayer: false, hp: (255 + npcLevel * 15) * (isSpecial ? 1.3 : 1), maxHp: (255 + npcLevel * 15) * (isSpecial ? 1.3 : 1),
        str: 6 + npcLevel + (isSpecial ? 3 : 0), agi: 5 + npcLevel + (specialMode === 'PROJECTILE' ? 5 : 0), spd: 4 + npcLevel + (isSpecial ? 2 : 0), level: npcLevel,
        weapons: npcWeapons, skills: npcSkills, weaponSkin: '', status: initialStatus()
      };
    }
    const pFighter: Fighter = {
      name: player.name, isPlayer: true, hp: player.maxHp, maxHp: player.maxHp, 
      str: player.str, agi: player.agi, spd: player.spd, level: player.level,
      weapons: [...player.weapons], skills: [...player.skills], weaponSkin: player.dressing.WEAPON,
      status: initialStatus()
    };
    setFighters({ p: pFighter, n: npc });
    setTurn(pFighter.spd >= npc.spd ? 'P' : 'N');
    setLogs([{ attacker: '系统', text: `⚔️ ${npc.name} 加入了战斗！` }]);
  }, [specialMode, customOpponent, player]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (battleOver) return;
      setPVisual(v => (['IDLE', 'RUN', 'HOME'].includes(v.state)) ? { ...v, frame: v.frame + 1 } : v);
      setNVisual(v => (['IDLE', 'RUN', 'HOME'].includes(v.state)) ? { ...v, frame: v.frame + 1 } : v);
    }, 125);
    return () => clearInterval(timer);
  }, [battleOver]);

  useEffect(() => {
    if (battleOver || !fighters || !turn) return;
    const combatTimer = setTimeout(async () => {
      const isP = turn === 'P';
      const atk = isP ? fighters.p : fighters.n;
      if (atk.hp <= 0) return;

      if (atk.status.stunned > 0) {
        setLogs(l => [...l, { attacker: atk.name, text: `处于晕眩中，跳过回合...` }]);
        setFighters(prev => {
          if (!prev) return prev;
          const next = { ...prev };
          const f = isP ? next.p : next.n;
          f.status.stunned--;
          return next;
        });
        setTurn(isP ? 'N' : 'P');
        return;
      }

      let actionDesc = "普通攻击";
      let dmg = 0;
      let hitType: 'NORMAL' | 'SKILL' = 'NORMAL';
      let currentModule: AttackModule = 'SLASH';
      let activeWeaponId = atk.weaponSkin;
      let actionSfx = 'punch'; 
      let actionSfxFrame = 1;
      let comboCount = 1;

      const roll = Math.random();
      const activeSkills = SKILLS.filter(s => atk.skills.includes(s.id) && s.category === SkillCategory.ACTIVE);
      const ownedWeapons = WEAPONS.filter(w => atk.weapons.includes(w.id));

      if (roll < 0.25 && activeSkills.length > 0) {
        const skill = activeSkills[Math.floor(Math.random() * activeSkills.length)];
        actionDesc = `使用了技能【${skill.name}】`;
        hitType = 'SKILL'; 
        dmg = Math.floor((15 + atk.level * 2) * (1 + atk.str * 0.05)); 
        currentModule = skill.module || 'PUNCH'; 
        activeWeaponId = skill.id;
        actionSfx = skill.sfx || 'skill_cast';
        actionSfxFrame = skill.sfxFrame || 1;
        
        if (skill.id === 's21') {
          const heal = Math.floor(atk.maxHp * 0.25);
          setFighters(prev => {
            if (!prev) return prev;
            const next = { ...prev };
            const f = isP ? next.p : next.n;
            f.hp = Math.min(f.maxHp, f.hp + heal);
            return next;
          });
          setEffects(e => [...e, { id: ++effectCounter.current, text: `+${heal}`, isPlayer: isP, color: '#10b981' }]);
        }
      } else if (roll < 0.7 && ownedWeapons.length > 0 && !atk.status.disarmed) {
        const weapon = ownedWeapons[Math.floor(Math.random() * ownedWeapons.length)];
        actionDesc = `挥动了【${weapon.name}】`;
        dmg = Math.floor((weapon.baseDmg[0] + Math.random() * (weapon.baseDmg[1] - weapon.baseDmg[0])) * (1 + atk.str * 0.05));
        currentModule = weapon.module; 
        activeWeaponId = weapon.id;
        actionSfx = weapon.sfx || 'slash';
        actionSfxFrame = weapon.sfxFrame || 1;
        if (weapon.id === 'w5' && Math.random() < 0.2) comboCount = 2;
      } else {
        actionDesc = "打出一记正拳";
        dmg = Math.floor(atk.str * (1.2 + Math.random() * 0.8));
        currentModule = 'PUNCH'; 
        activeWeaponId = undefined;
        actionSfx = 'punch';
        actionSfxFrame = 1;
      }

      const atkSetter = isP ? setPVisual : setNVisual;
      const offsetSetter = isP ? setPOffset : setNOffset;
      const dir = isP ? 1 : -1;
      
      // 解析位移类型对应的像素值
      const resolveOffset = (type: string) => {
        if (type === 'MELEE') return (isMobile ? config.combat.spacing.meleeDistanceMobile : config.combat.spacing.meleeDistancePC) * dir;
        if (type === 'BASE') return (isMobile ? config.combat.spacing.baseActionOffsetMobile : config.combat.spacing.baseActionOffsetPC) * dir;
        return 0;
      };

      setLogs(l => [...l, { attacker: atk.name, text: `${actionDesc}` }]);
      
      const performAction = async () => {
        const moduleConfig = config.ATTACK_SEQUENCES[currentModule] || config.ATTACK_SEQUENCES.SLASH;
        const totalLoops = moduleConfig.repeat || 1;

        if (currentModule === 'THROW') setFlash(isP ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)');
        if (hitType === 'SKILL' && currentModule !== 'PUNCH') playSFX('skill_cast');

        for (let loop = 0; loop < totalLoops; loop++) {
          for (const step of moduleConfig.steps) {
            setMoveDuration(step.moveDuration);
            offsetSetter({ x: resolveOffset(step.offset), y: step.offsetY || 0 });
            atkSetter({ state: step.state as VisualState, frame: step.frame, weaponId: activeWeaponId });

            if (step.playSfx) {
              const sfxToPlay = (hitType === 'SKILL' || WeaponType.THROW === WEAPONS.find(w=>w.id===activeWeaponId)?.type) ? actionSfx : (currentModule === 'THROW' ? 'throw_light' : actionSfx);
              playSFX(sfxToPlay);
            }

            if (step.projectile) {
              const containerRect = containerRef.current?.getBoundingClientRect();
              const pRect = pRef.current?.getBoundingClientRect();
              if (containerRect && pRect && nRef.current) {
                const nRect = nRef.current.getBoundingClientRect();
                const pCenterX = (pRect.left - containerRect.left + pRect.width / 2) / uiScale;
                const nCenterX = (nRect.left - containerRect.left + nRect.width / 2) / uiScale;
                const startX = isP ? pCenterX : nCenterX; 
                const targetX = isP ? nCenterX : pCenterX;
                
                const waveCount = 3;
                for (let j = 0; j < waveCount; j++) {
                  setTimeout(() => {
                    const pId = ++projectileCounter.current;
                    setProjectiles(prev => [...prev, { id: pId, isPlayer: isP, startX, targetX, weaponId: activeWeaponId }]);
                    if (loop === totalLoops - 1 && j === waveCount - 1) {
                       setTimeout(() => { calculateHit(Math.floor(dmg), isP, hitType); }, 400); 
                    }
                    setTimeout(() => setProjectiles(prev => prev.filter(p => p.id !== pId)), 1000);
                  }, j * 100);
                }
              }
            }

            if (step.shaking) {
               setShaking(step.shaking);
               setTimeout(() => setShaking(null), 150);
            }

            if (step.calculateHit && currentModule !== 'THROW') {
              calculateHit(Math.floor(dmg * (currentModule === 'CLEAVE' ? 1.2 : 1)), isP, hitType);
            }

            await new Promise(r => setTimeout(r, step.delay));
          }
        }
        setFlash(null);
      };

      for (let i = 0; i < comboCount; i++) {
        if (battleOver) break;
        await performAction();
        if (comboCount > 1 && i === 0) await new Promise(r => setTimeout(r, 200));
      }

      await new Promise(r => setTimeout(r, 100)); 
      setMoveDuration(500);
      atkSetter({ state: 'IDLE', frame: 1, weaponId: atk.weaponSkin }); 
      offsetSetter({ x: 0, y: 0 }); 
      await new Promise(r => setTimeout(r, 500));
      
      if (!battleOver) setTurn(prev => prev === 'P' ? 'N' : 'P');
    }, 1200);
    return () => clearTimeout(combatTimer);
  }, [turn, battleOver, fighters]);

  const calculateHit = (baseDmg: number, isPAttacking: boolean, type: string) => {
    let finalDmg = baseDmg;
    let isCrit = Math.random() < 0.1;
    if (isCrit) finalDmg = Math.floor(finalDmg * 1.5);

    setFighters(prev => {
      if (!prev) return prev;
      const next = { p: { ...prev.p }, n: { ...prev.n } };
      const attacker = isPAttacking ? next.p : next.n;
      const defender = isPAttacking ? next.n : next.p;
      const defVisualSetter = isPAttacking ? setNVisual : setPVisual;
      const atkVisualSetter = isPAttacking ? setPVisual : setNVisual;

      const dodgeChance = Math.min(0.3, (defender.agi + (defender.skills.includes('s13') ? 7 : 0)) / 100);
      if (Math.random() < dodgeChance) {
        setLogs(l => [...l, { attacker: defender.name, text: `闪避了攻击！` }]);
        defVisualSetter(v => ({ ...v, state: 'DODGE', frame: 1 }));
        setTimeout(() => defVisualSetter(v => ({ ...v, state: 'IDLE', frame: 1 })), 600);
        return next;
      }

      if (defender.skills.includes('s12')) finalDmg = Math.floor(finalDmg * 0.8);
      
      if (defender.skills.includes('s11') && Math.random() < 0.15) {
        setLogs(l => [...l, { attacker: defender.name, text: `触发了【大海无量】，反弹了全部伤害！` }]);
        attacker.hp = Math.max(0, attacker.hp - finalDmg);
        setEffects(e => [...e, { id: ++effectCounter.current, text: `REFLECT ${finalDmg}`, isPlayer: isPAttacking, color: '#facc15' }]);
        atkVisualSetter(v => ({ ...v, state: 'HURT', frame: 1 }));
        setTimeout(() => atkVisualSetter(v => ({ ...v, state: 'IDLE', frame: 1 })), 600);
        return next;
      }

      defender.hp = Math.max(0, defender.hp - finalDmg);
      
      setShaking(isPAttacking ? 'N' : 'P');
      const effectId = ++effectCounter.current;
      setEffects(e => [...e, { id: effectId, text: `${isCrit ? 'CRIT ' : ''}-${finalDmg}`, isPlayer: !isPAttacking, color: isCrit ? '#fcd34d' : (type === 'SKILL' ? '#f59e0b' : '#ef4444'), isCrit }]);
      
      if (attacker.skills.includes('s32')) {
        const heal = Math.floor(finalDmg * 0.3);
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
        setEffects(e => [...e, { id: ++effectCounter.current, text: `+${heal}`, isPlayer: isPAttacking, color: '#10b981' }]);
      }

      defVisualSetter(v => ({ ...v, state: 'HURT', frame: 1 }));
      setTimeout(() => {
        setShaking(null); 
        setEffects(e => e.filter(item => item.id !== effectId));
        if (defender.hp > 0) defVisualSetter(v => ({ ...v, state: 'IDLE', frame: 1 }));
      }, 800);

      if (defender.hp <= 0 && defender.skills.includes('s16') && !defender.status.undeadUsed) {
        defender.hp = 1;
        defender.status.undeadUsed = true;
        setLogs(l => [...l, { attacker: defender.name, text: `触发了【装死】，保留了1点生命！` }]);
      }

      if (defender.hp <= 0) {
        setBattleOver(true);
        setLogs(l => [...l, { attacker: '系统', text: `🏁 ${defender.name} 倒下了！` }]);
        setTimeout(() => isPAttacking ? onWin(Math.floor(attacker.level * 25), Math.floor(attacker.level * 35)) : onLoss(Math.floor(attacker.level * 15)), 1200);
      }
      
      return next;
    });
  };

  if (!fighters) return null;

  const currentContainerWidth = isMobile ? config.combat.spacing.containerWidthMobile : config.combat.spacing.containerWidthPC;
  const currentContainerHeight = isMobile ? config.combat.spacing.containerHeightMobile : config.combat.spacing.containerHeightPC;
  const currentVsTop = isMobile ? config.combat.spacing.vsTextTopMobile : config.combat.spacing.vsTextTopPC;
  const currentSidePadding = isMobile ? config.combat.spacing.sidePaddingMobile : config.combat.spacing.sidePaddingPC;
  const currentGroundHeight = isMobile ? config.combat.spacing.groundHeightMobile : config.combat.spacing.groundHeightPC;
  const currentProjectileBottom = isMobile ? config.combat.spacing.projectileBottomMobile : config.combat.spacing.projectileBottomPC;

  return (
    <div ref={containerRef} className={`fixed inset-0 z-[200] bg-slate-950 flex flex-col h-screen w-screen overflow-hidden ${shaking === 'SCREEN' ? 'animate-heavyShake' : ''}`}>
      {flash && <div className="absolute inset-0 z-[160] pointer-events-none animate-pulse" style={{ backgroundColor: flash }}></div>}
      <div className="relative w-full flex-grow flex flex-col items-center justify-end bg-[radial-gradient(ellipse_at_center,rgba(30,41,59,1)_0%,rgba(15,23,42,1)_100%)] overflow-hidden">
           <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
           
           <div className="absolute top-2 md:top-4 inset-x-0 z-[250] pointer-events-none px-2 md:px-8">
              <CombatStatus fighter={fighters.p} side="left" uiScale={uiScale} label="YOU" />
              <CombatStatus fighter={fighters.n} side="right" uiScale={uiScale} isSpecial={specialMode !== 'NORMAL'} label={specialMode === 'PROJECTILE' ? 'PROJECTILE' : specialMode === 'ELITE' ? 'ELITE' : (customOpponent ? 'RIVAL' : 'ENEMY')} />
           </div>

           <div className="absolute font-black italic select-none pointer-events-none uppercase tracking-widest drop-shadow-2xl z-10 text-white/[0.03] md:text-white/10 text-[4rem] md:text-[14rem]" style={{ top: currentVsTop }}>VS</div>
           
           <div className="absolute inset-0 z-[150] pointer-events-none overflow-hidden" style={{ transform: `scale(${uiScale})`, transformOrigin: 'bottom center' }}>
              {projectiles.map((p) => {
                const weaponImg = p.weaponId ? window.assetMap?.get(`Images/${p.weaponId}_throw.png`) : null;
                return (
                  <div key={p.id} className={`absolute ${config.combat.projectiles.sizeMobile} ${config.combat.projectiles.sizePC} flex items-center justify-center animate-projectile`} style={{ bottom: currentProjectileBottom, left: `${p.startX}px`, '--tx': `${p.targetX - p.startX}px` } as any}>
                    {weaponImg ? <img src={weaponImg} className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]" alt="projectile" /> : <div className="w-6 h-6 bg-red-600 rounded-full shadow-[0_0_20px_#ef4444]"><div className="w-full h-full bg-white/40 rounded-full blur-[2px]"></div></div>}
                  </div>
                );
              })}
           </div>

           <div className="relative flex flex-col items-center justify-end" style={{ width: `${currentContainerWidth}px`, height: `${currentContainerHeight}px`, transform: `scale(${uiScale})`, transformOrigin: 'bottom center' }}>
              <div className="relative w-full h-full flex items-end justify-center">
                <div className="w-full flex justify-between relative" style={{ height: `${currentGroundHeight}px`, paddingLeft: `${currentSidePadding}px`, paddingRight: `${currentSidePadding}px` }}>
                  <div ref={pRef} className="relative z-20" style={{ transform: `translate(${pOffset.x}px, ${pOffset.y}px)`, transition: moveDuration === 0 ? 'none' : `transform ${moveDuration}ms cubic-bezier(0.2, 0.8, 0.2, 1.1)` }}>
                    <div className={`${shaking === 'P' ? 'animate-shake' : ''}`}>
                      <CharacterVisual name={fighters.p.name} state={pVisual.state} frame={pVisual.frame} weaponId={pVisual.weaponId} isMobile={isMobile} accessory={{ head: DRESSINGS.find(d => d.id === player.dressing.HEAD)?.name }} />
                    </div>
                    {effects.filter(e => e.isPlayer).map(e => (
                      <div key={e.id} className="absolute -top-32 left-0 w-full z-[170] pointer-events-none animate-damage text-center">
                        <div className={`font-black italic drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)] whitespace-nowrap ${e.isCrit ? 'text-6xl md:text-8xl' : 'text-5xl md:text-7xl'}`} style={{ color: e.color }}>{e.text}</div>
                      </div>
                    ))}
                  </div>

                  <div ref={nRef} className="relative z-20" style={{ transform: `translate(${nOffset.x}px, ${nOffset.y}px)`, transition: moveDuration === 0 ? 'none' : `transform ${moveDuration}ms cubic-bezier(0.2, 0.8, 0.2, 1.1)` }}>
                    <div className={`${shaking === 'N' ? 'animate-shake' : ''}`}>
                      <div style={{ transform: 'scaleX(-1)' }}><CharacterVisual name={fighters.n.name} isNpc={true} state={nVisual.state} frame={nVisual.frame} weaponId={nVisual.weaponId} isMobile={isMobile} /></div>
                    </div>
                    {effects.filter(e => !e.isPlayer).map(e => (
                      <div key={e.id} className="absolute -top-32 left-0 w-full z-[170] pointer-events-none animate-damage text-center">
                        <div className={`font-black italic drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)] whitespace-nowrap ${e.isCrit ? 'text-6xl md:text-8xl' : 'text-5xl md:text-7xl'}`} style={{ color: e.color }}>{e.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-4 w-4/5 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-sm"></div>
              </div>
           </div>
      </div>

      <CombatLog logs={logs} logEndRef={logEndRef} isMobile={isMobile} />
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes damagePop { 0% { opacity: 0; transform: translateY(20px) scale(0.5); } 15% { opacity: 1; transform: translateY(-60px) scale(1.4); } 80% { opacity: 1; transform: translateY(-120px) scale(1); } 100% { opacity: 0; transform: translateY(-180px) scale(0.6); } }
        .animate-damage { animation: damagePop 1s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards; }
        @keyframes heavyShake { 0%, 100% { transform: translate(0, 0); } 10%, 30%, 50%, 70%, 90% { transform: translate(-8px, -8px); } 20%, 40%, 60%, 80% { transform: translate(8px, 8px); } }
        .animate-heavyShake { animation: heavyShake 0.4s ease-out; }
        @keyframes shake { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(-20px, 8px); } 50% { transform: translate(16px, -6px); } 75% { transform: translate(-10px, 4px); } }
        .animate-shake { animation: shake 0.25s ease-in-out; }
        @keyframes projectile-fly { 0% { transform: translate(0, 0) scale(0.7) rotate(0deg); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(var(--tx), -40px) scale(1.2) rotate(1440deg); opacity: 1; } }
        .animate-projectile { animation: projectile-fly 0.55s cubic-bezier(0.2, 0.8, 0.4, 1) forwards; }
      `}} />
    </div>
  );
};

export default Combat;
