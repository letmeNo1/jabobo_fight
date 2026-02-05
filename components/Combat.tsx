
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
    disarmed: number;
    afterimage: number;
    undeadUsed: boolean;
    buffs: { id: string; duration: number }[];
    dots: { id: string; dmg: number; duration: number }[];
    usedSkills: string[];
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
  startX: number;
  targetX: number;
  weaponId?: string;
  isToLeft: boolean;
  isWave?: boolean; 
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
  const [uiScale, setUiScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);
  const battleAreaRef = useRef<HTMLDivElement>(null);
  const effectCounter = useRef(0);
  const projectileCounter = useRef(0);
  const currentActionResolved = useRef<{ isHit: boolean; dmg: number; onHit?: () => void } | null>(null);

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
    const initialStatus = () => ({ stunned: 0, sticky: 0, disarmed: 0, afterimage: 0, undeadUsed: false, buffs: [], dots: [], usedSkills: [] });

    if (customOpponent) {
      npc = {
        name: customOpponent.name, isPlayer: false, hp: customOpponent.hp, maxHp: customOpponent.hp,
        str: customOpponent.str, agi: customOpponent.agi, spd: customOpponent.spd,
        level: customOpponent.level, weapons: [...customOpponent.weapons], skills: [...customOpponent.skills],
        weaponSkin: customOpponent.dressing.WEAPON, status: initialStatus()
      };
      setNVisual(v => ({ ...v, weaponId: customOpponent.dressing.WEAPON }));
    } else {
      const isSpecial = specialMode !== 'NORMAL';
      const npcLevel = Math.max(1, player.level + (isSpecial ? 2 : Math.floor(Math.random() * 3) - 1));
      let npcWeapons = [...WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 4).map(w => w.id);
      let npcName = '乐斗达人';
      let npcStr = 6 + npcLevel, npcAgi = 5 + npcLevel, npcSpd = 4 + npcLevel;
      
      if (specialMode === 'ELITE') {
        npcName = '精英教头';
        npcWeapons = ['w1', 'w5', 'w9', 'w14', 'w21'];
        npcStr += 5; npcAgi += 25; npcSpd += 5;
      } else if (specialMode === 'PROJECTILE') {
        npcName = '暗器专家';
        const throwIds = WEAPONS.filter(w => w.type === WeaponType.THROW).map(w => w.id);
        npcWeapons = [...new Set([...throwIds, 'w19', 'w20'])];
      }

      npc = {
        name: npcName, isPlayer: false, hp: Math.floor((255 + npcLevel * 15) * (specialMode === 'ELITE' ? 1.5 : 1)), maxHp: Math.floor((255 + npcLevel * 15) * (specialMode === 'ELITE' ? 1.5 : 1)),
        str: npcStr, agi: npcAgi, spd: npcSpd, level: npcLevel,
        weapons: npcWeapons, skills: [...SKILLS].sort(() => 0.5 - Math.random()).slice(0, 5).map(s => s.id), weaponSkin: '', status: initialStatus()
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
    setLogs([{ attacker: '系统', text: `⚔️ ${npc.name} 准备好和你大干一场了！` }]);
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
      const def = isP ? fighters.n : fighters.p;
      if (atk.hp <= 0) return;

      const activeDots = atk.status.dots;
      if (activeDots.length > 0) {
        const totalDotDmg = activeDots.reduce((sum, d) => sum + d.dmg, 0);
        if (totalDotDmg > 0) {
          setLogs(l => [...l, { attacker: '系统', text: `${atk.name} 受到持续毒性伤害...` }]);
          applyDamage(totalDotDmg, !isP, isP ? setPVisual : setNVisual, '#a855f7');
          await new Promise(r => setTimeout(r, 800));
          if (atk.hp - totalDotDmg <= 0) {
            setFighters(prev => {
              if (!prev) return prev;
              const n = { p: { ...prev.p }, n: { ...prev.n } };
              (isP ? n.p : n.n).hp = 0;
              return n;
            });
            setBattleOver(true);
            setTimeout(() => isP ? onLoss(20) : onWin(Math.floor(atk.level * 25), Math.floor(atk.level * 35)), 1000);
            return;
          }
        }
      }

      setFighters(prev => {
        if (!prev) return prev;
        const next = { p: { ...prev.p }, n: { ...prev.n } };
        const f = isP ? next.p : next.n;
        f.status = { 
          ...f.status,
          disarmed: Math.max(0, f.status.disarmed - 1),
          afterimage: Math.max(0, f.status.afterimage - 1),
          sticky: Math.max(0, f.status.sticky - 1),
          dots: f.status.dots.map(d => ({ ...d, duration: d.duration - 1 })).filter(d => d.duration > 0)
        };
        return next;
      });

      if (atk.status.sticky > 0) {
        setLogs(l => [...l, { attacker: atk.name, text: '被黏住了，无法动弹！' }]);
        setTurn(isP ? 'N' : 'P');
        return;
      }

      const actionPool: { type: 'SKILL' | 'WEAPON' | 'PUNCH', id?: string, weight: number }[] = [];
      const activeOwnedSkills = SKILLS.filter(s => 
        atk.skills.includes(s.id) && 
        (s.category === SkillCategory.ACTIVE || s.category === SkillCategory.SPECIAL) &&
        !atk.status.usedSkills.includes(s.id)
      );
      activeOwnedSkills.forEach(s => actionPool.push({ type: 'SKILL', id: s.id, weight: 40 / activeOwnedSkills.length }));
      
      if (atk.status.disarmed <= 0 && atk.weapons.length > 0) {
        atk.weapons.forEach(wid => actionPool.push({ type: 'WEAPON', id: wid, weight: 45 / atk.weapons.length }));
      }
      
      actionPool.push({ type: 'PUNCH', weight: (atk.status.disarmed > 0 || atk.weapons.length === 0) ? 80 : 15 });

      const totalWeight = actionPool.reduce((sum, item) => sum + item.weight, 0);
      let random = Math.random() * totalWeight;
      let selectedAction = actionPool[actionPool.length - 1];
      for (const action of actionPool) {
        if (random < action.weight) { selectedAction = action; break; }
        random -= action.weight;
      }

      let actionDesc = "普通攻击", dmg = Math.floor(atk.str * 1.5 * (atk.status.afterimage > 0 ? 1.1 : 1.0));
      let currentModule: AttackModule = 'PUNCH', activeVisualId = undefined, usedSfx = 'punch', onHitEffect: (() => void) | undefined = undefined;

      if (selectedAction.type === 'SKILL') {
        const skill = SKILLS.find(s => s.id === selectedAction.id)!;
        actionDesc = `使用了技能【${skill.name}】`;
        currentModule = skill.module || 'PUNCH';
        usedSfx = skill.sfx || 'skill_cast';
        activeVisualId = skill.id;
        
        setFighters(prev => {
          if (!prev) return prev;
          const n = { p: { ...prev.p }, n: { ...prev.n } };
          (isP ? n.p : n.n).status.usedSkills.push(skill.id);
          return n;
        });

        if (skill.id === 's15') dmg = Math.max(0, def.hp - 1);
        else if (skill.id === 's17') {
          dmg = Math.floor(atk.str * 1.3);
          onHitEffect = () => {
             setFighters(prev => {
               if (!prev) return prev;
               const next = { p: { ...prev.p }, n: { ...prev.n } };
               const a = isP ? next.p : next.n;
               const d = isP ? next.n : next.p;
               if (d.weapons.length > 0) {
                 if (Math.random() < 0.7) {
                   const stolenIdx = Math.floor(Math.random() * d.weapons.length);
                   const stolenId = d.weapons[stolenIdx];
                   const weaponObj = WEAPONS.find(w => w.id === stolenId);
                   setLogs(l => [...l, { attacker: '系统', text: `✨ 夺取成功！${a.name} 夺走了对方的【${weaponObj?.name}】并据为己有！` }]);
                   d.weapons = d.weapons.filter(id => id !== stolenId);
                   a.weapons = [...a.weapons, stolenId];
                   d.status = { ...d.status, disarmed: 3 };
                 } else {
                   setLogs(l => [...l, { attacker: '系统', text: `💨 夺取失败！对方紧紧攥住了武器。` }]);
                 }
               } else {
                 setLogs(l => [...l, { attacker: '系统', text: `❌ 夺取失败！对方赤手空拳，无武器可夺。` }]);
               }
               return next;
             });
          };
        } else if (skill.id === 's18') {
          dmg = 0;
          setFighters(prev => {
            if (!prev) return prev;
            const n = { p: { ...prev.p }, n: { ...prev.n } };
            const target = isP ? n.p : n.n;
            target.status = { ...target.status, afterimage: 4 };
            return n;
          });
        } else if (skill.id === 's19') dmg = Math.floor(15 + atk.level * 1.5);
        else if (skill.id === 's22') {
          dmg = 0;
          onHitEffect = () => {
             setLogs(l => [...l, { attacker: '系统', text: `🕸️ ${def.name} 被黏住了！` }]);
             setFighters(prev => {
               if (!prev) return prev;
               const n = { p: { ...prev.p }, n: { ...prev.n } };
               const target = isP ? n.n : n.p;
               target.status = { ...target.status, sticky: 3 };
               return n;
             });
          };
        }
        else dmg = Math.floor(atk.str * 2.2);
      } else if (selectedAction.type === 'WEAPON') {
        const weapon = WEAPONS.find(w => w.id === selectedAction.id)!;
        actionDesc = `使用了武器【${weapon.name}】`;
        dmg = Math.floor((weapon.baseDmg[0] + Math.random() * (weapon.baseDmg[1] - weapon.baseDmg[0])) * (1 + atk.str * 0.05) * (atk.status.afterimage > 0 ? 1.1 : 1.0));
        currentModule = weapon.module;
        usedSfx = weapon.sfx || 'slash';
        activeVisualId = weapon.id;
        
        if (weapon.id === 'w23') {
          onHitEffect = () => {
             setLogs(l => [...l, { attacker: '系统', text: `🕸️ 成功黏住！对方在胶水中挣扎。` }]);
             setFighters(prev => {
               if (!prev) return prev;
               const n = { p: { ...prev.p }, n: { ...prev.n } };
               const target = isP ? n.n : n.p;
               target.status = { ...target.status, sticky: 3 };
               return n;
             });
          };
        } else if (weapon.id === 'w24') {
          onHitEffect = () => {
             setLogs(l => [...l, { attacker: '系统', text: `🤢 仙人掌之毒！对方感到一阵麻痹。` }]);
             setFighters(prev => {
               if (!prev) return prev;
               const n = { p: { ...prev.p }, n: { ...prev.n } };
               const target = isP ? n.n : n.p;
               target.status = { ...target.status, dots: [...target.status.dots, { id: 'cactus', dmg: 7, duration: 3 }] };
               return n;
             });
          };
        }

        setFighters(prev => {
          if (!prev) return prev;
          const next = { p: { ...prev.p }, n: { ...prev.n } };
          const f = isP ? next.p : next.n;
          f.weapons = f.weapons.filter(id => id !== weapon.id);
          return next;
        });
      }

      let isHit = selectedAction.id === 's15' ? Math.random() < 0.05 : (['s18', 's22', 'w23'].includes(selectedAction.id || '') ? true : Math.random() >= Math.min(0.35, (def.agi + (def.skills.includes('s13') ? 7 : 0)) / 100));
      currentActionResolved.current = { isHit, dmg: Math.max(0, dmg), onHit: onHitEffect };

      setLogs(l => [...l, { attacker: atk.name, text: actionDesc }]);
      if (!isHit) setTimeout(() => setLogs(l => [...l, { attacker: def.name, text: '巧妙地闪过了这一招！' }]), 500);

      const offsetSetter = isP ? setPOffset : setNOffset, atkSetter = isP ? setPVisual : setNVisual, defSetter = isP ? setNVisual : setPVisual, dir = isP ? 1 : -1;
      const resolveOffset = (type: string) => (type === 'MELEE') ? (isMobile ? config.combat.spacing.meleeDistanceMobile : config.combat.spacing.meleeDistancePC) * dir : 0;
      const moduleConfig = config.ATTACK_SEQUENCES[currentModule] || config.ATTACK_SEQUENCES.PUNCH;
      const totalLoops = moduleConfig.repeat || 1;

      for (let loop = 0; loop < totalLoops; loop++) {
        for (const step of moduleConfig.steps) {
          setMoveDuration(step.moveDuration);
          offsetSetter({ x: resolveOffset(step.offset), y: step.offsetY || 0 });
          atkSetter({ state: step.state as VisualState, frame: step.frame, weaponId: activeVisualId || atk.weaponSkin });
          if (step.playSfx) playSFX(usedSfx);
          
          if (step.projectile) {
            const containerWidth = 1000;
            const startX = isP ? containerWidth * 0.2 : containerWidth * 0.8;
            const targetX = isP ? containerWidth * 0.8 : containerWidth * 0.2;
            const isWaveAction = currentModule === 'WAVE';
            const projectileCount = isWaveAction ? 1 : 3; 
            for (let j = 0; j < projectileCount; j++) {
              setTimeout(() => {
                const pId = ++projectileCounter.current;
                setProjectiles(prev => [...prev, { id: pId, startX, targetX, weaponId: activeVisualId || atk.weaponSkin, isToLeft: !isP, isWave: isWaveAction }]);
                setTimeout(() => setProjectiles(prev => prev.filter(p => p.id !== pId)), 800);
              }, j * 120);
            }
          }

          if (step.calculateHit) {
            const res = currentActionResolved.current;
            if (res) {
              if (currentModule === 'THROW' || currentModule === 'WAVE') {
                setTimeout(() => {
                  if (res.isHit) {
                    applyDamage(res.dmg, isP, defSetter);
                    if (res.onHit) res.onHit();
                  } else applyMiss(!isP, defSetter);
                }, 500);
              } else {
                if (res.isHit) {
                  applyDamage(res.dmg, isP, defSetter);
                  if (res.onHit) res.onHit();
                } else applyMiss(!isP, defSetter);
              }
            }
          }
          await new Promise(r => setTimeout(r, step.delay));
        }
      }

      setMoveDuration(500);
      atkSetter({ state: 'IDLE', frame: 1, weaponId: atk.weaponSkin }); 
      offsetSetter({ x: 0, y: 0 }); 
      await new Promise(r => setTimeout(r, 500));
      currentActionResolved.current = null;
      if (!battleOver) setTurn(isP ? 'N' : 'P');
    }, 1200);
    return () => clearTimeout(combatTimer);
  }, [turn, battleOver, fighters]);

  const applyDamage = (dmg: number, isPAttacking: boolean, defSetter: any, customColor?: string) => {
    const dmgId = ++effectCounter.current;
    setEffects(e => [...e, { id: dmgId, text: `-${dmg}`, isPlayer: !isPAttacking, color: customColor || (dmg > 0 ? '#ef4444' : '#94a3b8') }]);
    setTimeout(() => setEffects(e => e.filter(item => item.id !== dmgId)), 800);
    
    if (dmg > 0) {
      setFighters(prev => {
        if (!prev) return prev;
        const next = { p: { ...prev.p }, n: { ...prev.n } };
        const d = isPAttacking ? next.n : next.p;
        d.hp = Math.max(0, d.hp - dmg);
        if (d.hp <= 0) {
          setBattleOver(true);
          setTimeout(() => isPAttacking ? onWin(Math.floor(next.n.level * 25), Math.floor(next.n.level * 35)) : onLoss(20), 1000);
        }
        return next;
      });
    }

    setShaking(isPAttacking ? 'N' : 'P');
    defSetter((v: any) => ({ ...v, state: 'HURT', frame: 1 }));
    setTimeout(() => { setShaking(null); defSetter((v: any) => ({ ...v, state: 'IDLE', frame: 1 })); }, 600);
  };

  const applyMiss = (isDefPlayer: boolean, defSetter: any) => {
    const missId = ++effectCounter.current;
    setEffects(e => [...e, { id: missId, text: 'MISS', isPlayer: isDefPlayer, color: '#94a3b8' }]);
    setTimeout(() => setEffects(e => e.filter(item => item.id !== missId)), 800);
    defSetter((v: any) => ({ ...v, state: 'DODGE', frame: 1 }));
    setTimeout(() => defSetter((v: any) => ({ ...v, state: 'IDLE', frame: 1 })), 600);
  };

  if (!fighters) return null;

  return (
    <div className={`fixed inset-0 z-[200] bg-slate-950 flex flex-col h-screen overflow-hidden ${shaking === 'SCREEN' ? 'animate-heavyShake' : ''}`}>
      <div className="relative w-full flex-grow flex flex-col items-center justify-end bg-slate-900 overflow-hidden" ref={battleAreaRef}>
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="absolute top-4 inset-x-0 z-[250] pointer-events-none px-4">
          <CombatStatus fighter={fighters.p} side="left" uiScale={uiScale} label="YOU" />
          <CombatStatus fighter={fighters.n} side="right" uiScale={uiScale} label={specialMode === 'ELITE' ? 'ELITE' : 'ENEMY'} />
        </div>
        
        <div className="relative flex items-end justify-center" style={{ width: '1000px', height: '450px', transform: `scale(${uiScale})` }}>
          <div className="absolute inset-0 pointer-events-none z-40">
            {projectiles.map(p => {
              // 关键修正：WAVE 模组使用 _projectile.png 且应用不旋转的动画类
              const suffix = p.isWave ? '_projectile.png' : '_throw.png';
              const weaponImg = p.weaponId ? findAsset([`Images/${p.weaponId}${suffix}`, `Images/${p.weaponId}_throw.png` || '']) : null;
              
              return (
                <div key={p.id} className={`absolute ${p.isWave ? 'w-24 h-24' : config.combat.projectiles.sizePC} ${p.isWave ? 'animate-wave-projectile' : 'animate-projectile'}`}
                  style={{ bottom: config.combat.spacing.projectileBottomPC, left: `${p.startX}px`, '--tx': `${p.targetX - p.startX}px` } as any}>
                  {weaponImg ? (
                    <img src={weaponImg} className={`w-full h-full object-contain drop-shadow-xl ${p.isToLeft ? 'scale-x-[-1]' : ''} ${p.isWave ? 'animate-pulse' : ''}`} alt="" />
                  ) : (
                    <div className={`rounded-full shadow-lg ${p.isWave ? 'w-16 h-16 bg-blue-500/80 blur-sm' : 'w-6 h-6 bg-red-600'}`}></div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="w-full flex justify-between px-12 pb-16 relative">
            <div className="relative" style={{ transform: `translate(${pOffset.x}px, ${pOffset.y}px)`, transition: `transform ${moveDuration}ms ease-out` }}>
              <CharacterVisual name={fighters.p.name} state={pVisual.state} frame={pVisual.frame} weaponId={pVisual.weaponId} hasAfterimage={fighters.p.status.afterimage > 0} isDizzy={fighters.p.status.sticky > 0} />
              {effects.filter(e => e.isPlayer).map(e => (
                <div key={e.id} className="absolute -top-32 left-0 w-full animate-damage text-center font-black text-6xl drop-shadow-lg pointer-events-none" style={{ color: e.color }}>{e.text}</div>
              ))}
            </div>
            <div className="relative" style={{ transform: `translate(${nOffset.x}px, ${nOffset.y}px)`, transition: `transform ${moveDuration}ms ease-out` }}>
              <div style={{ transform: 'scaleX(-1)' }}>
                <CharacterVisual name={fighters.n.name} isNpc state={nVisual.state} frame={nVisual.frame} weaponId={nVisual.weaponId} hasAfterimage={fighters.n.status.afterimage > 0} isDizzy={fighters.n.status.sticky > 0} />
              </div>
              {effects.filter(e => !e.isPlayer).map(e => (
                <div key={e.id} className="absolute -top-32 left-0 w-full animate-damage text-center font-black text-6xl drop-shadow-lg pointer-events-none" style={{ color: e.color }}>{e.text}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <CombatLog logs={logs} logEndRef={logEndRef} isMobile={isMobile} />
      <style>{`
        /* 普通投掷动画 (带旋转) */
        @keyframes projectile-fly {
          0% { transform: translate(0, 0) scale(0.7) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(var(--tx), -30px) scale(1.1) rotate(1080deg); opacity: 1; }
        }
        .animate-projectile { animation: projectile-fly 0.5s cubic-bezier(0.2, 0.8, 0.4, 1) forwards; }

        /* WAVE 发波专属动画 (不带旋转，仅缩放位移) */
        @keyframes wave-projectile-fly {
          0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(var(--tx), 0px) scale(1.2); opacity: 1; }
        }
        .animate-wave-projectile { animation: wave-projectile-fly 0.6s cubic-bezier(0.1, 0.9, 0.2, 1) forwards; }

        @keyframes damagePop { 0% { opacity:0; transform:translateY(20px) scale(0.6); } 15% { opacity:1; transform:translateY(-60px) scale(1.2); } 80% { opacity:1; transform:translateY(-100px) scale(1); } 100% { opacity:0; transform:translateY(-140px) scale(0.8); } }
        .animate-damage { animation: damagePop 0.8s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards; }
        @keyframes heavyShake { 0%, 100% { transform: translate(0, 0); } 10%, 30%, 50%, 70%, 90% { transform: translate(-5px, -5px); } 20%, 40%, 60%, 80% { transform: translate(5px, 5px); } }
        .animate-heavyShake { animation: heavyShake 0.3s ease-out; }
      `}</style>
    </div>
  );
};

// 辅助函数，在 Combat.tsx 中复用 preloader 逻辑
function findAsset(paths: string[]): string | null {
  if (!window.assetMap) return null;
  for (const path of paths) {
    if (window.assetMap.has(path)) {
      return window.assetMap.get(path)!;
    }
  }
  return null;
}

export default Combat;
