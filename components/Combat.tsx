import React, { useState, useEffect, useRef } from 'react';
import { BattleRecord, BattleTurn, VisualState, BattleLog, WeaponType } from '../types';
import { WEAPONS, SKILLS } from '../constants';
import { DEFAULT_ATTACK_MODULE, DEFAULT_SFX, DEFAULT_HIT_SFX } from '../constants/combat';
import CharacterVisual from './CharacterVisual';
import CombatStatus from './CombatStatus';
import CombatLog from './CombatLog';
import { playSFX } from '../utils/audio';
import { findProjectileAsset, parseAttackOffset, playHitSFX, generateProjectiles, applyImpact, applyMiss } from '../utils/fight';
import config from '../config';
import '../styles/combat-animations.css'; // 引入公共样式

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
  
  // 修复点1：全局计算 isMobile，并监听窗口大小变化
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // 核心：读取离地高度配置 + 新增的角色初始间距可选配置
  const groundHeightPct = isMobile 
    ? config.combat.spacing.groundHeightPctMobile 
    : config.combat.spacing.groundHeightPctPC;
  // 可选配置：玩家左侧偏移（控制初始位置）
  const playerLeftOffsetPct = isMobile
    ? config.combat.spacing.playerLeftOffsetPctMobile
    : config.combat.spacing.playerLeftOffsetPctPC;
  // 可选配置：NPC右侧偏移（控制初始位置，避免重合）
  const npcRightOffsetPct = isMobile
    ? config.combat.spacing.npcRightOffsetPctMobile
    : config.combat.spacing.npcRightOffsetPctPC;
  
  const projectileCounter = useRef(0);
  const pRef = useRef<HTMLDivElement>(null);
  const nRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // 修复点2：监听窗口大小变化，实时更新 isMobile + 配置值
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      // --- 新增：处理 DOT 动画展示 ---
      // 从 logs 中查找当前回合是否有“持续伤害”字样
      const dotLog = turn.logs.find(l => l.attacker === '系统' && l.text.includes('持续伤害'));
      // --- 在 Combat.tsx 的 playTurn 函数内找到 DOT 处理部分 ---

      if (dotLog) {
        const dmgMatch = dotLog.text.match(/-(\d+)/);
        if (dmgMatch) {
          const dotDmg = parseInt(dmgMatch[1]);
          
          // 1. 播放紫色伤害数字 (保持你的逻辑)
          setProjectiles(prev => [...prev, {
              id: `dot-${Date.now()}-${projectileCounter.current++}`,
              type: 'TEXT', text: `-${dotDmg}`, color: '#a855f7',
              isPlayer: isP, side: turn.side
          }]);

          // 2. 核心修复：更新血量的同时，更新 status
          statsSetter(prev => {
            // 计算剩余持续时间并过滤
            const nextDots = prev.status.dots
              .map(d => ({ ...d, duration: d.duration - 1 }))
              .filter(d => d.duration > 0);

            return {
              ...prev,
              hp: Math.max(0, prev.hp - dotDmg), // 这里必须扣血，血条才会动！
              status: {
                ...prev.status,
                dots: nextDots // 更新后的 dots 传给 CombatStatus 渲染
              }
            };
          });

          playSFX(DEFAULT_HIT_SFX.blunt);
          await new Promise(r => setTimeout(r, 600));
        }
      }
      // --- DOT 处理结束 ---

      // 如果 DOT 导致角色死亡，直接跳过攻击逻辑
      const currentFighter = isP ? pStats : nStats; // 注意这里要拿最新的值判断
      if (currentFighter.hp <= 0 && currentTurnIdx < record.turns.length) {
          // 略过攻击，直接进入下一回合或结束
          await new Promise(r => setTimeout(r, 500));
          setCurrentTurnIdx(prev => prev + 1);
          return;
      }

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

      let module: any = DEFAULT_ATTACK_MODULE;
      let visualId = undefined;
      let sfx = DEFAULT_SFX.punch;
      let hitSfx = DEFAULT_HIT_SFX.blunt;
      let isWeaponUsed = false;

      if (turn.actionType === 'SKILL') {
        const s = SKILLS.find(sk => sk.id === turn.actionId);
        module = s?.module || DEFAULT_ATTACK_MODULE;
        sfx = s?.sfx || DEFAULT_SFX.skillCast;
        hitSfx = s?.hitSfx || DEFAULT_HIT_SFX.heavy;
        visualId = s?.id;
      } else if (turn.actionType === 'WEAPON') {
        const w = WEAPONS.find(we => we.id === turn.actionId);
        module = w?.module || 'SLASH';
        sfx = w?.sfx || DEFAULT_SFX.slash;
        hitSfx = w?.hitSfx || DEFAULT_HIT_SFX.blunt;
        visualId = w?.id;
        isWeaponUsed = true;
      }

      const seq = config.ATTACK_SEQUENCES[module] || config.ATTACK_SEQUENCES.PUNCH;
      const totalLoops = seq.repeat || 1;

      for (let loop = 0; loop < totalLoops; loop++) {
        for (const step of seq.steps) {
          // 这里用全局的 isMobile，无需重复计算
          const containerWidth = containerRef.current?.offsetWidth || 1000;
          const containerHeight = containerRef.current?.offsetHeight || 450;
          
          setMoveDuration(step.moveDuration);
          // 调用公共偏移解析函数
          let dx = parseAttackOffset(step.offset, containerWidth, isMobile);
          // 应用方向系数
          dx *= dir;
          
          const dy = (containerHeight * (step.offsetY || 0)) / 100;
          console.log(`[Combat] 最终偏移量: dx=${dx}, dy=${dy}, 方向系数=${dir}, 实际X偏移=${dx}`);
          
          offsetSetter({ x: dx, y: dy });
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

              // 调用公共投射物生成函数
              generateProjectiles(
                projectileCounter,
                setProjectiles,
                startX,
                targetX,
                asset,
                turn.side,
                'WEAPON'
              );
            }
          }

          if (step.calculateHit) {
            const hitDelay = module === 'THROW' ? 450 : 0;
            setTimeout(() => {
              if (turn.isHit) {
                // 调用公共音效播放函数
                playHitSFX(hitSfx, module);
                
                // 调用公共伤害应用函数
                applyImpact(turn.damage, !isP, setProjectiles, defSetter);
                
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
                // 调用公共闪避应用函数
                applyMiss(!isP, setProjectiles, defSetter);
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
  }, [currentTurnIdx, isMobile]); // 依赖添加 isMobile

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
                  bottom: isMobile ? config.combat.spacing.projectileBottomMobile : config.combat.spacing.projectileBottomPC,
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
        
        {/* 修复点3：角色父容器 - 移除justify-between，保留内边距配置 */}
        <div className="relative flex items-end justify-center w-full h-[450px]">
          <div 
            className="w-full relative h-full" 
            style={{ 
              paddingLeft: `${isMobile ? config.combat.spacing.sidePaddingPctMobile : config.combat.spacing.sidePaddingPctPC}%`, 
              paddingRight: `${isMobile ? config.combat.spacing.sidePaddingPctMobile : config.combat.spacing.sidePaddingPctPC}%`,
              height: '100%'
            }}
          >
            {/* 核心：玩家角色 - 用可选配置定位左侧，避免重合 */}
            <div 
              ref={pRef} 
              style={{ 
                transform: `translate(${pOffset.x}px, ${pOffset.y}px)`, 
                transition: `transform ${moveDuration}ms ease-out`,
                bottom: `${groundHeightPct}%`, // 离地高度配置
                position: 'absolute', 
                left: `${playerLeftOffsetPct}%`, // 可选配置：玩家左侧偏移（核心！避免重合）
                zIndex: 10 // 确保层级正确
              }}
            >
              <CharacterVisual 
                name={pStats.name} 
                state={pVisual.state} 
                frame={pVisual.frame} 
                weaponId={pVisual.weaponId} 
                hasAfterimage={pStats.status.afterimage > 0}
                isMobile={isMobile}
                debug={false}
              />
            </div>

            {/* 核心：NPC角色 - 用可选配置定位右侧，避免重合 */}
            <div 
              ref={nRef} 
              style={{ 
                transform: `translate(${nOffset.x}px, ${nOffset.y}px)`, 
                transition: `transform ${moveDuration}ms ease-out`,
                bottom: `${groundHeightPct}%`, // 离地高度配置
                position: 'absolute', 
                right: `${npcRightOffsetPct}%`, // 可选配置：NPC右侧偏移（核心！避免重合）
                zIndex: 10 // 确保层级正确
              }}
            >
              <div className="scale-x-[-1]">
                <CharacterVisual 
                  name={nStats.name} 
                  isNpc 
                  state={nVisual.state} 
                  frame={nVisual.frame} 
                  weaponId={nVisual.weaponId} 
                  hasAfterimage={nStats.status.afterimage > 0}
                  isMobile={isMobile}
                  debug={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 修复点5：CombatLog 的 isMobile 传全局值 */}
      <CombatLog logs={logs} logEndRef={logEndRef} isMobile={isMobile} />
    </div>
  );
};

export default Combat;