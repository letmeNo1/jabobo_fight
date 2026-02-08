
import React, { useState, useEffect, useRef } from 'react';
import { BattleRecord, BattleTurn, VisualState, BattleLog, WeaponType } from '../types';
import { WEAPONS, SKILLS } from '../constants';
import CharacterVisual from './CharacterVisual';
import CombatStatus from './CombatStatus';
import CombatLog from './CombatLog';
import { playSFX } from '../utils/audio';
import config from '../config';

interface CombatProps {
  record: BattleRecord;
  onFinish: (record: BattleRecord) => void;
  isReplay?: boolean;
}

const Combat: React.FC<CombatProps> = ({ record, onFinish, isReplay = false }) => {
  const [currentTurnIdx, setCurrentTurnIdx] = useState(-1);
  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [shaking, setShaking] = useState(false);
  
  const [pStats, setPStats] = useState({ ...record.player, status: { disarmed: 0, sticky: 0, afterimage: 0, dots: [] as any[] } });
  const [nStats, setNStats] = useState({ ...record.opponent, status: { disarmed: 0, sticky: 0, afterimage: 0, dots: [] as any[] } });
  
  const [pVisual, setPVisual] = useState<{ state: VisualState; frame: number; weaponId?: string }>({ state: 'IDLE', frame: 1, weaponId: record.player.dressing.WEAPON });
  const [nVisual, setNVisual] = useState<{ state: VisualState; frame: number; weaponId?: string }>({ state: 'IDLE', frame: 1, weaponId: record.opponent.dressing.WEAPON });
  
  const [pOffset, setPOffset] = useState({ x: 0, y: 0 });
  const [nOffset, setNOffset] = useState({ x: 0, y: 0 });
  const [moveDuration, setMoveDuration] = useState(400);
  const [projectiles, setProjectiles] = useState<any[]>([]);
  
  const projectileCounter = useRef(0);
  const pRef = useRef<HTMLDivElement>(null);
  const nRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const findProjectileAsset = (id?: string, type?: 'WEAPON' | 'SKILL' | 'PUNCH') => {
    if (!id || !window.assetMap) return null;
    let paths: string[] = [];
    if (type === 'SKILL') {
      paths = [`Images/${id}_throw.png`, `Images/${id}_projectile.png`, `Images/${id}_projectile1.png` ];
    } else {
      paths = [`Images/${id}_throw.png`, `Images/${id}_projectile.png`, `Images/${id}_throw1.png`, `Images/${id}_atk1.png` ];
    }
    for (const p of paths) { 
      if (window.assetMap.has(p)) return window.assetMap.get(p); 
    }
    return null;
  };

  useEffect(() => {
    setLogs([{ attacker: '系统', text: '战斗开始！' }]);
    setTimeout(() => setCurrentTurnIdx(0), 1000);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setPVisual(v => {
        if (v.state === 'IDLE' || v.state === 'RUN' || v.state === 'HOME') {
          return { ...v, frame: v.frame + 1 };
        }
        return v;
      });
      setNVisual(v => {
        if (v.state === 'IDLE' || v.state === 'RUN' || v.state === 'HOME') {
          return { ...v, frame: v.frame + 1 };
        }
        return v;
      });
    }, 125);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentTurnIdx < 0) return;
    
    if (currentTurnIdx >= record.turns.length) {
      setTimeout(() => onFinish(record), 1500);
      return;
    }

    const playTurn = async () => {
      const turn = record.turns[currentTurnIdx];
      const isP = turn.side === 'P';
      const atkSetter = isP ? setPVisual : setNVisual;
      const defSetter = isP ? setNVisual : setPVisual;
      const offsetSetter = isP ? setPOffset : setNOffset;
      const statsSetter = isP ? setPStats : setNStats;
      const oppStatsSetter = isP ? setNStats : setPStats;
      const dir = isP ? 1 : -1;

      statsSetter(prev => ({
        ...prev,
        status: {
          ...prev.status,
          disarmed: Math.max(0, prev.status.disarmed - 1),
          sticky: Math.max(0, prev.status.sticky - 1),
          afterimage: Math.max(0, prev.status.afterimage - 1)
        }
      }));

      setLogs(prev => [...prev, ...turn.logs]);

      let module: any = 'PUNCH';
      let visualId = undefined;
      let sfx = 'punch';
      let hitSfx = 'blunt_hit'; // 默认为钝击音效
      let isWeaponUsed = false;

      if (turn.actionType === 'SKILL') {
        const s = SKILLS.find(sk => sk.id === turn.actionId);
        module = s?.module || 'PUNCH';
        sfx = s?.sfx || 'skill_cast';
        hitSfx = s?.hitSfx || 'heavy_hit';
        visualId = s?.id;
      } else if (turn.actionType === 'WEAPON') {
        const w = WEAPONS.find(we => we.id === turn.actionId);
        module = w?.module || 'SLASH';
        sfx = w?.sfx || 'slash';
        hitSfx = w?.hitSfx || 'blunt_hit';
        visualId = w?.id;
        isWeaponUsed = true;
      }

      const seq = config.ATTACK_SEQUENCES[module] || config.ATTACK_SEQUENCES.PUNCH;
      const totalLoops = seq.repeat || 1;

      for (let loop = 0; loop < totalLoops; loop++) {
        for (const step of seq.steps) {
          const isMobile = window.innerWidth < 768;
          const containerWidth = containerRef.current?.offsetWidth || 1000;
          const containerHeight = containerRef.current?.offsetHeight || 450;
          
          setMoveDuration(step.moveDuration);
          
          let dx = 0;
          if (step.offset === 'MELEE') {
            const pct = isMobile ? config.combat.spacing.meleeDistancePctMobile : config.combat.spacing.meleeDistancePctPC;
            dx = (containerWidth * pct) / 100;
          } else if (step.offset === 'BASE') {
            const pct = isMobile ? config.combat.spacing.baseActionOffsetPctMobile : config.combat.spacing.baseActionOffsetPctPC;
            dx = (containerWidth * pct) / 100;
          }

          const dy = (containerHeight * (step.offsetY || 0)) / 100;
          
          offsetSetter({ x: dx * dir, y: dy });
          atkSetter({ 
            state: step.state as VisualState, 
            frame: step.frame, 
            weaponId: visualId || (isP ? record.player.dressing.WEAPON : record.opponent.dressing.WEAPON) 
          });
          
          if (step.playSfx) playSFX(sfx);

          if (step.shaking === 'SCREEN') {
            setShaking(true);
            setTimeout(() => setShaking(false), 400);
          }

          if (step.projectile) {
            const mainRect = containerRef.current?.getBoundingClientRect();
            const attackerRef = isP ? pRef : nRef;
            const defenderRef = isP ? nRef : pRef;
            const aRect = attackerRef.current?.getBoundingClientRect();
            const dRect = defenderRef.current?.getBoundingClientRect();
            
            if (mainRect && aRect && dRect) {
              const startX = aRect.left - mainRect.left + aRect.width / 2;
              const targetX = dRect.left - mainRect.left + dRect.width / 2;
              const asset = findProjectileAsset(visualId, turn.actionType);

              for(let j=0; j<3; j++) {
                setTimeout(() => {
                  const pId = ++projectileCounter.current;
                  setProjectiles(prev => [...prev, { id: pId, startX, targetX, asset, side: turn.side, type: 'WEAPON' }]);
                  setTimeout(() => setProjectiles(prev => prev.filter(p => p.id !== pId)), 800);
                }, j * 120);
              }
            }
          }

          if (step.calculateHit) {
            const hitDelay = module === 'THROW' ? 450 : 0;
            setTimeout(() => {
              if (turn.isHit) {
                if (hitSfx) playSFX(hitSfx);
                applyImpact(turn.damage, isP, defSetter);
                oppStatsSetter(s => ({ 
                  ...s, 
                  hp: Math.max(0, s.hp - turn.damage),
                  status: {
                    ...s.status,
                    sticky: turn.statusChanges.sticky !== undefined ? turn.statusChanges.sticky : s.status.sticky,
                    disarmed: turn.statusChanges.disarmed !== undefined ? turn.statusChanges.disarmed : s.status.disarmed
                  }
                }));
                if (turn.statusChanges.afterimage !== undefined) {
                  statsSetter(s => ({ ...s, status: { ...s.status, afterimage: turn.statusChanges.afterimage || 0 } }));
                }
              } else {
                applyMiss(!isP, defSetter);
              }
            }, hitDelay);
          }
          await new Promise(r => setTimeout(r, step.delay));
        }
      }

      if (isWeaponUsed && turn.actionId) {
        statsSetter(prev => ({ ...prev, weapons: prev.weapons.filter(id => id !== turn.actionId) }));
      }

      setMoveDuration(500);
      offsetSetter({ x: 0, y: 0 });
      atkSetter({ state: 'IDLE', frame: 1 });
      await new Promise(r => setTimeout(r, 600));
      setCurrentTurnIdx(prev => prev + 1);
    };

    playTurn();
  }, [currentTurnIdx]);

  const applyImpact = (dmg: number, isPAtk: boolean, defSetter: any) => {
    const id = Date.now();
    setProjectiles(prev => [...prev, { id: `dmg-${id}`, text: `-${dmg}`, isPlayer: !isPAtk, color: '#ef4444', type: 'TEXT' }]);
    setTimeout(() => setProjectiles(prev => prev.filter(e => e.id !== `dmg-${id}`)), 800);
    defSetter((v: any) => ({ ...v, state: 'HURT', frame: 1 }));
    setTimeout(() => defSetter((v: any) => ({ ...v, state: 'IDLE', frame: 1 })), 400);
  };

  const applyMiss = (isPDef: boolean, defSetter: any) => {
    const id = Date.now();
    setProjectiles(prev => [...prev, { id: `miss-${id}`, text: 'MISS', isPlayer: isPDef, color: '#94a3b8', type: 'TEXT' }]);
    setTimeout(() => setProjectiles(prev => prev.filter(e => e.id !== `miss-${id}`)), 800);
    defSetter((v: any) => ({ ...v, state: 'DODGE', frame: 1 }));
    setTimeout(() => defSetter((v: any) => ({ ...v, state: 'IDLE', frame: 1 })), 400);
  };

  const isMobile = window.innerWidth < 768;
  const sidePadding = isMobile ? config.combat.spacing.sidePaddingPctMobile : config.combat.spacing.sidePaddingPctPC;

  return (
    <div className={`fixed inset-0 z-[200] bg-slate-950 flex flex-col h-screen overflow-hidden ${shaking ? 'animate-heavyShake' : ''}`}>
      <div ref={containerRef} className="relative w-full flex-grow flex flex-col items-center justify-end bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 z-[220] pointer-events-none">
          {projectiles.map(p => {
            if (p.type === 'TEXT') {
              return (
                <div key={p.id} className="absolute animate-damage text-6xl font-black text-center w-40" style={{ left: p.isPlayer ? '20%' : '70%', top: '40%', color: p.color }}>
                  {p.text}
                </div>
              );
            }
            return (
              <div 
                key={p.id} 
                className="absolute w-20 h-20 md:w-24 md:h-24 flex items-center justify-center animate-projectile-pro"
                style={{
                  left: `${p.startX}px`,
                  bottom: window.innerWidth < 768 ? config.combat.spacing.projectileBottomMobile : config.combat.spacing.projectileBottomPC,
                  '--tx': `${p.targetX - p.startX}px`
                } as any}
              >
                {p.asset ? (
                  <img src={p.asset} className={`w-full h-full object-contain ${p.side === 'N' ? 'scale-x-[-1]' : ''}`} alt="projectile" />
                ) : (
                  <div className="w-8 h-8 bg-orange-500 rounded-full shadow-lg" />
                )}
              </div>
            );
          })}
        </div>

        <div className="absolute top-4 inset-x-0 z-[250] pointer-events-none px-4">
          <CombatStatus fighter={pStats as any} side="left" uiScale={1} label="PLAYER" />
          <CombatStatus fighter={nStats as any} side="right" uiScale={1} label="OPPONENT" />
        </div>
        
        <div className="relative flex items-end justify-center w-full h-[450px]">
          <div 
            className="w-full flex justify-between pb-16 relative"
            style={{ paddingLeft: `${sidePadding}%`, paddingRight: `${sidePadding}%` }}
          >
            <div ref={pRef} style={{ transform: `translate(${pOffset.x}px, ${pOffset.y}px)`, transition: `transform ${moveDuration}ms ease-out` }}>
              <CharacterVisual name={pStats.name} state={pVisual.state} frame={pVisual.frame} weaponId={pVisual.weaponId} hasAfterimage={pStats.status.afterimage > 0} />
            </div>
            <div ref={nRef} style={{ transform: `translate(${nOffset.x}px, ${nOffset.y}px)`, transition: `transform ${moveDuration}ms ease-out` }}>
              <div className="scale-x-[-1]">
                <CharacterVisual name={nStats.name} isNpc state={nVisual.state} frame={nVisual.frame} weaponId={nVisual.weaponId} hasAfterimage={nStats.status.afterimage > 0} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <CombatLog logs={logs} logEndRef={logEndRef} isMobile={false} />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes projectile-fly-pro {
          0% { transform: translate(0, 0) scale(0.7) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(var(--tx), -40px) scale(1.1) rotate(1080deg); opacity: 1; }
        }
        .animate-projectile-pro { animation: projectile-fly-pro 0.7s cubic-bezier(0.2, 0.8, 0.4, 1) forwards; }
        @keyframes heavyShake { 0%, 100% { transform: translate(0, 0); } 10%, 30%, 50%, 70%, 90% { transform: translate(-6px, -6px); } 20%, 40%, 60%, 80% { transform: translate(6px, 6px); } }
        .animate-heavyShake { animation: heavyShake 0.4s ease-out; }
        @keyframes damage { 0% { opacity:0; transform: translateY(20px) scale(0.5); } 20% { opacity:1; transform: translateY(0) scale(1.2); } 100% { opacity:0; transform: translateY(-100px) scale(1); } }
        .animate-damage { animation: damage 0.8s ease-out forwards; }
      `}} />
    </div>
  );
};

export default Combat;
