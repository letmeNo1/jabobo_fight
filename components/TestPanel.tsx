
import React, { useState, useEffect, useRef } from 'react';
// Corrected import to include VisualState from '../types'
import { CharacterData, Weapon, AttackModule, WeaponType, Skill, SkillCategory, VisualState } from '../types';
import { DRESSINGS, WEAPONS, SKILLS } from '../constants';
import CharacterVisual from './CharacterVisual';
import { playSFX, playUISound } from '../utils/audio';
import config from '../config';

interface TestPanelProps {
  player: CharacterData;
  isDebugMode?: boolean;
  onBack: () => void;
}

interface Projectile {
  id: number;
  startX: number;
  targetX: number;
  weaponId?: string;
}

const TestPanel: React.FC<TestPanelProps> = ({ player, isDebugMode = false, onBack }) => {
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>(player.dressing.WEAPON || 'w1');
  const [visual, setVisual] = useState<{ state: VisualState; frame: number; weaponId?: string }>({ 
    state: 'IDLE', 
    frame: 1, 
    weaponId: selectedWeaponId 
  });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [moveDuration, setMoveDuration] = useState(300);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  
  const projectileCounter = useRef(0);
  const charContainerRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    
    const timer = setInterval(() => {
      setVisual(v => (v.state === 'IDLE' || v.state === 'RUN' || v.state === 'HOME') ? { ...v, frame: v.frame + 1 } : v);
    }, 125);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!isAnimating) {
      setVisual(v => ({ ...v, weaponId: selectedWeaponId }));
    }
  }, [selectedWeaponId, isAnimating]);

  const runAction = async (module: AttackModule, customSfx?: string, customVisualId?: string) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    const visualId = customVisualId || selectedWeaponId;
    const actionSfx = customSfx || WEAPONS.find(w => w.id === selectedWeaponId)?.sfx || 'slash';
    
    const resolveOffset = (type: string) => {
      const meleeDistance = isMobile ? config.combat.spacing.meleeDistanceMobile : config.combat.spacing.meleeDistancePC;
      const baseActionOffset = isMobile ? config.combat.spacing.baseActionOffsetMobile : config.combat.spacing.baseActionOffsetPC;
      if (type === 'MELEE') return meleeDistance * 0.4;
      if (type === 'BASE') return baseActionOffset;
      return 0;
    };

    const moduleConfig = config.ATTACK_SEQUENCES[module] || config.ATTACK_SEQUENCES.SLASH;
    const totalLoops = moduleConfig.repeat || 1;

    for (let loop = 0; loop < totalLoops; loop++) {
      for (const step of moduleConfig.steps) {
        setMoveDuration(step.moveDuration);
        setOffset({ x: resolveOffset(step.offset), y: step.offsetY || 0 });
        setVisual({ state: step.state as VisualState, frame: step.frame, weaponId: visualId });

        if (step.playSfx) {
          playSFX(actionSfx);
        }

        if (step.projectile) {
          const mainRect = mainContainerRef.current?.getBoundingClientRect();
          const charRect = charContainerRef.current?.getBoundingClientRect();
          if (mainRect && charRect) {
            const startX = (charRect.left - mainRect.left + charRect.width / 2);
            const targetX = startX + (isMobile ? 300 : 400);
            
            const projectileCount = 3;
            for (let j = 0; j < projectileCount; j++) {
              setTimeout(() => {
                const pId = ++projectileCounter.current;
                setProjectiles(prev => [...prev, { id: pId, startX, targetX, weaponId: visualId }]);
                setTimeout(() => setProjectiles(prev => prev.filter(p => p.id !== pId)), 1000);
              }, j * 120);
            }
          }
        }

        if (step.shaking) {
          setShaking(true);
          setTimeout(() => setShaking(false), 500);
        }

        await new Promise(r => setTimeout(r, step.delay));
      }
    }

    await new Promise(r => setTimeout(r, 100));
    setMoveDuration(500);
    setVisual(v => ({...v, state: 'IDLE', frame: 1, weaponId: selectedWeaponId }));
    setOffset({ x: 0, y: 0 });
    await new Promise(r => setTimeout(r, 500));
    setIsAnimating(false);
  };

  const testFeedback = (type: 'HURT' | 'DODGE') => {
    if (isAnimating) return;
    setIsAnimating(true);
    playSFX(type === 'HURT' ? 'hurt' : 'swing_light');
    setVisual({ state: type, frame: 1, weaponId: selectedWeaponId });
    setTimeout(() => {
      setVisual(v => ({...v, state: 'IDLE', frame: 1}));
      setIsAnimating(false);
    }, 600);
  };

  const getDressingName = (part: 'HEAD' | 'BODY' | 'WEAPON') => {
    return DRESSINGS.find(d => d.id === player.dressing[part])?.name;
  };

  const activeSkills = SKILLS.filter(s => s.category === SkillCategory.ACTIVE || s.category === SkillCategory.SPECIAL);

  return (
    <div ref={mainContainerRef} className={`bg-slate-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[88vh] transition-all duration-500 border border-slate-200 ${shaking ? 'animate-heavyShake' : ''}`}>
      <div className="p-8 border-b flex justify-between items-center bg-indigo-700 text-white shadow-xl z-10">
        <div><div className="flex items-center gap-3"><h2 className="text-2xl font-black italic tracking-tighter uppercase">Mega Pro Arena</h2><span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full font-bold">V2.8 LAB</span></div><p className="text-[11px] opacity-70 uppercase font-black tracking-[0.3em] mt-1">Full Animation & Skill Laboratory</p></div>
        <button onClick={onBack} className="bg-white text-indigo-700 hover:bg-slate-100 px-8 py-3 rounded-2xl font-black text-sm transition-all active:scale-90 shadow-lg border-b-4 border-indigo-900/20">退出演武</button>
      </div>
      <div className="flex-grow flex flex-col md:flex-row overflow-hidden bg-slate-100 relative">
        <div className="flex-grow relative bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:40px_40px] flex items-center justify-start pl-[15%] md:pl-[20%] overflow-hidden min-h-[450px]">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-100 to-transparent pointer-events-none z-10"></div>
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-100 to-transparent pointer-events-none z-10"></div>
          <div className="absolute inset-0 z-50 pointer-events-none">
             {projectiles.map((p) => {
               const weaponImg = p.weaponId ? window.assetMap?.get(`Images/${p.weaponId}_throw.png`) : null;
               return (
                 <div 
                   key={p.id}
                   className={`absolute ${config.combat.projectiles.sizeMobile} ${config.combat.projectiles.sizePC} flex items-center justify-center animate-projectile`}
                   style={{
                     bottom: config.combat.spacing.testProjectileBottomPC,
                     left: `${p.startX}px`,
                     '--tx': `${p.targetX - p.startX}px`
                   } as any}
                 >
                   {weaponImg ? (
                     <img src={weaponImg} data-name="test-projectile" className="w-full h-full object-contain drop-shadow-xl" alt="projectile" />
                   ) : (
                     <div className="w-6 h-6 bg-red-600 rounded-full shadow-[0_0_20px_#ef4444]">
                       <div className="w-full h-full bg-white/30 rounded-full"></div>
                     </div>
                   )}
                 </div>
               );
             })}
          </div>
          <div className="absolute top-8 left-8 flex flex-col md:flex-row gap-2 md:gap-6 z-20">
            <div className="bg-white/95 backdrop-blur-xl px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-indigo-100 shadow-2xl ring-1 ring-black/5"><span className="text-[9px] md:text-[11px] text-indigo-500 font-black block uppercase mb-0.5 md:mb-1 tracking-widest">State</span><span className="font-mono font-black text-slate-800 text-lg md:text-2xl">{visual.state}</span></div>
            <div className="bg-white/95 backdrop-blur-xl px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-indigo-100 shadow-2xl ring-1 ring-black/5"><span className="text-[9px] md:text-[11px] text-indigo-500 font-black block uppercase mb-0.5 md:mb-1 tracking-widest">Visual ID</span><span className="font-mono font-black text-slate-800 text-lg md:text-2xl">{visual.weaponId}</span></div>
          </div>
          <div ref={charContainerRef} className="relative z-10 transition-transform pointer-events-none" style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transition: isAnimating ? `transform ${moveDuration}ms cubic-bezier(0.2, 0.8, 0.2, 1.1)` : 'none' }}>
            <div className={['CLEAVE', 'PUNCH'].includes(visual.state) ? 'animate-vibrate' : ''}>
              <CharacterVisual 
                name="演武测试员"
                state={visual.state} 
                frame={visual.frame} 
                weaponId={visual.weaponId}
                debug={isDebugMode}
                isMobile={isMobile}
                className="scale-[1.2] md:scale-[1.35]" 
                accessory={{ head: getDressingName('HEAD'), body: getDressingName('BODY'), weapon: getDressingName('WEAPON') }} 
              />
            </div>
          </div>
          <div className="absolute bottom-[35%] w-48 md:w-64 h-3 bg-indigo-600/10 rounded-full blur-2xl transition-all duration-300" style={{ left: `calc(20% + ${offset.x}px)`, transform: `translateX(48px) scaleX(${isAnimating ? 1.5 : 1})`, opacity: visual.state === 'JUMP' ? 0.15 : 0.7 }}></div>
        </div>
        
        <div className="w-full md:w-[480px] bg-white border-l border-slate-200 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-20 overflow-hidden">
          <div className="flex-grow overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 custom-scrollbar">
            {/* 武器库测试 */}
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-4">武器模组库</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {WEAPONS.map(w => (
                  <button 
                    key={w.id} 
                    onClick={() => {
                      playUISound('CLICK');
                      setSelectedWeaponId(w.id);
                      runAction(w.module);
                    }}
                    disabled={isAnimating}
                    className={`px-3 py-2 text-[10px] font-bold rounded-xl border transition-all flex flex-col items-center ${selectedWeaponId === w.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300 disabled:opacity-50'}`}
                  >
                    <span className="truncate w-full text-center">{w.name}</span>
                    <span className="text-[8px] opacity-60">[{w.module}]</span>
                  </button>
                ))}
              </div>
            </section>

            {/* 技能特效测试 */}
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-4">主动技能特效</h3>
              <div className="grid grid-cols-2 gap-2">
                {activeSkills.map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => {
                      playUISound('CLICK');
                      if (s.module) runAction(s.module, s.sfx || 'skill_cast', s.id);
                    }}
                    disabled={isAnimating || !s.module}
                    className={`px-4 py-3 text-[10px] font-black rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all shadow-sm active:scale-95 disabled:opacity-40 flex flex-col items-start`}
                  >
                    <span>✨ {s.name}</span>
                    <span className="text-[8px] opacity-60 font-mono">{s.module || 'PASSIVE'}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* 反馈测试 */}
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-4">反馈与特殊状态</h3>
              <div className="grid grid-cols-2 gap-3 pb-8">
                <button 
                  onClick={() => testFeedback('DODGE')} 
                  disabled={isAnimating}
                  className="bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-40"
                >
                  测试闪避 DODGE
                </button>
                <button 
                  onClick={() => testFeedback('HURT')} 
                  disabled={isAnimating}
                  className="bg-rose-600 text-white py-4 rounded-2xl font-black shadow-lg transition-all hover:bg-rose-700 active:scale-95 disabled:opacity-40"
                >
                  测试受击 HURT
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes vibrate { 0% { transform: translate(0,0); } 10% { transform: translate(-2px, -2px); } 20% { transform: translate(2px, -2px); } 30% { transform: translate(-2px, 2px); } 40% { transform: translate(2px, 2px); } 50% { transform: translate(-2px, -2px); } 60% { transform: translate(2px, -2px); } 70% { transform: translate(-2px, 2px); } 80% { transform: translate(2px, 2px); } 90% { transform: translate(-2px, -2px); } 100% { transform: translate(0,0); } }
        .animate-vibrate { animation: vibrate 0.1s linear infinite; }
        @keyframes projectile-fly {
          0% { transform: translate(0, 0) scale(0.7) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(var(--tx), -30px) scale(1.1) rotate(1080deg); opacity: 1; }
        }
        .animate-projectile {
          animation: projectile-fly 0.5s cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
        }
        @keyframes heavyShake { 0%, 100% { transform: translate(0, 0); } 10%, 30%, 50%, 70%, 90% { transform: translate(-6px, -6px); } 20%, 40%, 60%, 80% { transform: translate(6px, 6px); } }
        .animate-heavyShake { animation: heavyShake 0.4s ease-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}} />
    </div>
  );
};

export default TestPanel;
