
import React, { useState, useEffect, useRef } from 'react';
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
  asset?: string;
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
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    
    const timer = setInterval(() => {
      setVisual(v => {
        if (v.state === 'IDLE' || v.state === 'RUN' || v.state === 'HOME') {
           return { ...v, frame: v.frame + 1 };
        }
        return v;
      });
    }, 125);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(timer);
    };
  }, []);

  const findProjectileAsset = (id?: string, type?: 'WEAPON' | 'SKILL') => {
    if (!id || !window.assetMap) return null;
    let paths: string[] = [];
    if (type === 'SKILL') {
      paths = [`Images/${id}_projectile.png`, `Images/${id}_projectile1.png` ];
    } else {
      paths = [`Images/${id}_throw.png`, `Images/${id}_throw1.png`, `Images/${id}_atk1.png` ];
    }
    for (const p of paths) { if (window.assetMap.has(p)) return window.assetMap.get(p); }
    return null;
  };

  const runAction = async (module: AttackModule, customSfx?: string, customVisualId?: string, type: 'WEAPON' | 'SKILL' = 'WEAPON') => {
    if (isAnimating) return;
    setIsAnimating(true);
    const visualId = customVisualId || selectedWeaponId;
    const actionSfx = customSfx || WEAPONS.find(w => w.id === selectedWeaponId)?.sfx || 'slash';
    
    const resolveOffset = (type: string) => {
      const containerWidth = mainContainerRef.current?.offsetWidth || 1000;
      if (type === 'MELEE') return (containerWidth * config.combat.spacing.meleeDistancePct / 100);
      if (type === 'BASE') return (containerWidth * config.combat.spacing.baseActionOffsetPct / 100);
      return 0;
    };

    const moduleConfig = config.ATTACK_SEQUENCES[module] || config.ATTACK_SEQUENCES.SLASH;
    const totalLoops = moduleConfig.repeat || 1;

    for (let loop = 0; loop < totalLoops; loop++) {
      for (const step of moduleConfig.steps) {
        setMoveDuration(step.moveDuration);
        setOffset({ x: resolveOffset(step.offset), y: step.offsetY || 0 });
        setVisual({ state: step.state as VisualState, frame: step.frame, weaponId: visualId });
        if (step.playSfx) playSFX(actionSfx);

        if (step.projectile) {
          const mainRect = mainContainerRef.current?.getBoundingClientRect();
          const charRect = charContainerRef.current?.getBoundingClientRect();
          if (mainRect && charRect) {
            const startX = (charRect.left - mainRect.left + charRect.width / 2);
            const containerWidth = mainContainerRef.current?.offsetWidth || 1000;
            const targetX = startX + (containerWidth * config.combat.spacing.meleeDistancePct / 100) * 1.5;
            const asset = findProjectileAsset(visualId, type);
            
            for (let j = 0; j < 3; j++) {
              setTimeout(() => {
                const pId = ++projectileCounter.current;
                setProjectiles(prev => [...prev, { id: pId, startX, targetX, asset }]);
                setTimeout(() => setProjectiles(prev => prev.filter(p => p.id !== pId)), 800);
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
    setMoveDuration(500);
    setVisual(v => ({...v, state: 'IDLE', frame: 1, weaponId: selectedWeaponId }));
    setOffset({ x: 0, y: 0 });
    await new Promise(r => setTimeout(r, 500));
    setIsAnimating(false);
  };

  const getDressingName = (part: 'HEAD' | 'BODY' | 'WEAPON') => DRESSINGS.find(d => d.id === player.dressing[part])?.name;
  const testableSkills = SKILLS.filter(s => s.module && (s.category === SkillCategory.ACTIVE || s.category === SkillCategory.SPECIAL));

  const sidePadding = isMobile ? config.combat.spacing.sidePaddingPctMobile : config.combat.spacing.sidePaddingPctPC;

  return (
    <div ref={mainContainerRef} className={`bg-slate-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[88vh] transition-all duration-500 border border-slate-200 ${shaking ? 'animate-heavyShake' : ''}`}>
      <div className="p-8 border-b flex justify-between items-center bg-indigo-700 text-white shadow-xl z-10">
        <div><div className="flex items-center gap-3"><h2 className="text-2xl font-black italic tracking-tighter uppercase">Mega Pro Arena</h2><span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full font-bold">V2.10 LAB</span></div><p className="text-[11px] opacity-70 uppercase font-black tracking-[0.3em] mt-1">Full Animation & Skill Laboratory</p></div>
        <button onClick={onBack} className="bg-white text-indigo-700 hover:bg-slate-100 px-8 py-3 rounded-2xl font-black text-sm transition-all active:scale-90 shadow-lg border-b-4 border-indigo-900/20">退出演武</button>
      </div>
      <div className="flex-grow flex flex-col md:flex-row overflow-hidden bg-slate-100 relative">
        <div 
          className="flex-grow relative bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:40px_40px] flex items-center justify-start overflow-hidden min-h-[450px]"
          style={{ paddingLeft: `${sidePadding + 10}%` }} // 给实验室多加点偏移显得居中
        >
          <div className="absolute inset-0 z-50 pointer-events-none">
             {projectiles.map((p) => (
               <div 
                 key={p.id}
                 className={`absolute w-20 h-20 md:w-24 md:h-24 flex items-center justify-center animate-projectile-pro`}
                 style={{ 
                    bottom: isMobile ? config.combat.spacing.testProjectileBottomMobile : config.combat.spacing.testProjectileBottomPC, 
                    left: `${p.startX}px`, 
                    '--tx': `${p.targetX - p.startX}px` 
                 } as any}
               >
                 {p.asset ? <img src={p.asset} className="w-full h-full object-contain drop-shadow-xl" alt="projectile" /> : <div className="w-8 h-8 bg-orange-500 rounded-full shadow-lg" />}
               </div>
             ))}
          </div>
          <div ref={charContainerRef} className="relative z-10 transition-transform pointer-events-none" style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transition: isAnimating ? `transform ${moveDuration}ms cubic-bezier(0.2, 0.8, 0.2, 1.1)` : 'none' }}>
            <CharacterVisual name="演武测试员" state={visual.state} frame={visual.frame} weaponId={visual.weaponId} debug={isDebugMode} isMobile={isMobile} className="scale-[1.2] md:scale-[1.35]" accessory={{ head: getDressingName('HEAD'), body: getDressingName('BODY'), weapon: getDressingName('WEAPON') }} />
          </div>
        </div>
        
        <div className="w-full md:w-[480px] bg-white border-l border-slate-200 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-20 overflow-hidden">
          <div className="flex-grow overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 custom-scrollbar">
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-4">武器模组库</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {WEAPONS.map(w => (
                  <button key={w.id} onClick={() => { playUISound('CLICK'); setSelectedWeaponId(w.id); runAction(w.module, undefined, undefined, 'WEAPON'); }} disabled={isAnimating} className={`px-3 py-2 text-[10px] font-bold rounded-xl border transition-all ${selectedWeaponId === w.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                    <span className="truncate w-full text-center">{w.name}</span>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-4">江湖绝学库</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {testableSkills.map(s => (
                  <button key={s.id} onClick={() => { playUISound('CLICK'); runAction(s.module!, s.sfx, s.id, 'SKILL'); }} disabled={isAnimating} className="px-3 py-2 text-[10px] font-bold rounded-xl border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                    <span className="truncate w-full text-center">{s.name}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes projectile-fly-pro {
          0% { transform: translate(0, 0) scale(0.7) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(var(--tx), -40px) scale(1.1) rotate(1080deg); opacity: 1; }
        }
        .animate-projectile-pro { animation: projectile-fly-pro 0.7s cubic-bezier(0.2, 0.8, 0.4, 1) forwards; }
        @keyframes heavyShake { 0%, 100% { transform: translate(0, 0); } 10%, 30%, 50%, 70%, 90% { transform: translate(-6px, -6px); } 20%, 40%, 60%, 80% { transform: translate(6px, 6px); } }
        .animate-heavyShake { animation: heavyShake 0.4s ease-out; }
      `}} />
    </div>
  );
};

export default TestPanel;
