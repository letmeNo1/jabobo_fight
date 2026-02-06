
import React, { useState, useEffect, useRef } from 'react';
import { BattleRecord, BattleTurn, VisualState, BattleLog } from '../types';
import { WEAPONS, SKILLS } from '../constants';
import CharacterVisual from './CharacterVisual';
import CombatStatus from './CombatStatus';
import CombatLog from './CombatLog';
import { playSFX } from '../utils/audio';
import config from '../config';

interface CombatProps {
  record: BattleRecord;
  onFinish: () => void;
  isReplay?: boolean;
}

const Combat: React.FC<CombatProps> = ({ record, onFinish, isReplay = false }) => {
  const [currentTurnIdx, setCurrentTurnIdx] = useState(-1);
  const [logs, setLogs] = useState<BattleLog[]>([]);
  
  // 双方状态实时映射
  const [pStats, setPStats] = useState({ ...record.player, status: { disarmed: 0, sticky: 0, afterimage: 0, dots: [] as any[] } });
  const [nStats, setNStats] = useState({ ...record.opponent, status: { disarmed: 0, sticky: 0, afterimage: 0, dots: [] as any[] } });
  
  const [pVisual, setPVisual] = useState<{ state: VisualState; frame: number; weaponId?: string }>({ state: 'IDLE', frame: 1, weaponId: record.player.dressing.WEAPON });
  const [nVisual, setNVisual] = useState<{ state: VisualState; frame: number; weaponId?: string }>({ state: 'IDLE', frame: 1, weaponId: record.opponent.dressing.WEAPON });
  
  const [pOffset, setPOffset] = useState({ x: 0, y: 0 });
  const [nOffset, setNOffset] = useState({ x: 0, y: 0 });
  const [moveDuration, setMoveDuration] = useState(400);
  const [shaking, setShaking] = useState<'P' | 'N' | 'SCREEN' | null>(null);
  const [effects, setEffects] = useState<any[]>([]);
  const [projectiles, setProjectiles] = useState<any[]>([]);

  const logEndRef = useRef<HTMLDivElement>(null);

  // 初始化战斗
  useEffect(() => {
    setLogs([{ attacker: '系统', text: '战斗开始！' }]);
    setTimeout(() => setCurrentTurnIdx(0), 1000);
  }, []);

  // 帧动画
  useEffect(() => {
    const timer = setInterval(() => {
      setPVisual(v => ({ ...v, frame: v.frame + 1 }));
      setNVisual(v => ({ ...v, frame: v.frame + 1 }));
    }, 125);
    return () => clearInterval(timer);
  }, []);

  // 处理回合回放
  useEffect(() => {
    if (currentTurnIdx < 0 || currentTurnIdx >= record.turns.length) {
      if (currentTurnIdx >= record.turns.length) {
        setTimeout(onFinish, 1500);
      }
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

      // 1. 回合开始，衰减当前攻击方的状态计数器（同步模拟引擎逻辑）
      statsSetter(prev => ({
        ...prev,
        status: {
          ...prev.status,
          disarmed: Math.max(0, prev.status.disarmed - 1),
          sticky: Math.max(0, prev.status.sticky - 1),
          afterimage: Math.max(0, prev.status.afterimage - 1)
        }
      }));

      // 更新文本日志
      setLogs(prev => [...prev, ...turn.logs]);

      // 解析动作模组
      let module: any = 'PUNCH';
      let weaponId = undefined;
      let sfx = 'punch';

      if (turn.actionType === 'SKILL') {
        const s = SKILLS.find(sk => sk.id === turn.actionId);
        module = s?.module || 'PUNCH';
        sfx = s?.sfx || 'skill_cast';
        weaponId = s?.id;
      } else if (turn.actionType === 'WEAPON') {
        const w = WEAPONS.find(we => we.id === turn.actionId);
        module = w?.module || 'SLASH';
        sfx = w?.sfx || 'slash';
        weaponId = w?.id;
        
        // 从状态栏移除已使用武器
        statsSetter(prev => ({ ...prev, weapons: prev.weapons.filter(id => id !== turn.actionId) }));
      }

      const seq = config.ATTACK_SEQUENCES[module] || config.ATTACK_SEQUENCES.PUNCH;
      
      for (const step of seq.steps) {
        setMoveDuration(step.moveDuration);
        const distance = step.offset === 'MELEE' ? 500 : (step.offset === 'BASE' ? 80 : 0);
        offsetSetter({ x: distance * dir, y: step.offsetY || 0 });
        atkSetter({ state: step.state as VisualState, frame: step.frame, weaponId: weaponId || (isP ? record.player.dressing.WEAPON : record.opponent.dressing.WEAPON) });
        
        if (step.playSfx) playSFX(sfx);
        if (step.calculateHit) {
          if (turn.isHit) {
            applyImpact(turn.damage, isP, defSetter);
            
            // 2. 应用命中后的状态变化
            oppStatsSetter(s => ({ 
              ...s, 
              hp: Math.max(0, s.hp - turn.damage),
              status: {
                ...s.status,
                sticky: turn.statusChanges.sticky !== undefined ? turn.statusChanges.sticky : s.status.sticky,
                disarmed: turn.statusChanges.disarmed !== undefined ? turn.statusChanges.disarmed : s.status.disarmed
              }
            }));

            // 如果攻击者获得了残影（或其他给自己加的状态）
            if (turn.statusChanges.afterimage !== undefined) {
              statsSetter(s => ({
                ...s,
                status: { ...s.status, afterimage: turn.statusChanges.afterimage || 0 }
              }));
            }
          } else {
            applyMiss(!isP, defSetter);
          }
        }
        await new Promise(r => setTimeout(r, step.delay));
      }

      // 复位
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
    setEffects(prev => [...prev, { id, text: `-${dmg}`, isPlayer: !isPAtk, color: '#ef4444' }]);
    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 800);
    setShaking(isPAtk ? 'N' : 'P');
    defSetter((v: any) => ({ ...v, state: 'HURT', frame: 1 }));
    setTimeout(() => { setShaking(null); defSetter((v: any) => ({ ...v, state: 'IDLE', frame: 1 })); }, 400);
  };

  const applyMiss = (isPDef: boolean, defSetter: any) => {
    const id = Date.now();
    setEffects(prev => [...prev, { id, text: 'MISS', isPlayer: isPDef, color: '#94a3b8' }]);
    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 800);
    defSetter((v: any) => ({ ...v, state: 'DODGE', frame: 1 }));
    setTimeout(() => defSetter((v: any) => ({ ...v, state: 'IDLE', frame: 1 })), 400);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col h-screen overflow-hidden">
      <div className="relative w-full flex-grow flex flex-col items-center justify-end bg-slate-900 overflow-hidden">
        <div className="absolute top-4 inset-x-0 z-[250] pointer-events-none px-4">
          {isReplay && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-4 py-1 rounded-full text-xs font-black animate-pulse shadow-lg z-50">REPLAY MODE</div>
          )}
          <CombatStatus fighter={pStats as any} side="left" uiScale={1} label="PLAYER" />
          <CombatStatus fighter={nStats as any} side="right" uiScale={1} label="OPPONENT" />
        </div>
        
        <div className="relative flex items-end justify-center w-full h-[450px]">
          <div className="w-full flex justify-between px-24 pb-16 relative">
            <div style={{ transform: `translate(${pOffset.x}px, ${pOffset.y}px)`, transition: `transform ${moveDuration}ms ease-out` }}>
              <CharacterVisual 
                name={pStats.name} 
                state={pVisual.state} 
                frame={pVisual.frame} 
                weaponId={pVisual.weaponId} 
                hasAfterimage={pStats.status.afterimage > 0} 
              />
              {effects.filter(e => e.isPlayer).map(e => <div key={e.id} className="absolute -top-32 left-0 w-full animate-damage text-6xl font-black text-center" style={{ color: e.color }}>{e.text}</div>)}
            </div>
            <div style={{ transform: `translate(${nOffset.x}px, ${nOffset.y}px)`, transition: `transform ${moveDuration}ms ease-out` }}>
              <div className="scale-x-[-1]">
                <CharacterVisual 
                  name={nStats.name} 
                  isNpc 
                  state={nVisual.state} 
                  frame={nVisual.frame} 
                  weaponId={nVisual.weaponId} 
                  hasAfterimage={nStats.status.afterimage > 0}
                />
              </div>
              {effects.filter(e => !e.isPlayer).map(e => <div key={e.id} className="absolute -top-32 left-0 w-full animate-damage text-6xl font-black text-center" style={{ color: e.color }}>{e.text}</div>)}
            </div>
          </div>
        </div>
      </div>
      <CombatLog logs={logs} logEndRef={logEndRef} isMobile={false} />
    </div>
  );
};

export default Combat;
